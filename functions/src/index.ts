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
// ===== Registration Rate Limiting =====
// Firestore collection: registrationAttempts
// Document ID: lowercased email
// Fields: attemptCount (number), lockoutUntil (timestamp)

import { onCall, onRequest } from "firebase-functions/v2/https";
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
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin SDK at the top level
initializeApp();
const REG_ATTEMPT_COLLECTION = "registrationAttempts";
const MAX_REG_ATTEMPTS = 3;
const REG_LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check if registration is allowed for a given email
export const verifyRegistrationAllowed = onCall(async (request) => {
	const emailRaw = request.data?.email;
	if (typeof emailRaw !== "string" || !emailRaw.trim()) {
		return { allowed: false, reason: "Missing email" };
	}
	const email = emailRaw.trim().toLowerCase();
	const db = getFirestore();
	const docRef = db.collection(REG_ATTEMPT_COLLECTION).doc(email);
	const docSnap = await docRef.get();
	const now = Date.now();
	if (docSnap.exists) {
		const data = docSnap.data() || {};
		if (typeof data.lockoutUntil === "number" && data.lockoutUntil > now) {
			return {
				allowed: false,
				reason: "locked_out",
				lockoutUntil: data.lockoutUntil,
				attemptCount: data.attemptCount || 0,
			};
		}
	}
	return { allowed: true };
});

// Record a registration attempt and set lockout if needed
export const recordRegistrationAttempt = onCall(async (request) => {
	const emailRaw = request.data?.email;
	const success = !!request.data?.success;
	if (typeof emailRaw !== "string" || !emailRaw.trim()) {
		return { ok: false, reason: "Missing email" };
	}
	const email = emailRaw.trim().toLowerCase();
	const db = getFirestore();
	const docRef = db.collection(REG_ATTEMPT_COLLECTION).doc(email);
	const now = Date.now();
	if (success) {
		// On successful registration, reset attempt count and lockout
		await docRef.set({ attemptCount: 0, lockoutUntil: 0 }, { merge: true });
		return { ok: true, reset: true };
	}
	// On failed registration, increment attempt count
	const docSnap = await docRef.get();
	let attemptCount = 1;
	if (docSnap.exists) {
		const data = docSnap.data() || {};
		attemptCount = (typeof data.attemptCount === "number" ? data.attemptCount : 0) + 1;
	}
	let lockoutUntil = 0;
	if (attemptCount >= MAX_REG_ATTEMPTS) {
		lockoutUntil = now + REG_LOCKOUT_DURATION_MS;
	}
	await docRef.set({ attemptCount, lockoutUntil }, { merge: true });
	return { ok: true, attemptCount, lockoutUntil };
});
// ===== Login Rate Limiting =====
// Firestore collection: loginAttempts
// Document ID: lowercased email
// Fields: failedCount (number), lockoutUntil (timestamp)

const LOGIN_ATTEMPT_COLLECTION = "loginAttempts";
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check if login is allowed for a given email
export const verifyLoginAllowed = onCall(async (request) => {
	const emailRaw = request.data?.email;
	if (typeof emailRaw !== "string" || !emailRaw.trim()) {
		return { allowed: false, reason: "Missing email" };
	}
	const email = emailRaw.trim().toLowerCase();
	const db = getFirestore();
	const docRef = db.collection(LOGIN_ATTEMPT_COLLECTION).doc(email);
	const docSnap = await docRef.get();
	const now = Date.now();
	if (docSnap.exists) {
		const data = docSnap.data() || {};
		if (typeof data.lockoutUntil === "number" && data.lockoutUntil > now) {
			return {
				allowed: false,
				reason: "locked_out",
				lockoutUntil: data.lockoutUntil,
				failedCount: data.failedCount || 0,
			};
		}
	}
	return { allowed: true };
});

