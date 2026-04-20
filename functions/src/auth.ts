import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

// ===== Registration Rate Limiting =====
// Firestore collection: registrationAttempts
// Document ID: lowercased email
// Fields: attemptCount (number), lockoutUntil (timestamp)

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

function getRoleFromEmail(email: string): "Client" | "Agent" | "Admin" {
	const normalized = email.trim().toLowerCase();

	if (normalized.endsWith("@hitsolutions.com")) {
		return "Admin";
	}

	const match = normalized.match(/@leadingedge[a-z0-9-]*\.com$/);
	return match ? "Agent" : "Client";
}

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

// Create/merge a user profile document for a newly registered authenticated user.
export const createRegistrationProfile = onCall(async (request) => {
	if (!request.auth?.uid) {
		throw new Error("unauthenticated");
	}

	const uid = request.auth.uid;
	const email = String(request.auth.token.email || "").trim().toLowerCase();
	if (!email) {
		throw new Error("missing_email");
	}

	const firstName = String(request.data?.firstName || "").trim();
	const lastName = String(request.data?.lastName || "").trim();
	const phoneNumber = String(request.data?.phoneNumber || "").trim();

	if (!firstName || !lastName || !phoneNumber) {
		throw new Error("missing_required_fields");
	}

	const db = getFirestore();
	const detectedRole = getRoleFromEmail(email);

	await db.collection("users").doc(uid).set({
		firstName,
		lastName,
		phoneNumber,
		email,
		role: detectedRole,
		is_active: true,
		createdAt: new Date(),
	}, { merge: true });

	return { ok: true, role: detectedRole };
});
