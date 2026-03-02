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

async function fetchPropertyCounts(rapidApiKey: string) {
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
				const response = await fetch(url, {
					headers: {
						"X-RapidAPI-Key": rapidApiKey,
						"X-RapidAPI-Host": rapidApiHost,
					},
				});

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
		totalZipCodes: rapidApiZipCodes.length,
		totalBatches: batches.length,
		requestsAttempted,
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

export const fetchAndStorePropertiesSample = onRequest({ secrets: [rapidApiKeySecret] }, async (req, res) => {
	try {
		const db = getFirestore();
		const rapidApiKey = rapidApiKeySecret.value();
		const batches = chunkArray(rapidApiZipCodes, 10);
		const requestedBatchIndex = Number(req.query.batchIndex ?? 0);
		const requestedMaxPages = Number(req.query.maxPages ?? 1);

		const batchIndex = Number.isFinite(requestedBatchIndex) && requestedBatchIndex >= 0 ? requestedBatchIndex : 0;
		const maxPages = Number.isFinite(requestedMaxPages) && requestedMaxPages > 0 ? Math.min(requestedMaxPages, 10) : 1;

		if (batchIndex >= batches.length) {
			res.status(400).json({
				ok: false,
				message: `batchIndex out of range. Must be between 0 and ${batches.length - 1}`,
			});
			return;
		}

		const pageSize = 20;
		const runId = new Date().toISOString();
		const batch = batches[batchIndex];

		let requestsAttempted = 0;
		let pagesFetched = 0;
		let upserted = 0;
		let skippedNoPropertyId = 0;
		let apiReportedTotal: number | null = null;

		for (let page = 0; page < maxPages; page++) {
			const offset = page * pageSize;
			const url = buildSearchUrl(batch, offset, pageSize);

			requestsAttempted += 1;
			const response = await fetch(url, {
				headers: {
					"X-RapidAPI-Key": rapidApiKey,
					"X-RapidAPI-Host": rapidApiHost,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				res.status(response.status).json({
					ok: false,
					batchIndex,
					batchZips: batch,
					requestsAttempted,
					message: getRapidApiErrorMessage(errorText),
				});
				return;
			}

			const data = await response.json();
			const properties = getPropertiesArray(data);
			if (apiReportedTotal === null) {
				apiReportedTotal = getApiReportedTotal(data);
			}

			if (properties.length === 0) {
				break;
			}

			const pullDate = new Date().toISOString();
			const result = await upsertPropertiesForPage(db, properties, pullDate, runId);
			upserted += result.upserted;
			skippedNoPropertyId += result.skippedNoPropertyId;
			pagesFetched += 1;

			if (apiReportedTotal !== null && upserted >= apiReportedTotal) {
				break;
			}
		}

		res.status(200).json({
			ok: true,
			runId,
			batchIndex,
			batchZips: batch,
			maxPages,
			requestsAttempted,
			pagesFetched,
			upserted,
			skippedNoPropertyId,
			apiReportedTotal,
		});
		return;
	} catch (error: any) {
		console.error("fetchAndStorePropertiesSample failed:", error);
		res.status(500).json({ ok: false, message: error?.message || "Unknown error" });
		return;
	}
});

export const fetchAndStoreProperties = onSchedule({ schedule: "every 24 hours", secrets: [rapidApiKeySecret] }, async (event) => {
	const db = getFirestore();
	const rapidApiKey = rapidApiKeySecret.value();
	const batches = chunkArray(rapidApiZipCodes, 10);
	const pageSize = 20;
	const maxPagesPerBatch = 50;
	const runId = new Date().toISOString();
	let totalUpserted = 0;
	let totalSkippedNoPropertyId = 0;

	for (const batch of batches) {
		let batchStored = 0;
		let batchSkippedNoPropertyId = 0;
		let batchApiReportedTotal: number | null = null;

		for (let page = 0; page < maxPagesPerBatch; page++) {
			const offset = page * pageSize;
			const url = buildSearchUrl(batch, offset, pageSize);
			try {
				const response = await fetch(url, {
					headers: {
						"X-RapidAPI-Key": rapidApiKey,
						"X-RapidAPI-Host": rapidApiHost,
					},
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error(`RapidAPI request failed for batch ${batch.join(",")} page=${page + 1}:`, errorText);
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

				const pullDate = new Date().toISOString();
				const result = await upsertPropertiesForPage(db, properties, pullDate, runId);
				batchStored += result.upserted;
				batchSkippedNoPropertyId += result.skippedNoPropertyId;

				if (batchApiReportedTotal !== null && batchStored >= batchApiReportedTotal) {
					break;
				}
			} catch (error) {
				console.error(`Error fetching batch ${batch.join(",")} page=${page + 1}:`, error);
				break;
			}
		}

		totalUpserted += batchStored;
		totalSkippedNoPropertyId += batchSkippedNoPropertyId;
		console.log(`Properties upserted for batch: ${batch.join(",")} count=${batchStored}, skippedNoPropertyId=${batchSkippedNoPropertyId}`);
	}

	console.log(`fetchAndStoreProperties summary: runId=${runId}, upserted=${totalUpserted}, skippedNoPropertyId=${totalSkippedNoPropertyId}`);
});


/**Functions and exports to mark users as in_active = true at different points */
async function runDeactivateInactiveUsers() {
	const db = getFirestore();
	const auth = getAuth();
	// const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
	const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
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
			if (lastSignIn < oneWeekAgo) {
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