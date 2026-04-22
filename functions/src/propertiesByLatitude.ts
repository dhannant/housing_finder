import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { upsertPropertiesForPage } from "./propertyIngestShared";

export const rapidApiKeySecretLatitude = defineSecret("RAPIDAPI_KEY");

const rapidApiHost = "realty-us.p.rapidapi.com";
const rapidApiCoordsUrl = "https://realty-us.p.rapidapi.com/properties/coords/search-buy";
const rapidApiTimeoutMs = 25000;
const rapidApiBaseBackoffMs = 800;
const rapidApiMaxBackoffMs = 12000;
const rapidApiMaxRetries = 2;
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const defaultPageSize = 20;
const defaultMaxPagesPerTile = 8;
const defaultTileChunkSize = 2;
const interRequestDelayMs = 250;

// Atlanta Hartsfield-Jackson Airport latitude.
const searchLatitude = 33.6407;

const geoFilters: { states: string[]; minLatitude: number }[] = [
	{ states: ["GA"], minLatitude: searchLatitude },
];

type PropertyDoc = Record<string, any>;

type PolygonTile = {
	id: string;
	coordinates: [number, number][];
};

type IngestOptions = {
	dryRun: boolean;
	maxPagesPerTile: number;
	tileOffset: number;
	maxTiles: number;
	pageSize: number;
	tileChunkSize: number;
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

function chunkArray<T>(array: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

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
	const requestedPageSize = parsePositiveInt(
		source.resultsPerPage ?? source.pageSize,
		defaultPageSize,
		200,
	);
	const pageSize = Math.max(8, requestedPageSize);
	const maxTileOffset = Math.max(0, northGeorgiaTiles.length - 1);
	return {
		dryRun: parseBoolean(source.dryRun, true),
		maxPagesPerTile: parsePositiveInt(source.maxPagesPerTile, defaultMaxPagesPerTile, 100),
		tileOffset: parsePositiveInt(source.tileOffset, 0, maxTileOffset),
		maxTiles: parsePositiveInt(source.maxTiles, northGeorgiaTiles.length, northGeorgiaTiles.length),
		pageSize,
		tileChunkSize: parsePositiveInt(source.tileChunkSize, defaultTileChunkSize, 10),
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

function buildCoordsSearchUrl(page: number, resultsPerPage: number): string {
	const params = new URLSearchParams({
		sortBy: "relevance",
		page: String(page),
		resultsPerPage: String(resultsPerPage),
	});
	return `${rapidApiCoordsUrl}?${params.toString()}`;
}

function buildCoordsPayload(tile: PolygonTile): string {
	return JSON.stringify({
		coordinates: tile.coordinates,
	});
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

function isPropertyGeoEligible(property: PropertyDoc): boolean {
	if (!geoFilters.length) return true;

	const stateCode = String(
		property?.location?.address?.state_code ?? property?.state_code ?? "",
	).toUpperCase();
	const rawLat = property?.location?.address?.coordinate?.lat ?? property?.latitude;
	const latitude = typeof rawLat === "number" ? rawLat : Number(rawLat);

	if (!Number.isFinite(latitude)) return false;

	return geoFilters.some((filter) => {
		const normalizedStates = filter.states.map((state) => state.toUpperCase());
		return normalizedStates.includes(stateCode) && latitude > filter.minLatitude;
	});
}

async function isTransientTimeoutLikeRapidApiError(response: Response): Promise<boolean> {
	if (response.status !== 400) {
		return false;
	}

	try {
		const errorText = await response.clone().text();
		const normalized = errorText.toLowerCase();
		return (
			normalized.includes("timeouterror") ||
			normalized.includes("timeout awaiting") ||
			normalized.includes("502 bad gateway") ||
			normalized.includes("\"status\":false") ||
			normalized.includes("\"errors\":\"502 bad gateway") ||
			(normalized.includes("http_error") && normalized.includes("\"code\":500"))
		);
	} catch {
		return false;
	}
}

async function fetchCoordsWithRetry(
	url: string,
	rapidApiKey: string,
	payload: string,
): Promise<{ response: Response; attempts: number }> {
	let attempts = 0;
	let lastError: Error | null = null;

	while (attempts <= rapidApiMaxRetries) {
		const attemptNumber = attempts;
		attempts += 1;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), rapidApiTimeoutMs);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"X-RapidAPI-Key": rapidApiKey,
					"X-RapidAPI-Host": rapidApiHost,
					"Content-Type": "application/json",
				},
				body: payload,
				signal: controller.signal,
			});
			clearTimeout(timeout);

			if (response.ok) {
				return { response, attempts };
			}

			const retryByStatus = retryableStatuses.has(response.status);
			const retryByBody = await isTransientTimeoutLikeRapidApiError(response);
			const shouldRetry = (retryByStatus || retryByBody) && attemptNumber < rapidApiMaxRetries;
			if (!shouldRetry) {
				return { response, attempts };
			}

			const retryAfterMs = getRetryAfterMs(response);
			const backoffMs = retryAfterMs ?? computeBackoffMs(attemptNumber);
			const retryReason = retryByStatus ? "status" : "body_timeout_signal";
			console.warn(`coords-search retry: status=${response.status}, reason=${retryReason}, attempt=${attemptNumber + 1}, waitMs=${backoffMs}`);
			await sleep(backoffMs);
		} catch (error: any) {
			clearTimeout(timeout);
			lastError = error instanceof Error ? error : new Error(String(error));
			const shouldRetry = attemptNumber < rapidApiMaxRetries;
			if (!shouldRetry) {
				throw lastError;
			}
			const backoffMs = computeBackoffMs(attemptNumber);
			console.warn(`coords-search retry: network error on attempt=${attemptNumber + 1}, waitMs=${backoffMs}, message=${lastError.message}`);
			await sleep(backoffMs);
		}
	}

	throw lastError || new Error("Coords search failed after retries");
}

