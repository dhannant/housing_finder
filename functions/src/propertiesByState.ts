import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { upsertPropertiesForPage } from "./propertyIngestShared";

export const rapidApiKeySecretState = defineSecret("RAPIDAPI_KEY");

const rapidApiHost = "realty-us.p.rapidapi.com";
const rapidApiBaseUrl = "https://realty-us.p.rapidapi.com/properties/search-buy";
const rapidApiTimeoutMs = 25000;
const rapidApiBaseBackoffMs = 800;
const rapidApiMaxBackoffMs = 12000;
const rapidApiMaxRetries = 2;
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const defaultPageSize = 20;
const defaultMaxPages = 8;
const interRequestDelayMs = 250;
const defaultStateName = "Georgia";

type PropertyDoc = Record<string, any>;

type IngestOptions = {
	stateName: string;
	dryRun: boolean;
	maxPages: number;
	pageSize: number;
	persistTelemetry: boolean;
};

type PropertyShapeAudit = {
	inspected: number;
	missingPropertyId: number;
	missingListingId: number;
	missingStatus: number;
	missingPrimaryPhoto: number;
	missingPhotosArray: number;
	missingAddressLine: number;
	missingStateCode: number;
	missingPostalCode: number;
	missingLatitude: number;
	missingLongitude: number;
	missingListPrice: number;
	missingBeds: number;
	missingBaths: number;
};

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
	if (value === undefined || value === null || value === "") return fallback;
	const normalized = String(value).trim().toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.min(Math.floor(parsed), max);
}

