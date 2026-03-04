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
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const rapidApiZipCodes = [
	"30102","30103","30114","30115","30120","30121","30123","30137","30139","30141","30142","30143","30188","30189",
	"30501","30503","30504","30506","30510","30512","30513","30514","30516","30517","30518","30519","30520","30522",
	"30523","30527","30528","30533","30534","30535","30540","30541","30542","30543","30547","30548","30554","30558",
	"30560","30567","30577","30580","30701","30705","30707","30710","30720","30721","30724","30725","30726","30728",
	"30732","30734","30736","30738","30739","30740","30741","30742","30750","30752","30755","30757","30760"
];

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

function summarizeResponseShape(data: any): string[] {
	if (!data || typeof data !== "object") return [];
	return Object.keys(data).slice(0, 12);
}

function extractCityName(property: any): string {
	return (
		property?.location?.address?.city ||
		property?.address?.city ||
		property?.city ||
		"Unknown"
	);
}

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

async function isolateFailedZips(batchZips: string[], rapidApiKey: string) {
	const invalidZips: { zip: string; status?: number; message: string }[] = [];

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
				invalidZips.push({
					zip,
					status: response.status,
					message: getRapidApiErrorMessage(errorText).slice(0, 240),
				});
			}
		} catch (error) {
			invalidZips.push({
				zip,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return invalidZips;
}

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
		let batchStored = 0;
		let batchSkippedNoPropertyId = 0;
		let batchApiReportedTotal: number | null = null;
		let batchReceivedProperties = 0;
		let batchPagesFetched = 0;
		let batchFailedPages = 0;
		let batchStatus: "completed" | "completed_with_errors" = "completed";

		for (let page = 0; page < maxPagesPerBatch; page++) {
			const offset = page * pageSize;
			const url = buildSearchUrl(batch, offset, pageSize);

			try {
				requestsAttempted += 1;
				const fetchResult = await fetchRapidApiWithRetry(url, rapidApiKey);
				const response = fetchResult.response;
				outboundAttempts += fetchResult.attempts;
				retriesPerformed += Math.max(0, fetchResult.attempts - 1);

				if (!response.ok) {
					failedPages += 1;
					batchFailedPages += 1;
					failedBatches += 1;
					errorCount += 1;
					batchStatus = "completed_with_errors";
					const errorText = await response.text();
					failedBatchDetails.push({
						batchIndex,
						batchZips: batch,
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
					batchZips: batch,
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
			batchZips: batch,
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
		batchSummaries,
	};

	if (persistTelemetry) {
		await db.collection("apiPullRuns").doc(runId).set(telemetryPayload, { merge: true });
	}

	return telemetryPayload;
}

async function fetchPropertyCounts(rapidApiKey: string) {
	const startedAt = new Date().toISOString();
	const cityCounts: Record<string, number> = {};
	const batchSummaries: {
		batchZips: string[];
		pagesFetched: number;
		propertyCount: number;
		apiReportedTotal: number | null;
	}[] = [];
	const failedBatchDetails: { batchZips: string[]; status?: number; message: string }[] = [];
	const invalidZipDetails: { batchZips: string[]; invalidZips: { zip: string; status?: number; message: string }[] }[] = [];
	const statusCounts: Record<string, number> = {};
	let totalProperties = 0;
	let totalApiReported = 0;
	let failedBatches = 0;
	let successfulBatches = 0;
	let requestsAttempted = 0;
	let outboundAttempts = 0;
	let retriesPerformed = 0;
	let sampleResponseKeys: string[] = [];
	let sampleRapidApiHeaders: Record<string, string> = {};
	const pageSize = 20;
	const maxPagesPerBatch = 50;

	const batches = chunkArray(rapidApiZipCodes, 10);

	for (const batch of batches) {
		let batchPropertyCount = 0;
		let batchApiReportedTotal: number | null = null;
		let pagesFetched = 0;
		let batchFailed = false;

		for (let page = 0; page < maxPagesPerBatch; page++) {
			const offset = page * pageSize;
			const url = buildSearchUrl(batch, offset, pageSize);

			try {
				requestsAttempted += 1;
				const fetchResult = await fetchRapidApiWithRetry(url, rapidApiKey);
				const response = fetchResult.response;
				outboundAttempts += fetchResult.attempts;
				retriesPerformed += Math.max(0, fetchResult.attempts - 1);

				const statusKey = String(response.status);
				statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;

				if (Object.keys(sampleRapidApiHeaders).length === 0) {
					sampleRapidApiHeaders = {
						xRapidapiProxyResponse: response.headers.get("x-rapidapi-proxy-response") || "",
						xRapidapiRegion: response.headers.get("x-rapidapi-region") || "",
						xRapidapiVersion: response.headers.get("x-rapidapi-version") || "",
						xRateLimitRequestsLimit: response.headers.get("x-ratelimit-requests-limit") || "",
						xRateLimitRequestsRemaining: response.headers.get("x-ratelimit-requests-remaining") || "",
					};
				}

				if (!response.ok) {
					failedBatches += 1;
					batchFailed = true;
					const errorText = await response.text();
					const parsedMessage = getRapidApiErrorMessage(errorText);
					failedBatchDetails.push({
						batchZips: batch,
						status: response.status,
						message: `page=${page + 1}, offset=${offset}: ${parsedMessage}`.slice(0, 500),
					});

					if (response.status === 400) {
						const invalidZips = await isolateFailedZips(batch, rapidApiKey);
						if (invalidZips.length > 0) {
							invalidZipDetails.push({ batchZips: batch, invalidZips });
						}
					}

					console.error(`RapidAPI request failed for batch ${batch.join(",")} page=${page + 1}:`, errorText);
					break;
				}

				const data = await response.json();
				if (sampleResponseKeys.length === 0) {
					sampleResponseKeys = summarizeResponseShape(data);
				}

				const properties = getPropertiesArray(data);
				const apiReportedTotal = getApiReportedTotal(data);
				if (batchApiReportedTotal === null && apiReportedTotal !== null) {
					batchApiReportedTotal = apiReportedTotal;
					totalApiReported += apiReportedTotal;
				}

				pagesFetched += 1;
				batchPropertyCount += properties.length;
				totalProperties += properties.length;

				for (const property of properties) {
					const city = extractCityName(property);
					cityCounts[city] = (cityCounts[city] || 0) + 1;
				}

				if (properties.length === 0) {
					break;
				}

				if (batchApiReportedTotal !== null && batchPropertyCount >= batchApiReportedTotal) {
					break;
				}
			} catch (error) {
				failedBatches += 1;
				batchFailed = true;
				failedBatchDetails.push({
					batchZips: batch,
					message: `page=${page + 1}, offset=${offset}: ${error instanceof Error ? error.message : String(error)}`,
				});
				console.error(`Error fetching batch ${batch.join(",")} page=${page + 1}:`, error);
				break;
			}
		}

		if (!batchFailed) {
			successfulBatches += 1;
		}

		batchSummaries.push({
			batchZips: batch,
			pagesFetched,
			propertyCount: batchPropertyCount,
			apiReportedTotal: batchApiReportedTotal,
		});
	}

	return {
		startedAt,
		endedAt: new Date().toISOString(),
		totalZipCodes: rapidApiZipCodes.length,
		totalBatches: batches.length,
		requestsAttempted,
		outboundAttempts,
		retriesPerformed,
		successfulBatches,
		failedBatches,
		statusCounts,
		totalProperties,
		totalApiReported,
		sampleResponseKeys,
		sampleRapidApiHeaders,
		failedBatchDetails,
		invalidZipDetails,
		cityCounts,
		batchSummaries,
		runAt: new Date().toISOString(),
	};
}

export const countPropertiesByCity = onRequest({ secrets: [rapidApiKeySecret] }, async (req, res) => {
	try {
		const rapidApiKey = rapidApiKeySecret.value();
		const result = await fetchPropertyCounts(rapidApiKey);
		res.status(200).json({ ok: true, ...result });
		return;
	} catch (error: any) {
		console.error("countPropertiesByCity failed:", error);
		res.status(500).json({ ok: false, message: error?.message || "Unknown error" });
		return;
	}
});

export const fetchAndStoreProperties = onSchedule({ schedule: "every 24 hours", secrets: [rapidApiKeySecret] }, async (event) => {
	const db = getFirestore();
	const rapidApiKey = rapidApiKeySecret.value();
	const result = await runPropertyIngest(db, rapidApiKey, {
		maxPagesPerBatch: 50,
		runLabel: "scheduled",
		persistTelemetry: true,
		dryRun: false,
	});

	console.log(
		`fetchAndStoreProperties summary: runId=${result.runId}, requestsAttempted=${result.requestsAttempted}, outboundAttempts=${result.outboundAttempts}, retriesPerformed=${result.retriesPerformed}, received=${result.receivedProperties}, expectedKnown=${result.expectedPropertiesFromApiReported}, writes=${result.writes}, errors=${result.errors}, failedBatches=${result.failedBatches}, failedPages=${result.failedPages}`,
	);
});

export const runPropertyIngestNow = onRequest({ secrets: [rapidApiKeySecret] }, async (req, res) => {
	try {
		const db = getFirestore();
		const rapidApiKey = rapidApiKeySecret.value();

		const requestedMaxPages = Number(req.query.maxPagesPerBatch ?? 10);
		const requestedMaxBatches = Number(req.query.maxBatches ?? 2);
		const dryRunRaw = String(req.query.dryRun ?? "false").toLowerCase();
		const dryRun = dryRunRaw === "true" || dryRunRaw === "1";

		const maxPagesPerBatch = Number.isFinite(requestedMaxPages) && requestedMaxPages > 0
			? Math.min(requestedMaxPages, 50)
			: 10;
		const maxBatches = Number.isFinite(requestedMaxBatches) && requestedMaxBatches > 0
			? Math.min(requestedMaxBatches, chunkArray(rapidApiZipCodes, 10).length)
			: 2;

		const result = await runPropertyIngest(db, rapidApiKey, {
			maxPagesPerBatch,
			maxBatches,
			dryRun,
			persistTelemetry: true,
			runLabel: "on_demand_test",
		});

		res.status(200).json({
			ok: true,
			message: "On-demand ingest test completed",
			...result,
			summary: {
				expectedPropertiesFromApiReported: result.expectedPropertiesFromApiReported,
				receivedProperties: result.receivedProperties,
				receivedMinusExpectedKnown: result.receivedProperties - result.expectedPropertiesFromApiReported,
				failedBatches: result.failedBatches,
				failedPages: result.failedPages,
				retriesPerformed: result.retriesPerformed,
				writes: result.writes,
				errors: result.errors,
			},
		});
		return;
	} catch (error: any) {
		console.error("runPropertyIngestNow failed:", error);
		res.status(500).json({ ok: false, message: error?.message || "Unknown error" });
		return;
	}
});


/**Functions and exports to mark users as in_active = true at different points */
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
export const deactivateInactiveUsers = onSchedule("every 24 hours", async (event) => {
	const result = await runDeactivateInactiveUsers();
	console.log(
		`deactivateInactiveUsers summary: processed=${result.processedUsers}, deactivated=${result.deactivatedUsers}, skipped=${result.skippedUsers}`,
	);
});
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