// Keep tiles intentionally narrow for better result density and fewer wasted pages.
const northGeorgiaTiles: PolygonTile[] = [
	{
		id: "ga-northwest-1",
		coordinates: [
			[-85.61, 34.95],
			[-84.85, 34.95],
			[-84.85, 34.45],
			[-85.61, 34.45],
			[-85.61, 34.95],
		],
	},
	{
		id: "ga-northcentral-1",
		coordinates: [
			[-84.86, 34.95],
			[-84.00, 34.95],
			[-84.00, 34.45],
			[-84.86, 34.45],
			[-84.86, 34.95],
		],
	},
	{
		id: "ga-northeast-1",
		coordinates: [
			[-84.01, 34.95],
			[-83.10, 34.95],
			[-83.10, 34.45],
			[-84.01, 34.45],
			[-84.01, 34.95],
		],
	},
	{
		id: "ga-north-below-ridge-nw",
		coordinates: [
			[-85.61, 34.46],
			[-84.355, 34.46],
			[-84.355, 34.205],
			[-85.61, 34.205],
			[-85.61, 34.46],
		],
	},
	{
		id: "ga-north-below-ridge-ne",
		coordinates: [
			[-84.355, 34.46],
			[-83.10, 34.46],
			[-83.10, 34.205],
			[-84.355, 34.205],
			[-84.355, 34.46],
		],
	},
	{
		id: "ga-north-below-ridge-sw",
		coordinates: [
			[-85.61, 34.205],
			[-84.355, 34.205],
			[-84.355, 33.95],
			[-85.61, 33.95],
			[-85.61, 34.205],
		],
	},
	{
		id: "ga-north-below-ridge-se",
		coordinates: [
			[-84.355, 34.205],
			[-83.10, 34.205],
			[-83.10, 33.95],
			[-84.355, 33.95],
			[-84.355, 34.205],
		],
	},
];