// Record a failed login attempt and set lockout if needed
export const recordLoginAttempt = onCall(async (request) => {
	const emailRaw = request.data?.email;
	const success = !!request.data?.success;
	if (typeof emailRaw !== "string" || !emailRaw.trim()) {
		return { ok: false, reason: "Missing email" };
	}
	const email = emailRaw.trim().toLowerCase();
	const db = getFirestore();
	const docRef = db.collection(LOGIN_ATTEMPT_COLLECTION).doc(email);
	const now = Date.now();
	if (success) {
		// On successful login, reset failed count and lockout
		await docRef.set({ failedCount: 0, lockoutUntil: 0 }, { merge: true });
		return { ok: true, reset: true };
	}
	// On failed login, increment failed count
	const docSnap = await docRef.get();
	let failedCount = 1;
	if (docSnap.exists) {
		const data = docSnap.data() || {};
		failedCount = (typeof data.failedCount === "number" ? data.failedCount : 0) + 1;
	}
	let lockoutUntil = 0;
	if (failedCount >= MAX_FAILED_ATTEMPTS) {
		lockoutUntil = now + LOCKOUT_DURATION_MS;
	}
	await docRef.set({ failedCount, lockoutUntil }, { merge: true });
	return { ok: true, failedCount, lockoutUntil };
});

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
const expoPushApiUrl = "https://exp.host/--/api/v2/push/send";
const rapidApiZipCodes = [
	"30102","30103","30114","30115","30120","30121","30123","30137","30139","30141","30142","30143","30188","30189",
	"30501","30503","30504","30506","30510","30512","30513","30514","30516","30517","30518","30519","30520","30522",
	"30523","30527","30528","30533","30534","30535","30540","30541","30542","30543","30547","30548","30554","30558",
	"30560","30567","30577","30580","30701","30705","30707","30710","30720","30721","30724","30725","30726","30728",
	"30732","30734","30736","30738","30739","30740","30741","30742","30750","30752","30755","30757","30760"
];

type NotificationPayload = {
	title: string;
	body: string;
	data?: Record<string, unknown>;
};

type PushSendResult = {
	ok: boolean;
	reason: "sent" | "missing_token" | "invalid_token" | "http_error" | "expo_error" | "exception";
	userId: string;
	tokenPreview?: string;
	details?: string;
};

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

// ===== Push Notifications =====
// Build a readable user name for notification copy.
function getDisplayName(userData: any, fallback: string) {
	const firstName = typeof userData?.firstName === "string" ? userData.firstName.trim() : "";
	const lastName = typeof userData?.lastName === "string" ? userData.lastName.trim() : "";
	const fullName = `${firstName} ${lastName}`.trim();
	return fullName || fallback;
}

function hasMeaningfulValue(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	return true;
}

function normalizeComparableValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "object" && value && "toDate" in (value as any)) {
		try {
			const timestampDate = (value as any).toDate();
			if (timestampDate instanceof Date) return timestampDate.toISOString();
		} catch {
			// Ignore conversion failures and fall back to string conversion.
		}
	}
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (typeof value === "string") return value.trim();
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

async function getUserPushToken(userId: string): Promise<string | null> {
	if (!userId) return null;
	const db = getFirestore();
	const userSnap = await db.collection("users").doc(userId).get();
	if (!userSnap.exists) return null;
	const token = userSnap.data()?.pushToken ?? userSnap.data()?.expoPushToken;
	if (typeof token !== "string" || token.trim().length === 0) return null;
	return token.trim();
}

