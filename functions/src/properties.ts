import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { upsertPropertiesForPage } from "./propertyIngestShared";

export const rapidApiKeySecret = defineSecret("RAPIDAPI_KEY");

const rapidApiHost = "realty-us.p.rapidapi.com";
const rapidApiBaseUrl = "https://realty-us.p.rapidapi.com/properties/search-buy";
const rapidApiTimeoutMs = 25000;
const rapidApiBaseBackoffMs = 800;
const rapidApiMaxBackoffMs = 12000;
const rapidApiMaxRetries = 2;
const propertyIngestLockDocPath = "systemLocks/propertyIngest";
const propertyIngestLeaseMs = 3 * 60 * 60 * 1000;
const propertyIngestQueueCollection = "propertyIngestRequests";
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

const rapidApiZipCodes = [
	"30102","30103","30114","30115","30120","30121","30123","30137","30139","30141","30142","30143","30188","30189",
	"30501","30503","30504","30506","30510","30512","30513","30514","30516","30517","30518","30519","30520","30522",
	"30523","30527","30528","30533","30534","30535","30540","30541","30542","30543","30547","30548","30554","30558",
	"30560","30567","30577","30580","30701","30703","30705","30707","30710","30720","30721","30724","30725","30726",
	"30728","30732","30734","30736","30738","30739","30740","30741","30742","30750","30752","30755","30757"
];

type PropertyDetailsResponse = Record<string, unknown>;

type IngestRunOptions = {
	maxPagesPerBatch?: number;
	maxBatches?: number;
	dryRun?: boolean;
	persistTelemetry?: boolean;
	runLabel?: string;
};

type IngestLeaseResult = {
	acquired: boolean;
	reason?: string;
	currentRunId?: string;
	expiresAtMs?: number;
};

// ===== Generic Utilities =====

function chunkArray<T>(array: T[], size: number) {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

function getPropertiesArray(data: any): any[] {
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.properties)) return data.properties;
	if (data?.results && Array.isArray(data.results)) return data.results;
	if (data?.data?.results && Array.isArray(data.data.results)) return data.data.results;
	if (data?.home_search?.results && Array.isArray(data.home_search.results)) return data.home_search.results;
	if (data?.data?.home_search?.results && Array.isArray(data.data.home_search.results)) return data.data.home_search.results;
	return [];
}

function getApiReportedTotal(data: any): number | null {
	const candidates = [
		data?.total,
		data?.count,
		data?.data?.total,
		data?.data?.count,
		data?.home_search?.total,
		data?.home_search?.count,
		data?.data?.home_search?.total,
		data?.data?.home_search?.count,
		data?.meta?.total,
		data?.meta?.count,
	];

	for (const value of candidates) {
		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}
		if (typeof value === "string") {
			const parsed = Number(value);
			if (Number.isFinite(parsed)) {
				return parsed;
			}
		}
	}

	return null;
}

function buildSearchUrl(batchZips: string[], offset: number, limit: number): string {
	const locationParam = `zip: ${batchZips.join(",")}`;
	const params = new URLSearchParams({
		location: locationParam,
		offset: String(offset),
		limit: String(limit),
	});
	return `${rapidApiBaseUrl}?${params.toString()}`;
}