async function runCoordsIngestTest(
	db: FirebaseFirestore.Firestore,
	rapidApiKey: string,
	options: IngestOptions,
) {
	const runId = `coords-${new Date().toISOString()}`;
	const startedAt = new Date().toISOString();
	const selectedTiles = northGeorgiaTiles.slice(options.tileOffset, options.tileOffset + options.maxTiles);
	const tileChunks = chunkArray(selectedTiles, options.tileChunkSize);

	let requestsAttempted = 0;
	let outboundAttempts = 0;
	let retriesPerformed = 0;
	let successfulPages = 0;
	let failedPages = 0;
	let totalReceivedProperties = 0;
	let totalGeoEligible = 0;
	let totalSkippedByGeoFilter = 0;
	let totalUpserted = 0;
	let totalSkippedNoPropertyId = 0;
	let errors = 0;
	const propertyShapeAudit = createEmptyPropertyShapeAudit();

	const failedPageDetails: {
		tileId: string;
		page: number;
		resultsPerPage: number;
		status?: number;
		message: string;
	}[] = [];

	const tileTelemetry: {
		tileId: string;
		pagesFetched: number;
		finalPageFetched: number;
		firstEmptyPage: number | null;
		stoppedByApiReportedTotal: boolean;
		apiReportedTotal: number | null;
		receivedProperties: number;
		geoEligibleProperties: number;
		skippedByGeoFilter: number;
	}[] = [];

	for (const tileChunk of tileChunks) {
		for (const tile of tileChunk) {
			let tileReceived = 0;
			let tileEligible = 0;
			let tileApiReportedTotal: number | null = null;
			let tilePagesFetched = 0;
			let tileFinalPageFetched = 0;
			let tileFirstEmptyPage: number | null = null;
			let tileStoppedByApiReportedTotal = false;

			for (let page = 1; page <= options.maxPagesPerTile; page++) {
				const url = buildCoordsSearchUrl(page, options.pageSize);
				const payload = buildCoordsPayload(tile);

				try {
					requestsAttempted += 1;
					const fetchResult = await fetchCoordsWithRetry(url, rapidApiKey, payload);
					outboundAttempts += fetchResult.attempts;
					retriesPerformed += Math.max(0, fetchResult.attempts - 1);

					const response = fetchResult.response;
					if (!response.ok) {
						failedPages += 1;
						errors += 1;
						const errorText = await response.text();
						failedPageDetails.push({
							tileId: tile.id,
							page,
							resultsPerPage: options.pageSize,
							status: response.status,
							message: errorText.slice(0, 500),
						});
						break;
					}

					const data = await response.json();
					const apiReportedTotal = getApiReportedTotal(data);
					if (tileApiReportedTotal === null && apiReportedTotal !== null) {
						tileApiReportedTotal = apiReportedTotal;
					}

					const allProperties = getPropertiesArray(data);
					if (allProperties.length === 0) {
						tileFirstEmptyPage = page;
						break;
					}

					mergePropertyShapeAudit(propertyShapeAudit, auditPropertyShape(allProperties));

					const eligibleProperties = allProperties.filter(isPropertyGeoEligible);
					const skippedByGeoFilter = allProperties.length - eligibleProperties.length;

					successfulPages += 1;
					tilePagesFetched += 1;
					tileFinalPageFetched = page;
					tileReceived += allProperties.length;
					tileEligible += eligibleProperties.length;
					totalReceivedProperties += allProperties.length;
					totalGeoEligible += eligibleProperties.length;
					totalSkippedByGeoFilter += skippedByGeoFilter;

					if (!options.dryRun) {
						const pullDate = new Date().toISOString();
						const result = await upsertPropertiesForPage(db, eligibleProperties, pullDate, runId, "rapidapi-coords");
						totalUpserted += result.upserted;
						totalSkippedNoPropertyId += result.skippedNoPropertyId;
					}

					if (tileApiReportedTotal !== null && tileReceived >= tileApiReportedTotal) {
						tileStoppedByApiReportedTotal = true;
						break;
					}

					await sleep(interRequestDelayMs);
				} catch (error: any) {
					failedPages += 1;
					errors += 1;
					failedPageDetails.push({
						tileId: tile.id,
						page,
						resultsPerPage: options.pageSize,
						message: error instanceof Error ? error.message : String(error),
					});
					break;
				}
			}

			console.log(`coords ingest tile summary: tile=${tile.id}, received=${tileReceived}, eligible=${tileEligible}, apiReported=${tileApiReportedTotal ?? "unknown"}`);
			tileTelemetry.push({
				tileId: tile.id,
				pagesFetched: tilePagesFetched,
				finalPageFetched: tileFinalPageFetched,
				firstEmptyPage: tileFirstEmptyPage,
				stoppedByApiReportedTotal: tileStoppedByApiReportedTotal,
				apiReportedTotal: tileApiReportedTotal,
				receivedProperties: tileReceived,
				geoEligibleProperties: tileEligible,
				skippedByGeoFilter: tileReceived - tileEligible,
			});
		}
	}

	const endedAt = new Date().toISOString();
	const status = errors > 0 ? "completed_with_errors" : "completed";
	const payload = {
		runId,
		startedAt,
		endedAt,
		status,
		dryRun: options.dryRun,
		tileOffset: options.tileOffset,
		maxTiles: options.maxTiles,
		selectedTileCount: selectedTiles.length,
		selectedTileIds: selectedTiles.map((tile) => tile.id),
		tileChunkSize: options.tileChunkSize,
		maxPagesPerTile: options.maxPagesPerTile,
		pageSize: options.pageSize,
		resultsPerPage: options.pageSize,
		requestsAttempted,
		outboundAttempts,
		retriesPerformed,
		successfulPages,
		failedPages,
		receivedProperties: totalReceivedProperties,
		geoEligibleProperties: totalGeoEligible,
		skippedByGeoFilter: totalSkippedByGeoFilter,
		tileTelemetry,
		propertyShapeAudit,
		writes: totalUpserted,
		skippedNoPropertyId: totalSkippedNoPropertyId,
		errors,
		failedPageDetails,
	};

	if (options.persistTelemetry) {
		await db.collection("apiPullRuns").doc(runId).set({
			...payload,
			runLabel: "manual_coords_test",
		}, { merge: true });
	}

	return payload;
}