function isLikelyExpoPushToken(token: string): boolean {
	return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendExpoPushToUser(userId: string, payload: NotificationPayload): Promise<PushSendResult> {
	const token = await getUserPushToken(userId);
	if (!token) {
		console.warn(`[Push] Missing push token for user=${userId}`);
		return { ok: false, reason: "missing_token", userId };
	}

	if (!isLikelyExpoPushToken(token)) {
		console.warn(`[Push] Invalid/unsupported token format for user=${userId}, tokenPrefix=${token.slice(0, 18)}`);
		return {
			ok: false,
			reason: "invalid_token",
			userId,
			tokenPreview: `${token.slice(0, 10)}...`,
		};
	}

	const response = await fetch(expoPushApiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			to: token,
			sound: "default",
			title: payload.title,
			body: payload.body,
			data: payload.data || {},
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.warn(`[Push] HTTP failure user=${userId}, status=${response.status}, body=${errorText.slice(0, 400)}`);
		return {
			ok: false,
			reason: "http_error",
			userId,
			tokenPreview: `${token.slice(0, 10)}...`,
			details: `status=${response.status}`,
		};
	}

	const json = await response.json().catch(() => null);
	const ticket = json?.data;
	const isExpoError = ticket?.status === "error";
	if (isExpoError) {
		const expoMessage = ticket?.message || "Unknown Expo push ticket error";
		console.warn(`[Push] Expo ticket error user=${userId}, message=${expoMessage}`);
		return {
			ok: false,
			reason: "expo_error",
			userId,
			tokenPreview: `${token.slice(0, 10)}...`,
			details: String(expoMessage),
		};
	}

	console.log(`[Push] Sent user=${userId}, title=${payload.title}`);

	return {
		ok: true,
		reason: "sent",
		userId,
		tokenPreview: `${token.slice(0, 10)}...`,
	};





}

async function sendExpoPushToUsers(userIds: string[], payload: NotificationPayload) {
	const uniqueUserIds = Array.from(new Set(userIds.filter((id) => typeof id === "string" && id.trim().length > 0)));
	if (uniqueUserIds.length === 0) {
		return { sent: 0, attempted: 0 };
	}

	let sent = 0;
	for (const userId of uniqueUserIds) {
		try {
			const result = await sendExpoPushToUser(userId, payload);
			if (result.ok) sent += 1;
			if (!result.ok) {
				console.warn(`[Push] Recipient send failed user=${userId}, reason=${result.reason}, details=${result.details || "n/a"}`);
			}
		} catch (error) {
			console.warn(`Push send exception for user=${userId}`, error);
		}
	}

	return { sent, attempted: uniqueUserIds.length };
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

// New pending client request: notify selected agent.
export const notifyAgentOnClientRequestCreated = onDocumentCreated("clientRequests/{requestId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;

	const request = snapshot.data() as any;
	if (request?.status !== "Pending") return;
	if (typeof request?.realtorId !== "string" || typeof request?.clientId !== "string") return;

	const db = getFirestore();
	const clientSnap = await db.collection("users").doc(request.clientId).get();
	const clientName = getDisplayName(clientSnap.data(), "A client");

	const sendResult = await sendExpoPushToUser(request.realtorId, {
		title: "New client request",
		body: `${clientName} requested to work with you.`,
		data: {
			type: "client_request_created",
			requestId: snapshot.id,
			clientId: request.clientId,
			realtorId: request.realtorId,
			status: request.status,
		},
	});

	if (!sendResult.ok) {
		console.warn(
			`[Push] notifyAgentOnClientRequestCreated failed requestId=${snapshot.id}, realtorId=${request.realtorId}, reason=${sendResult.reason}, details=${sendResult.details || "n/a"}`,
		);
	}
});

// Manual push test endpoint for debugging token/delivery independently from Firestore triggers.
export const sendPushTestToUser = onRequest(async (req, res) => {
	try {
		const userId = String(req.query.userId || req.body?.userId || "").trim();
		if (!userId) {
			res.status(400).json({ ok: false, message: "Missing userId" });
			return;
		}

		const title = String(req.query.title || req.body?.title || "Push Test").trim() || "Push Test";
		const body = String(req.query.body || req.body?.body || "Test notification from Firebase Functions").trim() || "Test notification from Firebase Functions";

		const result = await sendExpoPushToUser(userId, {
			title,
			body,
			data: { type: "push_test", userId },
		});

		res.status(result.ok ? 200 : 400).json({
			ok: result.ok,
			result,
		});
		return;
	} catch (error: any) {
		console.error("sendPushTestToUser failed:", error);
		res.status(500).json({ ok: false, message: error?.message || "Unknown error" });
		return;
	}
});

// Approval/decline transitions: notify client.
export const notifyClientOnClientRequestUpdated = onDocumentUpdated("clientRequests/{requestId}", async (event) => {
	const requestId = typeof event.params?.requestId === "string" ? event.params.requestId : "unknown";
	const before = event.data?.before?.data() as any;
	const after = event.data?.after?.data() as any;
	if (!before || !after) return;

	const beforeStatus = before.status;
	const afterStatus = after.status;
	if (beforeStatus === afterStatus) return;
	if (typeof after?.clientId !== "string") return;

	if (afterStatus === "Approved") {
		const db = getFirestore();
		const realtorSnap = await db.collection("users").doc(after.realtorId).get();
		const realtorName = getDisplayName(realtorSnap.data(), "Your agent");
		await sendExpoPushToUser(after.clientId, {
			title: "Request approved",
			body: `${realtorName} approved your request.`,
			data: {
				type: "client_request_approved",
				requestId,
				clientId: after.clientId,
				realtorId: after.realtorId,
				status: afterStatus,
			},
		});
		return;
	}

	if (afterStatus === "Declined") {
		const reason = typeof after.reason === "string" && after.reason.trim().length > 0
			? ` Reason: ${after.reason.trim()}`
			: "";
		await sendExpoPushToUser(after.clientId, {
			title: "Request declined",
			body: `An agent declined your request.${reason}`,
			data: {
				type: "client_request_declined",
				requestId,
				clientId: after.clientId,
				realtorId: after.realtorId,
				status: afterStatus,
				reason: after.reason || null,
			},
		});
	}
});

// Client released (request removed): notify client they are unassigned.
export const notifyClientOnClientRequestDeleted = onDocumentDeleted("clientRequests/{requestId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;
	const request = snapshot.data() as any;
	if (typeof request?.clientId !== "string") return;

	await sendExpoPushToUser(request.clientId, {
		title: "Agent unassigned",
		body: "You are no longer assigned to an agent.",
		data: {
			type: "client_request_deleted",
			requestId: snapshot.id,
			clientId: request.clientId,
			realtorId: request.realtorId || null,
		},
	});
});