function parseRequestOptions(req: any): IngestOptions {
	const source = req.method === "GET" ? req.query : (req.body || {});
	const stateName = String(source.state || source.stateName || defaultStateName).trim() || defaultStateName;
	return {
		stateName,
		dryRun: parseBoolean(source.dryRun, true),
		maxPages: parsePositiveInt(source.maxPages, defaultMaxPages, 100),
		pageSize: parsePositiveInt(source.pageSize, defaultPageSize, 200),
		persistTelemetry: parseBoolean(source.persistTelemetry, false),
	};
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

function buildStateSearchUrl(stateName: string, offset: number, limit: number): string {
	const params = new URLSearchParams({
		location: `state:${stateName}`,
		offset: String(offset),
		limit: String(limit),
	});
	return `${rapidApiBaseUrl}?${params.toString()}`;
}

function getPropertiesArray(data: any): PropertyDoc[] {
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

function createEmptyPropertyShapeAudit(): PropertyShapeAudit {
	return {
		inspected: 0,
		missingPropertyId: 0,
		missingListingId: 0,
		missingStatus: 0,
		missingPrimaryPhoto: 0,
		missingPhotosArray: 0,
		missingAddressLine: 0,
		missingStateCode: 0,
		missingPostalCode: 0,
		missingLatitude: 0,
		missingLongitude: 0,
		missingListPrice: 0,
		missingBeds: 0,
		missingBaths: 0,
	};
}

function mergePropertyShapeAudit(target: PropertyShapeAudit, source: PropertyShapeAudit) {
	target.inspected += source.inspected;
	target.missingPropertyId += source.missingPropertyId;
	target.missingListingId += source.missingListingId;
	target.missingStatus += source.missingStatus;
	target.missingPrimaryPhoto += source.missingPrimaryPhoto;
	target.missingPhotosArray += source.missingPhotosArray;
	target.missingAddressLine += source.missingAddressLine;
	target.missingStateCode += source.missingStateCode;
	target.missingPostalCode += source.missingPostalCode;
	target.missingLatitude += source.missingLatitude;
	target.missingLongitude += source.missingLongitude;
	target.missingListPrice += source.missingListPrice;
	target.missingBeds += source.missingBeds;
	target.missingBaths += source.missingBaths;
}

function auditPropertyShape(properties: PropertyDoc[]): PropertyShapeAudit {
	const audit = createEmptyPropertyShapeAudit();

	for (const property of properties) {
		audit.inspected += 1;

		const hasPropertyId = property?.property_id !== undefined && property?.property_id !== null && String(property.property_id).trim() !== "";
		const hasListingId = property?.listing_id !== undefined && property?.listing_id !== null && String(property.listing_id).trim() !== "";
		const hasStatus = property?.status !== undefined && property?.status !== null && String(property.status).trim() !== "";
		const hasPrimaryPhoto = typeof property?.primary_photo?.href === "string" && property.primary_photo.href.trim() !== "";
		const hasPhotosArray = Array.isArray(property?.photos) && property.photos.length > 0;
		const hasAddressLine = typeof property?.location?.address?.line === "string" && property.location.address.line.trim() !== "";
		const hasStateCode = typeof property?.location?.address?.state_code === "string" && property.location.address.state_code.trim() !== "";
		const hasPostalCode = typeof property?.location?.address?.postal_code === "string" && property.location.address.postal_code.trim() !== "";

		const rawLat = property?.location?.address?.coordinate?.lat ?? property?.latitude;
		const rawLon = property?.location?.address?.coordinate?.lon ?? property?.longitude;
		const hasLatitude = Number.isFinite(typeof rawLat === "number" ? rawLat : Number(rawLat));
		const hasLongitude = Number.isFinite(typeof rawLon === "number" ? rawLon : Number(rawLon));

		const rawPrice = property?.list_price ?? property?.price?.value ?? property?.price?.list_price;
		const hasListPrice = Number.isFinite(typeof rawPrice === "number" ? rawPrice : Number(rawPrice));
		const rawBeds = property?.description?.beds ?? property?.beds;
		const rawBaths = property?.description?.baths ?? property?.baths;
		const hasBeds = Number.isFinite(typeof rawBeds === "number" ? rawBeds : Number(rawBeds));
		const hasBaths = Number.isFinite(typeof rawBaths === "number" ? rawBaths : Number(rawBaths));

		if (!hasPropertyId) audit.missingPropertyId += 1;
		if (!hasListingId) audit.missingListingId += 1;
		if (!hasStatus) audit.missingStatus += 1;
		if (!hasPrimaryPhoto) audit.missingPrimaryPhoto += 1;
		if (!hasPhotosArray) audit.missingPhotosArray += 1;
		if (!hasAddressLine) audit.missingAddressLine += 1;
		if (!hasStateCode) audit.missingStateCode += 1;
		if (!hasPostalCode) audit.missingPostalCode += 1;
		if (!hasLatitude) audit.missingLatitude += 1;
		if (!hasLongitude) audit.missingLongitude += 1;
		if (!hasListPrice) audit.missingListPrice += 1;
		if (!hasBeds) audit.missingBeds += 1;
		if (!hasBaths) audit.missingBaths += 1;
	}

	return audit;
}

async function fetchStateSearchWithRetry(url: string, rapidApiKey: string) {
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
			console.warn(`state-search retry: status=${response.status}, attempt=${attemptNumber + 1}, waitMs=${backoffMs}`);
			await sleep(backoffMs);
		} catch (error: any) {
			clearTimeout(timeout);
			lastError = error instanceof Error ? error : new Error(String(error));
			const shouldRetry = attemptNumber < rapidApiMaxRetries;
			if (!shouldRetry) {
				throw lastError;
			}
			const backoffMs = computeBackoffMs(attemptNumber);
			console.warn(`state-search retry: network error on attempt=${attemptNumber + 1}, waitMs=${backoffMs}, message=${lastError.message}`);
			await sleep(backoffMs);
		}
	}

	throw lastError || new Error("State search failed after retries");
}