async function runScheduledLatitudeBatch(
	batchLabel: string,
	tileOffset: number,
	maxTiles: number,
) {
	const db = getFirestore();
	const rapidApiKey = rapidApiKeySecretLatitude.value();

	const result = await runCoordsIngestTest(db, rapidApiKey, {
		dryRun: false,
		tileOffset,
		maxTiles,
		tileChunkSize: 2,
		maxPagesPerTile: 120,
		pageSize: 80,
		persistTelemetry: true,
	});

	await db.collection("apiPullRuns").doc(result.runId).set({
		runLabel: batchLabel,
		scheduleType: "daily_midnight",
	}, { merge: true });
}

export const fetchAndStorePropertiesByLatitudeBatchA = onSchedule({
	schedule: "0 0 * * *",
	timeZone: "America/New_York",
	timeoutSeconds: 540,
	maxInstances: 1,
	secrets: [rapidApiKeySecretLatitude],
}, async () => {
	await runScheduledLatitudeBatch("scheduled_latitude_batch_a", 0, 3);
});

export const fetchAndStorePropertiesByLatitudeBatchB = onSchedule({
	schedule: "0 0 * * *",
	timeZone: "America/New_York",
	timeoutSeconds: 540,
	maxInstances: 1,
	secrets: [rapidApiKeySecretLatitude],
}, async () => {
	await runScheduledLatitudeBatch("scheduled_latitude_batch_b", 3, 2);
});

export const fetchAndStorePropertiesByLatitudeBatchC = onSchedule({
	schedule: "0 0 * * *",
	timeZone: "America/New_York",
	timeoutSeconds: 540,
	maxInstances: 1,
	secrets: [rapidApiKeySecretLatitude],
}, async () => {
	await runScheduledLatitudeBatch("scheduled_latitude_batch_c", 5, 2);
});

async function runPruneStaleProperties(staleDays: number) {
	const db = getFirestore();
	const cutoffMs = Date.now() - staleDays * 24 * 60 * 60 * 1000;
	const cutoffIso = new Date(cutoffMs).toISOString();

	const staleSnapshot = await db
		.collection("properties")
		.where("apiLastSeenDate", "<", cutoffIso)
		.get();

	let deleted = 0;
	let batchesCommitted = 0;
	let processed = 0;
	let writeBatch = db.batch();
	let batchOpCount = 0;

	for (const doc of staleSnapshot.docs) {
		processed += 1;
		writeBatch.delete(doc.ref);
		batchOpCount += 1;
		deleted += 1;

		if (batchOpCount >= 450) {
			await writeBatch.commit();
			batchesCommitted += 1;
			writeBatch = db.batch();
			batchOpCount = 0;
		}
	}

	if (batchOpCount > 0) {
		await writeBatch.commit();
		batchesCommitted += 1;
	}

	const result = {
		staleDays,
		cutoffIso,
		processed,
		deleted,
		batchesCommitted,
		runAt: new Date().toISOString(),
	};

	await db.collection("apiPullRuns").doc(`stale-prune-${result.runAt}`).set({
		runLabel: "scheduled_stale_property_prune",
		...result,
	}, { merge: true });

	return result;
}

export const pruneStalePropertiesDaily = onSchedule({
	schedule: "15 3 * * *",
	timeZone: "America/New_York",
	timeoutSeconds: 540,
	maxInstances: 1,
}, async () => {
	const result = await runPruneStaleProperties(5);
	console.log(`pruneStalePropertiesDaily summary: cutoff=${result.cutoffIso}, processed=${result.processed}, deleted=${result.deleted}, batches=${result.batchesCommitted}`);
});

export const pruneStalePropertiesNow = onRequest(async (req, res) => {
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
		const source = req.method === "GET" ? req.query : (req.body || {});
		const requestedStaleDays = parsePositiveInt(source.staleDays, 5, 30);
		const result = await runPruneStaleProperties(requestedStaleDays);
		res.status(200).json({ ok: true, result });
	} catch (error: any) {
		console.error("pruneStalePropertiesNow failed:", error);
		res.status(500).json({ ok: false, message: error?.message || String(error) });
	}
});

export const testPropertiesByLatitude = onRequest({
	secrets: [rapidApiKeySecretLatitude],
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
		const rapidApiKey = rapidApiKeySecretLatitude.value();
		const result = await runCoordsIngestTest(db, rapidApiKey, options);
		res.status(200).json({ ok: true, result });
	} catch (error: any) {
		console.error("testPropertiesByLatitude failed:", error);
		res.status(500).json({ ok: false, message: error?.message || String(error) });
	}
});
