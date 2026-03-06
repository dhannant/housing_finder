/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin SDK at the top level
initializeApp();

const rapidApiKeySecret = defineSecret("RAPIDAPI_KEY");
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
	"30560","30567","30577","30580","30701","30705","30707","30710","30720","30721","30724","30725","30726","30728",
	"30732","30734","30736","30738","30739","30740","30741","30742","30750","30752","30755","30757","30760"
];

// ===== Generic Utilities =====
// Split an array into fixed-size chunks for batched API requests.
function chunkArray<T>(array: T[], size: number) {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

// Normalize RapidAPI payload shapes into a consistent property array.
function getPropertiesArray(data: any): any[] {
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.properties)) return data.properties;
	if (data?.results && Array.isArray(data.results)) return data.results;
	if (data?.data?.results && Array.isArray(data.data.results)) return data.data.results;
	if (data?.home_search?.results && Array.isArray(data.home_search.results)) return data.home_search.results;
	if (data?.data?.home_search?.results && Array.isArray(data.data.home_search.results)) return data.data.home_search.results;
	return [];
}

// Create a stable Firestore document id from the upstream property id.
function getPropertyDocId(property: any): string | null {
	const rawPropertyId = property?.property_id;
	if (rawPropertyId === undefined || rawPropertyId === null) {
		return null;
	}

	const propertyId = String(rawPropertyId).trim();
	if (!propertyId) {
		return null;
	}

	return propertyId.replace(/\//g, "_");
}

// Read the API-reported total count from any known response shape.
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

// Build a URL for one ZIP batch page request.
function buildSearchUrl(batchZips: string[], offset: number, limit: number): string {
	const locationParam = `zip: ${batchZips.join(",")}`;
	const params = new URLSearchParams({
		location: locationParam,
		offset: String(offset),
		limit: String(limit),
	});
	return `${rapidApiBaseUrl}?${params.toString()}`;
}

// Extract a clear message from RapidAPI error payloads.
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

// Sleep helper used by retry backoff.
function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse Retry-After header into milliseconds.
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

// Compute exponential backoff with jitter.
function computeBackoffMs(attemptNumber: number): number {
	const exponential = Math.min(
		rapidApiBaseBackoffMs * Math.pow(2, attemptNumber),
		rapidApiMaxBackoffMs,
	);
	const jitter = Math.floor(Math.random() * 400);
	return exponential + jitter;
}

// ===== RapidAPI Access =====
// Fetch RapidAPI with retries on transient statuses/network errors.
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

// Probe each ZIP individually to identify bad/no-result ZIPs after a batch 400.
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

// ===== Firestore Writes =====
// Upsert one page of properties and track first/last seen metadata.
async function upsertPropertiesForPage(
	db: FirebaseFirestore.Firestore,
	properties: any[],
	pullDate: string,
	runId: string,
) {
	let upserted = 0;
	let skippedNoPropertyId = 0;

	const writeBatch = db.batch();
	const firstSeenBatch = db.batch();

	for (const property of properties) {
		const docId = getPropertyDocId(property);
		if (!docId) {
			skippedNoPropertyId += 1;
			continue;
		}

		const docRef = db.collection("properties").doc(docId);
		firstSeenBatch.set(docRef, {
			apiFirstSeenDate: pullDate,
		}, { merge: false });

		writeBatch.set(docRef, {
			...property,
			property_id: docId,
			apiPullDate: pullDate,
			apiFirstSeenDate: pullDate,
			apiLastSeenDate: pullDate,
			apiPullRunId: runId,
			apiSource: "rapidapi",
			apiActive: true,
		}, { merge: true });

		upserted += 1;
	}

	if (upserted > 0) {
		try {
			await firstSeenBatch.commit();
		} catch {
			console.log("apiFirstSeenDate already exists for one or more docs in this batch; skipping first-seen initialization for existing docs.");
		}
		await writeBatch.commit();
	}

	return { upserted, skippedNoPropertyId };
}

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

// ===== Lease Locking =====
// Acquire an ingest lease lock to prevent overlapping runs.
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

// Release the ingest lease lock and store completion metadata.
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
// Run full ingest across ZIP batches and persist run telemetry.
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
					const result = await upsertPropertiesForPage(db, properties, pullDate, runId);
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

// Parse and clamp ingest request query parameters.
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

// ===== Public Triggers =====
// Scheduled daily ingest run.
export const fetchAndStoreProperties = onSchedule({
	schedule: "every 24 hours",
	timeZone: "America/New_York",
	timeoutSeconds: 540,
	maxInstances: 1,
	secrets: [rapidApiKeySecret],
}, async (_event) => {
	const db = getFirestore();
	const rapidApiKey = rapidApiKeySecret.value();
	const schedulerRunId = `scheduled-${new Date().toISOString()}`;
	const lease = await tryAcquirePropertyIngestLease(db, schedulerRunId, "scheduled_daily");

	if (!lease.acquired) {
		console.warn(`fetchAndStoreProperties skipped: reason=${lease.reason}, currentRunId=${lease.currentRunId || "unknown"}, expiresAtMs=${lease.expiresAtMs || 0}`);
		return;
	}

	let finalStatus = "completed";
	let summary: Record<string, unknown> | undefined;

	try {
		const result = await runPropertyIngest(db, rapidApiKey, {
			maxPagesPerBatch: 50,
			runLabel: "scheduled",
			persistTelemetry: true,
			dryRun: false,
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

		console.log(
			`fetchAndStoreProperties summary: runId=${result.runId}, requestsAttempted=${result.requestsAttempted}, outboundAttempts=${result.outboundAttempts}, retriesPerformed=${result.retriesPerformed}, received=${result.receivedProperties}, expectedKnown=${result.expectedPropertiesFromApiReported}, writes=${result.writes}, errors=${result.errors}, failedBatches=${result.failedBatches}, failedPages=${result.failedPages}`,
		);
	} catch (error) {
		finalStatus = "failed";
		console.error("fetchAndStoreProperties failed:", error);
		throw error;
	} finally {
		await releasePropertyIngestLease(db, schedulerRunId, finalStatus, summary);
	}
});

// Queue an ingest request and return immediately.
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

// Process queued ingest requests in the background.
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


// ===== User Activity Maintenance =====
// Deactivate users who have not signed in during the inactivity window.
async function runDeactivateInactiveUsers() {
	const db = getFirestore();
	const auth = getAuth();
	const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
	let processedUsers = 0;
	let deactivatedUsers = 0;
	let skippedUsers = 0;
	const deactivatedUserIds: string[] = [];
 
	// Get all users from Firebase Auth
	const listUsersResult = await auth.listUsers();
	for (const user of listUsersResult.users) {
		processedUsers += 1;
		if (user.metadata.lastSignInTime) {
			const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
			if (lastSignIn < ninetyDaysAgo) {
				await db.collection("users").doc(user.uid).update({ is_active: false });
				deactivatedUsers += 1;
				deactivatedUserIds.push(user.uid);
			} else {
				skippedUsers += 1;
			}
		} else {
			skippedUsers += 1;
		}
	}

	return {
		processedUsers,
		deactivatedUsers,
		skippedUsers,
		deactivatedUserIds,
		runAt: new Date().toISOString(),
	};
}

// Scheduled daily inactive-user processing.
export const deactivateInactiveUsers = onSchedule("every 24 hours", async (event) => {
	const result = await runDeactivateInactiveUsers();
	console.log(
		`deactivateInactiveUsers summary: processed=${result.processedUsers}, deactivated=${result.deactivatedUsers}, skipped=${result.skippedUsers}`,
	);
});

// On-demand inactive-user processing endpoint.
export const deactivateInactiveUsersNow = onRequest(async (req, res) => {
	try {
		const result = await runDeactivateInactiveUsers();
		res.status(200).json({ ok: true, ...result });
		return;
	} catch (error: any) {
		console.error("deactivateInactiveUsersNow failed:", error);
		res.status(500).json({ ok: false, message: error?.message || "Unknown error" });
		return;
	}
});

// Scheduled cleanup for users long past offer close date.
export const deactivateUsersAfterCloseDate = onSchedule("every 24 hours", async (event) => {
	const db = getFirestore();
	const now = Date.now();
	const tenDaysMs = 10 * 24 * 60 * 60 * 1000;

	// Query all offers with a closeDate
	const offersSnapshot = await db.collection("clientOffers").where("closingDate", ">", 0).get();
	for (const offerDoc of offersSnapshot.docs) {
		const offer = offerDoc.data();
		if (offer.closeDate) {
			const closeDateMs = new Date(offer.closeDate).getTime();
			if (now - closeDateMs > tenDaysMs && offer.userId) {
				// Set is_active to false in Firestore users collection
				await db.collection("users").doc(offer.userId).update({ is_active: false });
			}
		}
	}
});