function getRapidApiErrorMessage(errorText: string): string {
	try {
		const parsed = JSON.parse(errorText);
		const primary = parsed?.errors?.[0];
		return (
			primary?.extensions?.data?.message ||
			primary?.extensions?.message ||
			primary?.message ||
			parsed?.message ||
			errorText
		).toString();
	} catch {
		return errorText;
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response: Response): number | null {
	const retryAfter = response.headers.get("retry-after");
	if (!retryAfter) return null;
	const numeric = Number(retryAfter);
	if (Number.isFinite(numeric) && numeric >= 0) {
		return numeric * 1000;
	}
	const parsedDate = Date.parse(retryAfter);
	if (!Number.isNaN(parsedDate)) {
		const delta = parsedDate - Date.now();
		return delta > 0 ? delta : 0;
	}
	return null;
}

function computeBackoffMs(attemptNumber: number): number {
	const exponential = Math.min(
		rapidApiBaseBackoffMs * Math.pow(2, attemptNumber),
		rapidApiMaxBackoffMs,
	);
	const jitter = Math.floor(Math.random() * 400);
	return exponential + jitter;
}

function parseAnalyticsDateToMs(value: any): number | null {
	if (!value) return null;
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	if (value instanceof Date) {
		const parsed = value.getTime();
		return Number.isFinite(parsed) ? parsed : null;
	}
	if (typeof value?.toDate === "function") {
		try {
			const parsed = value.toDate().getTime();
			return Number.isFinite(parsed) ? parsed : null;
		} catch {
			return null;
		}
	}
	if (typeof value?.seconds === "number") {
		return value.seconds * 1000;
	}
	return null;
}

function getAnalyticsDaysListed(property: Record<string, any>, nowMs: number): number | null {
	const listDateMs =
		parseAnalyticsDateToMs(property?.list_date) ??
		parseAnalyticsDateToMs(property?.listDate) ??
		parseAnalyticsDateToMs(property?.apiFirstSeenDate);

	if (!listDateMs || listDateMs > nowMs) return null;
	const days = Math.floor((nowMs - listDateMs) / (1000 * 60 * 60 * 24));
	return Number.isFinite(days) && days >= 0 ? days : null;
}

function getAnalyticsPrice(property: Record<string, any>): number | null {
	const candidates = [
		property?.list_price,
		property?.price,
		property?.price?.list_price,
		property?.price?.value,
	];

	for (const candidate of candidates) {
		const numeric = Number(candidate);
		if (Number.isFinite(numeric) && numeric > 0) return numeric;
	}

	return null;
}

function getAnalyticsPropertyAge(property: Record<string, any>, currentYear: number): number | null {
	const ageCandidate = Number(property?.property_age ?? property?.description?.property_age ?? Number.NaN);
	if (Number.isFinite(ageCandidate) && ageCandidate >= 0) return ageCandidate;

	const yearBuiltCandidate = Number(property?.year_built ?? property?.description?.year_built ?? Number.NaN);
	if (Number.isFinite(yearBuiltCandidate) && yearBuiltCandidate > 0 && yearBuiltCandidate <= currentYear) {
		return currentYear - yearBuiltCandidate;
	}

	return null;
}

function getAnalyticsZip(property: Record<string, any>): string | null {
	const rawZip =
		property?.location?.address?.postal_code ??
		property?.postal_code ??
		property?.address?.postal_code ??
		null;

	if (!rawZip) return null;
	const normalized = String(rawZip).trim();
	const match = normalized.match(/\d{5}/);
	return match ? match[0] : normalized || null;
}

export const getAdminPropertyAnalytics = onCall({
	timeoutSeconds: 300,
	memory: "1GiB",
}, async (request) => {
	try {
		const uid = request.auth?.uid;
		if (!uid) {
			throw new HttpsError("unauthenticated", "Authentication is required.");
		}

		const db = getFirestore();
		const userSnap = await db.collection("users").doc(uid).get();
		const role = String(userSnap.data()?.role || "").trim();
		if (role !== "Admin") {
			throw new HttpsError("permission-denied", "Admin access is required.");
		}

		// Read only the fields needed for analytics to reduce payload and processing overhead.
		const propertiesQuery = db.collection("properties").select(
			"list_date",
			"listDate",
			"apiFirstSeenDate",
			"list_price",
			"price",
			"property_age",
			"year_built",
			"description.property_age",
			"description.year_built",
			"location.address.postal_code",
			"postal_code",
			"address.postal_code",
		);
		const snapshot = await propertiesQuery.get();
		const nowMs = Date.now();
		const currentYear = new Date().getFullYear();

		const priceBuckets = [
		{ label: "Under $250k", min: 0, max: 250000, count: 0, daysTotal: 0, stale90: 0 },
		{ label: "$250k - $500k", min: 250000, max: 500000, count: 0, daysTotal: 0, stale90: 0 },
		{ label: "$500k - $750k", min: 500000, max: 750000, count: 0, daysTotal: 0, stale90: 0 },
		{ label: "$750k - $1M", min: 750000, max: 1000000, count: 0, daysTotal: 0, stale90: 0 },
		{ label: "Over $1M", min: 1000000, max: null as number | null, count: 0, daysTotal: 0, stale90: 0 },
		];

		const ageBuckets = [
		{ label: "0-5 yrs", count: 0 },
		{ label: "6-15 yrs", count: 0 },
		{ label: "16-30 yrs", count: 0 },
		{ label: "31-50 yrs", count: 0 },
		{ label: "51-75 yrs", count: 0 },
		{ label: "76+ yrs", count: 0 },
		];

		const zipMap = new Map<string, { count: number; daysTotal: number; daysCount: number; priceTotal: number; priceCount: number }>();

		let withDaysListed = 0;
		let stale30 = 0;
		let stale60 = 0;
		let stale90 = 0;

		snapshot.forEach((doc) => {
		const property = doc.data() as Record<string, any>;
		const daysListed = getAnalyticsDaysListed(property, nowMs);
		const price = getAnalyticsPrice(property);
		const age = getAnalyticsPropertyAge(property, currentYear);
		const zip = getAnalyticsZip(property);

		if (daysListed !== null) {
			withDaysListed += 1;
			if (daysListed >= 30) stale30 += 1;
			if (daysListed >= 60) stale60 += 1;
			if (daysListed >= 90) stale90 += 1;
		}

		if (daysListed !== null && price !== null) {
			const bucket = priceBuckets.find((b) => price >= b.min && (b.max === null || price < b.max));
			if (bucket) {
				bucket.count += 1;
				bucket.daysTotal += daysListed;
				if (daysListed >= 90) bucket.stale90 += 1;
			}
		}

		if (age !== null) {
			if (age <= 5) ageBuckets[0].count += 1;
			else if (age <= 15) ageBuckets[1].count += 1;
			else if (age <= 30) ageBuckets[2].count += 1;
			else if (age <= 50) ageBuckets[3].count += 1;
			else if (age <= 75) ageBuckets[4].count += 1;
			else ageBuckets[5].count += 1;
		}

		if (zip) {
			const existing = zipMap.get(zip) ?? { count: 0, daysTotal: 0, daysCount: 0, priceTotal: 0, priceCount: 0 };
			existing.count += 1;
			if (daysListed !== null) {
				existing.daysTotal += daysListed;
				existing.daysCount += 1;
			}
			if (price !== null) {
				existing.priceTotal += price;
				existing.priceCount += 1;
			}
			zipMap.set(zip, existing);
		}
		});

		const topZips = Array.from(zipMap.entries())
		.map(([zip, stats]) => ({
			zip,
			count: stats.count,
			avgDays: stats.daysCount > 0 ? Math.round(stats.daysTotal / stats.daysCount) : 0,
			avgPrice: stats.priceCount > 0 ? Math.round(stats.priceTotal / stats.priceCount) : 0,
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

		return {
		totalProperties: snapshot.size,
		withDaysListed,
		stale30,
		stale60,
		stale90,
		priceDaysBuckets: priceBuckets.map((bucket) => ({
			label: bucket.label,
			min: bucket.min,
			max: bucket.max,
			count: bucket.count,
			avgDays: bucket.count > 0 ? Math.round(bucket.daysTotal / bucket.count) : 0,
			stale90: bucket.stale90,
		})),
		ageDistribution: ageBuckets,
		topZips,
 		};
	} catch (error) {
		if (error instanceof HttpsError) {
			throw error;
		}
		console.error("getAdminPropertyAnalytics failed:", error);
		throw new HttpsError("internal", "Failed to compute admin property analytics.");
	}
});

// ===== Property Details =====

async function fetchPropertyDetails(propertyId: string): Promise<PropertyDetailsResponse> {
	const url = `https://realty-us.p.rapidapi.com/properties/detail?propertyId=${propertyId}`;
	const rapidApiKey = rapidApiKeySecret.value();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), rapidApiTimeoutMs);
	let lastError: Error | null = null;
	try {
		const response = await fetch(url, {
			headers: {
				"X-RapidAPI-Key": rapidApiKey,
				"X-RapidAPI-Host": rapidApiHost,
			},
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`No property details received: ${response.status} ${errorText}`);
		}
		const propertyDetails = (await response.json()) as PropertyDetailsResponse;

		const db = getFirestore();
		await db.collection("propertyDetails").doc(propertyId).set(propertyDetails, { merge: true });

		return propertyDetails;
	} catch (error: any) {
		clearTimeout(timeout);
		lastError = error instanceof Error ? error : new Error(String(error));
		throw lastError;
	}
}

export const getPropertyDetails = onCall({
	secrets: [rapidApiKeySecret],
}, async (request) => {
	const propertyId = String(request.data?.propertyIdStr || request.data?.propertyId || "").trim();

	if (!propertyId) {
		throw new Error("Missing required propertyId");
	}

	const details = await fetchPropertyDetails(propertyId);
	return details;
});

export const getPropertyDetailsHttp = onRequest({
	secrets: [rapidApiKeySecret],
}, async (req, res) => {
	// CORS preflight
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
	if (req.method === "OPTIONS") {
		res.status(204).send("");
		return;
	}

	// Verify Firebase ID token from Authorization header
	const authHeader = req.headers.authorization ?? "";
	const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
	if (!idToken) {
		res.status(401).json({ error: "Missing Authorization header" });
		return;
	}

	try {
		await getAuth().verifyIdToken(idToken);
	} catch {
		res.status(401).json({ error: "Invalid or expired token" });
		return;
	}

	const body = req.body ?? {};
	const propertyId = String(body.propertyIdStr || body.propertyId || "").trim();

	if (!propertyId) {
		res.status(400).json({ error: "Missing required propertyId" });
		return;
	}

	const details = await fetchPropertyDetails(propertyId);
	res.status(200).json(details);
});

// ===== RapidAPI Fetch with Retry =====

async function fetchRapidApiWithRetry(url: string, rapidApiKey: string) {
	let attempts = 0;
	let lastError: Error | null = null;

	while (attempts <= rapidApiMaxRetries) {
		const attemptNumber = attempts;
		attempts += 1;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), rapidApiTimeoutMs);

		try {
			const response = await fetch(url, {
				headers: {
					"X-RapidAPI-Key": rapidApiKey,
					"X-RapidAPI-Host": rapidApiHost,
				},
				signal: controller.signal,
			});
			clearTimeout(timeout);

			if (response.ok) {
				return { response, attempts };
			}

			const shouldRetry = retryableStatuses.has(response.status) && attemptNumber < rapidApiMaxRetries;
			if (!shouldRetry) {
				return { response, attempts };
			}

			const retryAfterMs = getRetryAfterMs(response);
			const backoffMs = retryAfterMs ?? computeBackoffMs(attemptNumber);
			console.warn(`RapidAPI retry scheduled: status=${response.status}, attempt=${attemptNumber + 1}, waitMs=${backoffMs}`);
			await sleep(backoffMs);
		} catch (error: any) {
			clearTimeout(timeout);
			lastError = error instanceof Error ? error : new Error(String(error));
			const shouldRetry = attemptNumber < rapidApiMaxRetries;
			if (!shouldRetry) {
				throw lastError;
			}

			const backoffMs = computeBackoffMs(attemptNumber);
			console.warn(`RapidAPI retry scheduled: network error on attempt=${attemptNumber + 1}, waitMs=${backoffMs}, message=${lastError.message}`);
			await sleep(backoffMs);
		}
	}

	throw lastError || new Error("RapidAPI request failed after retries");
}