// New offer created by agent: notify client.
export const notifyClientOnOfferCreated = onDocumentCreated("clientOffers/{offerId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;

	const offer = snapshot.data() as any;
	if (typeof offer?.clientId !== "string") return;
	if (offer?.status !== "Offer Made") return;

	await sendExpoPushToUser(offer.clientId, {
		title: "New offer created",
		body: "Your agent created a new offer for you.",
		data: {
			type: "offer_created",
			offerId: snapshot.id,
			clientId: offer.clientId,
			agentId: offer.agentId || null,
			propertyId: offer.propertyId || null,
			status: offer.status,
		},
	});
});

// Offer status/milestone changes: notify both agent and client.
export const notifyOnOfferUpdated = onDocumentUpdated("clientOffers/{offerId}", async (event) => {
	const offerId = typeof event.params?.offerId === "string" ? event.params.offerId : "unknown";
	const before = event.data?.before?.data() as any;
	const after = event.data?.after?.data() as any;
	if (!before || !after) return;

	const recipients = [after.clientId, after.agentId].filter((id) => typeof id === "string" && id.trim().length > 0);
	if (recipients.length === 0) return;

	const changedMilestones: string[] = [];
	const milestoneFields = [
		"dueDiligenceStart",
		"dueDiligenceEnd",
		"inspectionDate",
		"closingDate",
		"earnestMoneyDueDate",
		"earnestMoneyAmountDue",
	];

	for (const fieldName of milestoneFields) {
		const beforeValue = normalizeComparableValue(before[fieldName]);
		const afterValue = normalizeComparableValue(after[fieldName]);
		if (beforeValue !== afterValue && hasMeaningfulValue(after[fieldName])) {
			changedMilestones.push(fieldName);
		}
	}

	const beforeStatus = normalizeComparableValue(before.status);
	const afterStatus = normalizeComparableValue(after.status);
	const statusChanged = beforeStatus !== afterStatus && hasMeaningfulValue(after.status);

	if (!statusChanged && changedMilestones.length === 0) return;

	if (statusChanged) {
		await sendExpoPushToUsers(recipients, {
			title: "Offer status updated",
			body: `Offer status changed to ${after.status}.`,
			data: {
				type: "offer_status_changed",
				offerId,
				clientId: after.clientId || null,
				agentId: after.agentId || null,
				propertyId: after.propertyId || null,
				status: after.status,
			},
		});
	}

	if (changedMilestones.length > 0) {
		await sendExpoPushToUsers(recipients, {
			title: "Offer timeline updated",
			body: `Offer milestone dates were updated (${changedMilestones.join(", ")}).`,
			data: {
				type: "offer_milestones_changed",
				offerId,
				clientId: after.clientId || null,
				agentId: after.agentId || null,
				propertyId: after.propertyId || null,
				changedFields: changedMilestones,
			},
		});
	}
});