async function runStateIngestTest(
	db: FirebaseFirestore.Firestore,
	rapidApiKey: string,
	options: IngestOptions,
) {
	const runId = `state-${new Date().toISOString()}`;
	const startedAt = new Date().toISOString();

	let requestsAttempted = 0;
	let outboundAttempts = 0;
	let retriesPerformed = 0;
	let successfulPages = 0;
	let failedPages = 0;
	let totalReceivedProperties = 0;
	let totalUpserted = 0;
	let totalSkippedNoPropertyId = 0;
	let errors = 0;
	let apiReportedTotal: number | null = null;
	const propertyShapeAudit = createEmptyPropertyShapeAudit();

	const failedPageDetails: {
		page: number;
		offset: number;
		status?: number;
		message: string;
	}[] = [];

	for (let page = 0; page < options.maxPages; page++) {
		const offset = page * options.pageSize;
		const url = buildStateSearchUrl(options.stateName, offset, options.pageSize);

		try {
			requestsAttempted += 1;
			const fetchResult = await fetchStateSearchWithRetry(url, rapidApiKey);
			outboundAttempts += fetchResult.attempts;
			retriesPerformed += Math.max(0, fetchResult.attempts - 1);

			const response = fetchResult.response;
			if (!response.ok) {
				failedPages += 1;
				errors += 1;
				const errorText = await response.text();
				failedPageDetails.push({
					page: page + 1,
					offset,
					status: response.status,
					message: getRapidApiErrorMessage(errorText).slice(0, 500),
				});
				break;
			}

			const data = await response.json();
			const pageApiReportedTotal = getApiReportedTotal(data);
			if (apiReportedTotal === null && pageApiReportedTotal !== null) {
				apiReportedTotal = pageApiReportedTotal;
			}

			const properties = getPropertiesArray(data);
			if (properties.length === 0) {
				break;
			}

			mergePropertyShapeAudit(propertyShapeAudit, auditPropertyShape(properties));
			successfulPages += 1;
			totalReceivedProperties += properties.length;

			if (!options.dryRun) {
				const pullDate = new Date().toISOString();
				const result = await upsertPropertiesForPage(db, properties, pullDate, runId, "rapidapi-state");
				totalUpserted += result.upserted;
				totalSkippedNoPropertyId += result.skippedNoPropertyId;
			}

			if (apiReportedTotal !== null && totalReceivedProperties >= apiReportedTotal) {
				break;
			}

			await sleep(interRequestDelayMs);
		} catch (error: any) {
			failedPages += 1;
			errors += 1;
			failedPageDetails.push({
				page: page + 1,
				offset,
				message: error instanceof Error ? error.message : String(error),
			});
			break;
		}
	}

	const endedAt = new Date().toISOString();
	const status = errors > 0 ? "completed_with_errors" : "completed";
	const payload = {
		runId,
		startedAt,
		endedAt,
		status,
		stateName: options.stateName,
		dryRun: options.dryRun,
		maxPages: options.maxPages,
		pageSize: options.pageSize,
		requestsAttempted,
		outboundAttempts,
		retriesPerformed,
		successfulPages,
		failedPages,
		receivedProperties: totalReceivedProperties,
		expectedPropertiesFromApiReported: apiReportedTotal,
		propertyShapeAudit,
		writes: totalUpserted,
		skippedNoPropertyId: totalSkippedNoPropertyId,
		errors,
		failedPageDetails,
	};

	if (options.persistTelemetry) {
		await db.collection("apiPullRuns").doc(runId).set({
			...payload,
			runLabel: "manual_state_test",
		}, { merge: true });
	}

	return payload;
}

export const testPropertiesByState = onRequest({
	secrets: [rapidApiKeySecretState],
	timeoutSeconds: 540,
	maxInstances: 1,
}, async (req, res) => {
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Headers", "Content-Type");
	res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
	if (req.method === "OPTIONS") {
		res.status(204).send("");
		return;
	}

	if (req.method !== "GET" && req.method !== "POST") {
		res.status(405).json({ ok: false, message: "Method not allowed. Use GET or POST." });
		return;
	}

	try {
		const db = getFirestore();
		const options = parseRequestOptions(req);
		const rapidApiKey = rapidApiKeySecretState.value();
		const result = await runStateIngestTest(db, rapidApiKey, options);
		res.status(200).json({ ok: true, result });
	} catch (error: any) {
		console.error("testPropertiesByState failed:", error);
		res.status(500).json({ ok: false, message: error?.message || String(error) });
	}
});