async function probeZipHealth(batchZips: string[], rapidApiKey: string) {
	const zipDiagnostics: {
		zip: string;
		status: "ok_with_results" | "ok_no_results" | "error";
		httpStatus?: number;
		propertyCount?: number;
		message?: string;
	}[] = [];

	for (const zip of batchZips) {
		const url = buildSearchUrl([zip], 0, 1);
		try {
			const response = await fetch(url, {
				headers: {
					"X-RapidAPI-Key": rapidApiKey,
					"X-RapidAPI-Host": rapidApiHost,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				zipDiagnostics.push({
					zip,
					status: "error",
					httpStatus: response.status,
					message: getRapidApiErrorMessage(errorText).slice(0, 240),
				});
				continue;
			}

			const data = await response.json();
			const properties = getPropertiesArray(data);
			if (properties.length > 0) {
				zipDiagnostics.push({
					zip,
					status: "ok_with_results",
					httpStatus: response.status,
					propertyCount: properties.length,
				});
			} else {
				zipDiagnostics.push({
					zip,
					status: "ok_no_results",
					httpStatus: response.status,
					propertyCount: 0,
				});
			}
		} catch (error) {
			zipDiagnostics.push({
				zip,
				status: "error",
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return zipDiagnostics;
}

// ===== Lease Locking =====

async function tryAcquirePropertyIngestLease(
	db: FirebaseFirestore.Firestore,
	runId: string,
	runLabel: string,
	leaseMs: number = propertyIngestLeaseMs,
): Promise<IngestLeaseResult> {
	const lockRef = db.doc(propertyIngestLockDocPath);
	let result: IngestLeaseResult = { acquired: false, reason: "unknown" };

	await db.runTransaction(async (tx) => {
		const snap = await tx.get(lockRef);
		const now = Date.now();
		const data = snap.exists ? snap.data() : undefined;
		const active = data?.active === true;
		const expiresAtMs = typeof data?.expiresAtMs === "number" ? data.expiresAtMs : 0;

		if (active && expiresAtMs > now) {
			result = {
				acquired: false,
				reason: "already_running",
				currentRunId: typeof data?.runId === "string" ? data.runId : undefined,
				expiresAtMs,
			};
			return;
		}

		tx.set(lockRef, {
			active: true,
			runId,
			runLabel,
			acquiredAt: new Date(now).toISOString(),
			acquiredAtMs: now,
			expiresAt: new Date(now + leaseMs).toISOString(),
			expiresAtMs: now + leaseMs,
			updatedAt: new Date(now).toISOString(),
			updatedAtMs: now,
		}, { merge: true });

		result = { acquired: true };
	});

	return result;
}

async function releasePropertyIngestLease(
	db: FirebaseFirestore.Firestore,
	runId: string,
	finalStatus: string,
	summary?: Record<string, unknown>,
) {
	const lockRef = db.doc(propertyIngestLockDocPath);
	await db.runTransaction(async (tx) => {
		const snap = await tx.get(lockRef);
		if (!snap.exists) {
			return;
		}

		const data = snap.data();
		if (data?.runId && data.runId !== runId) {
			return;
		}

		const now = Date.now();
		tx.set(lockRef, {
			active: false,
			runId,
			releasedAt: new Date(now).toISOString(),
			releasedAtMs: now,
			expiresAtMs: now,
			updatedAt: new Date(now).toISOString(),
			updatedAtMs: now,
			lastCompletedRunId: runId,
			lastCompletedStatus: finalStatus,
			lastCompletedSummary: summary || null,
		}, { merge: true });
	});
}

// ===== Ingest Engine =====

function parseIngestRequestParams(rawMaxPages: unknown, rawMaxBatches: unknown, rawDryRun: unknown) {
	const requestedMaxPages = Number(rawMaxPages ?? 10);
	const requestedMaxBatches = Number(rawMaxBatches ?? 2);
	const dryRunRaw = String(rawDryRun ?? "false").toLowerCase();
	const dryRun = dryRunRaw === "true" || dryRunRaw === "1";

	const maxPagesPerBatch = Number.isFinite(requestedMaxPages) && requestedMaxPages > 0
		? Math.min(requestedMaxPages, 50)
		: 10;
	const maxBatches = Number.isFinite(requestedMaxBatches) && requestedMaxBatches > 0
		? Math.min(requestedMaxBatches, chunkArray(rapidApiZipCodes, 10).length)
		: 2;

	return { maxPagesPerBatch, maxBatches, dryRun };
}

async function runPropertyIngest(
	db: FirebaseFirestore.Firestore,
	rapidApiKey: string,
	options: IngestRunOptions = {},
) {
	const startedAt = new Date().toISOString();
	const runId = new Date().toISOString();
	const pageSize = 20;
	const maxPagesPerBatch = options.maxPagesPerBatch ?? 50;
	const allBatches = chunkArray(rapidApiZipCodes, 10);
	const batches = typeof options.maxBatches === "number"
		? allBatches.slice(0, Math.max(0, options.maxBatches))
		: allBatches;
	const dryRun = options.dryRun === true;
	const persistTelemetry = options.persistTelemetry !== false;

	let requestsAttempted = 0;
	let outboundAttempts = 0;
	let retriesPerformed = 0;
	let failedBatches = 0;
	let failedPages = 0;
	let successfulPages = 0;
	let errorCount = 0;
	let totalUpserted = 0;
	let totalSkippedNoPropertyId = 0;
	let totalReceivedProperties = 0;
	let expectedPropertiesFromApiReported = 0;
	let expectedBatchesKnown = 0;
	let expectedBatchesUnknown = 0;
	const zipDiagnostics: {
		batchIndex: number;
		zip: string;
		status: "ok_with_results" | "ok_no_results" | "error";
		httpStatus?: number;
		propertyCount?: number;
		message?: string;
	}[] = [];

	const failedBatchDetails: {
		batchIndex: number;
		batchZips: string[];
		page: number;
		offset: number;
		status?: number;
		message: string;
	}[] = [];

	const batchSummaries: {
		batchIndex: number;
		batchZips: string[];
		pagesFetched: number;
		successfulPages: number;
		failedPages: number;
		receivedProperties: number;
		upserted: number;
		skippedNoPropertyId: number;
		apiReportedExpected: number | null;
		batchStatus: "completed" | "completed_with_errors";
	}[] = [];

	for (const [batchIndex, batch] of batches.entries()) {
		let activeBatch = [...batch];
		let batchStored = 0;
		let batchSkippedNoPropertyId = 0;
		let batchApiReportedTotal: number | null = null;
		let batchReceivedProperties = 0;
		let batchPagesFetched = 0;
		let batchFailedPages = 0;
		let batchStatus: "completed" | "completed_with_errors" = "completed";

		for (let page = 0; page < maxPagesPerBatch; page++) {
			const offset = page * pageSize;
			const url = buildSearchUrl(activeBatch, offset, pageSize);

			try {
				requestsAttempted += 1;
				const fetchResult = await fetchRapidApiWithRetry(url, rapidApiKey);
				const response = fetchResult.response;
				outboundAttempts += fetchResult.attempts;
				retriesPerformed += Math.max(0, fetchResult.attempts - 1);

				if (!response.ok) {
					if (response.status === 400 && activeBatch.length > 1) {
						const perZip = await probeZipHealth(activeBatch, rapidApiKey);
						zipDiagnostics.push(
							...perZip.map((diag) => ({
								batchIndex,
								...diag,
							})),
						);

						const erroredZips = perZip.filter((diag) => diag.status === "error").map((diag) => diag.zip);
						const retainedZips = activeBatch.filter((zip) => !erroredZips.includes(zip));

						if (retainedZips.length > 0 && retainedZips.length < activeBatch.length) {
							console.warn(
								`Batch ${batchIndex} had ${erroredZips.length} bad ZIP(s); retrying page ${page + 1} with ${retainedZips.length} ZIP(s). Bad zips: ${erroredZips.join(",")}`,
							);
							activeBatch = retainedZips;
							page -= 1;
							continue;
						}
					}

					failedPages += 1;
					batchFailedPages += 1;
					failedBatches += 1;
					errorCount += 1;
					batchStatus = "completed_with_errors";
					const errorText = await response.text();
					failedBatchDetails.push({
						batchIndex,
						batchZips: activeBatch,
						page: page + 1,
						offset,
						status: response.status,
						message: getRapidApiErrorMessage(errorText).slice(0, 500),
					});
					break;
				}

				const data = await response.json();
				const properties = getPropertiesArray(data);
				const apiReportedTotal = getApiReportedTotal(data);
				if (batchApiReportedTotal === null && apiReportedTotal !== null) {
					batchApiReportedTotal = apiReportedTotal;
				}

				if (properties.length === 0) {
					break;
				}

				successfulPages += 1;
				batchPagesFetched += 1;
				batchReceivedProperties += properties.length;
				totalReceivedProperties += properties.length;

				if (!dryRun) {
					const pullDate = new Date().toISOString();
					const result = await upsertPropertiesForPage(db, properties, pullDate, runId, "rapidapi");
					batchStored += result.upserted;
					batchSkippedNoPropertyId += result.skippedNoPropertyId;
				}

				const progressCount = dryRun ? batchReceivedProperties : batchStored;
				if (batchApiReportedTotal !== null && progressCount >= batchApiReportedTotal) {
					break;
				}
			} catch (error) {
				failedPages += 1;
				batchFailedPages += 1;
				failedBatches += 1;
				errorCount += 1;
				batchStatus = "completed_with_errors";
				failedBatchDetails.push({
					batchIndex,
					batchZips: activeBatch,
					page: page + 1,
					offset,
					message: error instanceof Error ? error.message : String(error),
				});
				break;
			}
		}

		if (batchApiReportedTotal === null) {
			expectedBatchesUnknown += 1;
		} else {
			expectedBatchesKnown += 1;
			expectedPropertiesFromApiReported += batchApiReportedTotal;
		}

		totalUpserted += batchStored;
		totalSkippedNoPropertyId += batchSkippedNoPropertyId;

		batchSummaries.push({
			batchIndex,
			batchZips: activeBatch,
			pagesFetched: batchPagesFetched,
			successfulPages: batchPagesFetched,
			failedPages: batchFailedPages,
			receivedProperties: batchReceivedProperties,
			upserted: batchStored,
			skippedNoPropertyId: batchSkippedNoPropertyId,
			apiReportedExpected: batchApiReportedTotal,
			batchStatus,
		});
	}

	const endedAt = new Date().toISOString();
	const status = errorCount > 0 ? "completed_with_errors" : "completed";

	const telemetryPayload = {
		runId,
		runLabel: options.runLabel || "scheduled",
		startedAt,
		endedAt,
		status,
		dryRun,
		totalBatches: batches.length,
		maxPagesPerBatch,
		requestsAttempted,
		outboundAttempts,
		retriesPerformed,
		successfulPages,
		failedPages,
		writes: totalUpserted,
		skippedNoPropertyId: totalSkippedNoPropertyId,
		receivedProperties: totalReceivedProperties,
		expectedPropertiesFromApiReported,
		expectedBatchesKnown,
		expectedBatchesUnknown,
		errors: errorCount,
		failedBatches,
		failedBatchDetails,
		zipDiagnostics,
		batchSummaries,
	};

	if (persistTelemetry) {
		await db.collection("apiPullRuns").doc(runId).set(telemetryPayload, { merge: true });
	}

	return telemetryPayload;
}

// ===== Public Triggers =====

export const enqueuePropertyIngestNow = onRequest(async (req, res) => {
	try {
		const db = getFirestore();
		const { maxPagesPerBatch, maxBatches, dryRun } = parseIngestRequestParams(
			req.query.maxPagesPerBatch,
			req.query.maxBatches,
			req.query.dryRun,
		);

		const requestId = `queued-${new Date().toISOString()}`;
		const requestRef = db.collection(propertyIngestQueueCollection).doc(requestId);
		await requestRef.set({
			requestId,
			status: "queued",
			createdAt: new Date().toISOString(),
			params: {
				maxPagesPerBatch,
				maxBatches,
				dryRun,
			},
		});

		res.status(202).json({
			ok: true,
			message: "Ingest request queued",
			requestId,
			status: "queued",
			queueDocPath: `${propertyIngestQueueCollection}/${requestId}`,
		});
		return;
	} catch (error: any) {
		console.error("enqueuePropertyIngestNow failed:", error);
		res.status(500).json({ ok: false, message: error?.message || "Unknown error" });
		return;
	}
});

export const processQueuedPropertyIngest = onDocumentCreated({
	document: `${propertyIngestQueueCollection}/{requestId}`,
	secrets: [rapidApiKeySecret],
	timeoutSeconds: 540,
	maxInstances: 1,
}, async (event) => {
	const snapshot = event.data;
	if (!snapshot) {
		return;
	}

	const requestId = event.params.requestId;
	const db = getFirestore();
	const requestRef = db.collection(propertyIngestQueueCollection).doc(requestId);
	const requestData = snapshot.data() as any;
	const params = requestData?.params || {};

	await requestRef.set({
		status: "running",
		startedAt: new Date().toISOString(),
	}, { merge: true });

	const leaseRunId = `queue-${requestId}`;
	const lease = await tryAcquirePropertyIngestLease(db, leaseRunId, "queued_on_demand");
	if (!lease.acquired) {
		await requestRef.set({
			status: "blocked",
			finishedAt: new Date().toISOString(),
			reason: lease.reason || "already_running",
			currentRunId: lease.currentRunId || null,
		}, { merge: true });
		return;
	}

	const rapidApiKey = rapidApiKeySecret.value();
	let finalStatus = "completed";
	let summary: Record<string, unknown> | undefined;

	try {
		const { maxPagesPerBatch, maxBatches, dryRun } = parseIngestRequestParams(
			params.maxPagesPerBatch,
			params.maxBatches,
			params.dryRun,
		);

		const result = await runPropertyIngest(db, rapidApiKey, {
			maxPagesPerBatch,
			maxBatches,
			dryRun,
			persistTelemetry: true,
			runLabel: "queued_on_demand",
		});

		if (result.errors > 0) {
			finalStatus = "completed_with_errors";
		}

		summary = {
			runId: result.runId,
			writes: result.writes,
			receivedProperties: result.receivedProperties,
			errors: result.errors,
			failedBatches: result.failedBatches,
			failedPages: result.failedPages,
			retriesPerformed: result.retriesPerformed,
		};

		await requestRef.set({
			status: finalStatus,
			finishedAt: new Date().toISOString(),
			result,
			summary,
		}, { merge: true });
	} catch (error: any) {
		finalStatus = "failed";
		await requestRef.set({
			status: "failed",
			finishedAt: new Date().toISOString(),
			error: error?.message || String(error),
		}, { merge: true });
		throw error;
	} finally {
		await releasePropertyIngestLease(db, leaseRunId, finalStatus, summary);
	}
});