// Agent assigned a favorite to a client: notify client.
export const notifyOnAgentAssignedFavorite = onDocumentCreated("clientFavorites/{favoriteId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;

	const favorite = snapshot.data() as any;
	const clientId = typeof favorite?.userId === "string" ? favorite.userId : "";
	const assignedByAgentId = typeof favorite?.assignedByAgentId === "string" ? favorite.assignedByAgentId : "";
	if (!clientId || !assignedByAgentId) return;
	if (clientId === assignedByAgentId) return;

	const db = getFirestore();
	const agentSnap = await db.collection("users").doc(assignedByAgentId).get();
	const agentName = getDisplayName(agentSnap.data(), "Your agent");

	await sendExpoPushToUser(clientId, {
		title: "New favorite from your agent",
		body: `${agentName} assigned a property to your favorites.`,
		data: {
			type: "favorite_assigned_by_agent",
			favoriteId: snapshot.id,
			clientId,
			agentId: assignedByAgentId,
			propertyId: favorite.propertyId || null,
		},
	});
});

// Client help request from map: notify assigned agent.
export const notifyAgentOnHelpRequestCreated = onDocumentCreated("helpRequests/{helpRequestId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;

	const request = snapshot.data() as any;
	if (typeof request?.clientId !== "string" || typeof request?.realtorId !== "string") return;

	const db = getFirestore();
	const clientSnap = await db.collection("users").doc(request.clientId).get();
	const clientName = getDisplayName(clientSnap.data(), "A client");

	const location = request?.searchRegion;
	const hasCoordinates = typeof location?.latitude === "number" && typeof location?.longitude === "number";
	const locationText = hasCoordinates
		? ` Near (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}).`
		: "";

	const result = await sendExpoPushToUser(request.realtorId, {
		title: "Client requested help",
		body: `${clientName} requested help from the map.${locationText}`,
		data: {
			type: "client_help_request",
			helpRequestId: snapshot.id,
			clientId: request.clientId,
			realtorId: request.realtorId,
			status: request.status || "Pending",
			source: request.source || "map_request_help",
		},
	});

	if (!result.ok) {
		console.warn(
			`[Push] notifyAgentOnHelpRequestCreated failed helpRequestId=${snapshot.id}, realtorId=${request.realtorId}, reason=${result.reason}, details=${result.details || "n/a"}`,
		);
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
				// Set is_active to false
				await db.collection("users").doc(user.uid).update({ is_active: false });

				// Remove push token fields
				await db.collection("users").doc(user.uid).update({
					pushTokenStatus: null,
					pushTokenStatusUpdatedAt: null,
					pushTokenStatusDetails: null,
					pushTokenAppOwnership: null,
					profileImageUrl: null,
					bioImageUrl: null
				});

				// Delete all clientFavorites for this user
				const favoritesSnap = await db.collection("clientFavorites").where("userId", "==", user.uid).get();
				for (const favDoc of favoritesSnap.docs) {
					await favDoc.ref.delete();
				}

				// Delete all clientOffers for this user (as client)
				const offersSnap = await db.collection("clientOffers").where("clientId", "==", user.uid).get();
				for (const offerDoc of offersSnap.docs) {
					await offerDoc.ref.delete();
				}

				// Note: clientRequests are NOT deleted (for agent workflow continuity)

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