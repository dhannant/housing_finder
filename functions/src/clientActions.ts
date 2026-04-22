import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

type SearchRegionInput = {
	latitude?: unknown;
	longitude?: unknown;
	latitudeDelta?: unknown;
	longitudeDelta?: unknown;
};

function requireAuthUid(request: { auth?: { uid?: string } }) {
	const uid = request.auth?.uid;
	if (!uid) {
		throw new HttpsError("unauthenticated", "Authentication is required.");
	}
	return uid;
}

function asNonEmptyString(value: unknown, fieldName: string) {
	if (typeof value !== "string" || !value.trim()) {
		throw new HttpsError("invalid-argument", `${fieldName} is required.`);
	}
	return value.trim();
}

function normalizeSearchRegion(input: SearchRegionInput | null | undefined) {
	if (!input || typeof input !== "object") return null;

	const latitude = Number(input.latitude);
	const longitude = Number(input.longitude);
	const latitudeDelta = Number(input.latitudeDelta);
	const longitudeDelta = Number(input.longitudeDelta);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
	if (!Number.isFinite(latitudeDelta) || !Number.isFinite(longitudeDelta)) return null;

	return {
		latitude,
		longitude,
		latitudeDelta,
		longitudeDelta,
	};
}

function normalizeDateField(value: unknown): Date | null {
	if (value === null) return null;
	if (value instanceof Date) return value;
	if (typeof value === "number" || typeof value === "string") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}
	throw new HttpsError("invalid-argument", "Invalid date field value.");
}

function asOptionalTrimmedString(value: unknown) {
	if (typeof value !== "string") return "";
	return value.trim();
}

function asOptionalNumber(value: unknown) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		throw new HttpsError("invalid-argument", "Invalid numeric field value.");
	}
	return parsed;
}

function asAvailabilityWindows(value: unknown) {
	if (!Array.isArray(value) || value.length === 0) {
		throw new HttpsError("invalid-argument", "availability is required.");
	}

	return value.map((window) => {
		const dayOfWeek = asNonEmptyString((window as any)?.dayOfWeek, "availability.dayOfWeek");
		const startTime = asNonEmptyString((window as any)?.startTime, "availability.startTime");
		const endTime = asNonEmptyString((window as any)?.endTime, "availability.endTime");
		return { dayOfWeek, startTime, endTime };
	});
}

async function getRequesterRole(uid: string): Promise<string | null> {
	const db = getFirestore();
	const snap = await db.collection("users").doc(uid).get();
	if (!snap.exists) return null;
	const role = snap.data()?.role;
	return typeof role === "string" ? role : null;
}

function isAgentRole(role: string | null) {
	return role === "Agent" || role === "agent";
}

function isAdminRole(role: string | null) {
	return role === "Admin" || role === "admin";
}

export const createClientRequest = onCall(async (request) => {
	const clientId = requireAuthUid(request);
	const realtorId = asNonEmptyString(request.data?.realtorId, "realtorId");

	const db = getFirestore();
	const pendingSnapshot = await db
		.collection("clientRequests")
		.where("clientId", "==", clientId)
		.where("status", "==", "Pending")
		.limit(1)
		.get();

	if (!pendingSnapshot.empty) {
		return {
			ok: true,
			requestId: pendingSnapshot.docs[0].id,
			status: "Pending",
			existing: true,
		};
	}

	const approvedSnapshot = await db
		.collection("clientRequests")
		.where("clientId", "==", clientId)
		.where("status", "==", "Approved")
		.limit(1)
		.get();

	if (!approvedSnapshot.empty) {
		return {
			ok: true,
			requestId: approvedSnapshot.docs[0].id,
			status: "Approved",
			existing: true,
		};
	}

	const created = await db.collection("clientRequests").add({
		clientId,
		realtorId,
		status: "Pending",
		createdAt: new Date(),
	});

	return { ok: true, requestId: created.id, status: "Pending", existing: false };
});

export const createHelpRequest = onCall(async (request) => {
	const clientId = requireAuthUid(request);
	const realtorId = asNonEmptyString(request.data?.realtorId, "realtorId");
	const sourceRaw = typeof request.data?.source === "string" ? request.data.source.trim() : "";
	const source = sourceRaw || "map_request_help";

	const searchRegion = normalizeSearchRegion(request.data?.searchRegion as SearchRegionInput | undefined);

	const db = getFirestore();
	const created = await db.collection("helpRequests").add({
		clientId,
		realtorId,
		status: "Pending",
		source,
		searchRegion,
		createdAt: new Date(),
	});

	return { ok: true, requestId: created.id };
});

export const assignClientRequest = onCall(async (request) => {
	const realtorId = requireAuthUid(request);
	const clientId = asNonEmptyString(request.data?.clientId, "clientId");
	const db = getFirestore();

	const pendingSnapshot = await db
		.collection("clientRequests")
		.where("clientId", "==", clientId)
		.where("status", "==", "Pending")
		.limit(1)
		.get();

	if (!pendingSnapshot.empty) {
		const pendingDoc = pendingSnapshot.docs[0];
		await pendingDoc.ref.update({
			status: "Approved",
			realtorId,
			updatedAt: new Date(),
		});

		return { ok: true, requestId: pendingDoc.id, updated: true };
	}

	const created = await db.collection("clientRequests").add({
		clientId,
		realtorId,
		status: "Approved",
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	return { ok: true, requestId: created.id, created: true };
});

export const declineClientRequest = onCall(async (request) => {
	const realtorId = requireAuthUid(request);
	const clientId = asNonEmptyString(request.data?.clientId, "clientId");
	const reasonRaw = typeof request.data?.reason === "string" ? request.data.reason.trim() : "";
	const reason = reasonRaw || "No reason provided";

	const db = getFirestore();
	const pendingSnapshot = await db
		.collection("clientRequests")
		.where("clientId", "==", clientId)
		.where("status", "==", "Pending")
		.limit(1)
		.get();

	if (pendingSnapshot.empty) {
		throw new HttpsError("not-found", "No pending request found for this client.");
	}

	const pendingDoc = pendingSnapshot.docs[0];
	await pendingDoc.ref.update({
		status: "Declined",
		reason,
		realtorId,
		updatedAt: new Date(),
	});

	return { ok: true, requestId: pendingDoc.id };
});

export const releaseClientRequests = onCall(async (request) => {
	const realtorId = requireAuthUid(request);
	const clientId = asNonEmptyString(request.data?.clientId, "clientId");
	const db = getFirestore();

	const snapshot = await db
		.collection("clientRequests")
		.where("clientId", "==", clientId)
		.where("realtorId", "==", realtorId)
		.get();

	if (snapshot.empty) {
		return { ok: true, deletedCount: 0 };
	}

	const batch = db.batch();
	for (const requestDoc of snapshot.docs) {
		batch.delete(requestDoc.ref);
	}
	await batch.commit();

	return { ok: true, deletedCount: snapshot.size };
});

export const updateClientOfferDetails = onCall(async (request) => {
	const agentId = requireAuthUid(request);
	const offerId = asNonEmptyString(request.data?.offerId, "offerId");
	const updatesInput = request.data?.updates;

	if (!updatesInput || typeof updatesInput !== "object" || Array.isArray(updatesInput)) {
		throw new HttpsError("invalid-argument", "updates object is required.");
	}

	const updates = updatesInput as Record<string, unknown>;
	const forbiddenFields = ["clientId", "agentId", "propertyId", "createdAt", "offerId"];
	for (const field of forbiddenFields) {
		if (field in updates) {
			throw new HttpsError("invalid-argument", `Field ${field} cannot be updated.`);
		}
	}

	const allowedDateFields = [
		"dueDiligenceStart",
		"dueDiligenceEnd",
		"closingDate",
		"inspectionDate",
		"earnestMoneyDueDate",
	];

	const sanitizedUpdates: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(updates)) {
		if (allowedDateFields.includes(key)) {
			sanitizedUpdates[key] = normalizeDateField(value);
			continue;
		}

		sanitizedUpdates[key] = value;
	}

	const db = getFirestore();
	const offerRef = db.collection("clientOffers").doc(offerId);
	const offerSnap = await offerRef.get();

	if (!offerSnap.exists) {
		throw new HttpsError("not-found", "Offer not found.");
	}

	const existing = offerSnap.data() || {};
	if (existing.agentId !== agentId) {
		throw new HttpsError("permission-denied", "Only the assigned agent can update this offer.");
	}

	await offerRef.update({
		...sanitizedUpdates,
		updatedAt: new Date(),
	});

	return { ok: true, offerId };
});

export const upsertUserSessionState = onCall(async (request) => {
	const userId = requireAuthUid(request);
	const data = request.data || {};
	const payload: Record<string, unknown> = {
		is_active: true,
	};

	if ("pushTokenStatus" in data) payload.pushTokenStatus = data.pushTokenStatus ?? null;
	if ("pushTokenStatusDetails" in data) payload.pushTokenStatusDetails = data.pushTokenStatusDetails ?? null;
	if ("pushTokenAppOwnership" in data) payload.pushTokenAppOwnership = data.pushTokenAppOwnership ?? null;
	payload.pushTokenStatusUpdatedAt = new Date();

	const db = getFirestore();
	await db.collection("users").doc(userId).set(payload, { merge: true });

	return { ok: true };
});

export const saveUserPushToken = onCall(async (request) => {
	const userId = requireAuthUid(request);
	const pushToken = asNonEmptyString(request.data?.pushToken, "pushToken");
	const platform = typeof request.data?.platform === "string" ? request.data.platform.trim() : "";

	const db = getFirestore();
	await db.collection("users").doc(userId).set({
		pushToken,
		expoPushToken: pushToken,
		pushTokenPlatform: platform || null,
		pushTokenUpdatedAt: new Date(),
	}, { merge: true });

	return { ok: true };
});

export const submitClientPropertyListing = onCall(async (request) => {
	const clientId = requireAuthUid(request);
	const branchType = asNonEmptyString(request.data?.branchType, "branchType");
	const preferredContactMethod = asNonEmptyString(request.data?.preferredContactMethod, "preferredContactMethod");
	if (branchType !== "Traditional" && branchType !== "Realty2Cash") {
		throw new HttpsError("invalid-argument", "Unsupported branch type.");
	}
	if (!["Call", "Text", "Email"].includes(preferredContactMethod)) {
		throw new HttpsError("invalid-argument", "Unsupported preferred contact method.");
	}

	const db = getFirestore();
	const assignmentSnapshot = await db
		.collection("clientRequests")
		.where("clientId", "==", clientId)
		.where("status", "==", "Approved")
		.limit(1)
		.get();

	const assignedAgentId = assignmentSnapshot.empty
		? null
		: (assignmentSnapshot.docs[0].data()?.realtorId ?? null);
	const now = new Date();

	const payload = {
		clientId,
		assignedAgentId,
		branchType,
		status: assignedAgentId ? "Assigned" : "Submitted",
		addressLine1: asNonEmptyString(request.data?.addressLine1, "addressLine1"),
		addressLine2: asOptionalTrimmedString(request.data?.addressLine2),
		city: asNonEmptyString(request.data?.city, "city"),
		state: asOptionalTrimmedString(request.data?.state),
		postalCode: asNonEmptyString(request.data?.postalCode, "postalCode"),
		propertyType: asOptionalTrimmedString(request.data?.propertyType),
		bedrooms: asOptionalNumber(request.data?.bedrooms),
		bathrooms: asOptionalNumber(request.data?.bathrooms),
		squareFeet: asOptionalNumber(request.data?.squareFeet),
		lotSizeSqft: asOptionalNumber(request.data?.lotSizeSqft),
		yearBuilt: asOptionalNumber(request.data?.yearBuilt),
		timelineToSell: asOptionalTrimmedString(request.data?.timelineToSell),
		notes: asOptionalTrimmedString(request.data?.notes),
		preferredContactMethod,
		contactPhone: asOptionalTrimmedString(request.data?.contactPhone),
		contactEmail: asOptionalTrimmedString(request.data?.contactEmail),
		availability: asAvailabilityWindows(request.data?.availability),
		createdAt: now,
		updatedAt: now,
		submittedAt: now,
	};

	const created = await db.collection("clientPropertyListings").add(payload);
	return { ok: true, listingId: created.id };
});

export const createClientOffer = onCall(async (request) => {
	const agentId = requireAuthUid(request);
	const clientId = asNonEmptyString(request.data?.clientId, "clientId");
	const propertyId = asNonEmptyString(request.data?.propertyId, "propertyId");
	const status = asNonEmptyString(request.data?.status, "status");

	const role = await getRequesterRole(agentId);
	if (!isAgentRole(role) && !isAdminRole(role)) {
		throw new HttpsError("permission-denied", "Only agents can create offers.");
	}

	const db = getFirestore();
	const assignment = await db
		.collection("clientRequests")
		.where("clientId", "==", clientId)
		.where("realtorId", "==", agentId)
		.where("status", "==", "Approved")
		.limit(1)
		.get();

	if (assignment.empty && !isAdminRole(role)) {
		throw new HttpsError("permission-denied", "You are not assigned to this client.");
	}

	const clientOfferSnapshot = await db
		.collection("clientOffers")
		.where("clientId", "==", clientId)
		.get();
	for (const offerDoc of clientOfferSnapshot.docs) {
		const offer = offerDoc.data();
		if (offer.status !== "Offer Withdrawn" && offer.status !== "Offer Declined") {
			throw new HttpsError("failed-precondition", "Client already has an active offer.");
		}
	}

	const propertyOfferSnapshot = await db
		.collection("clientOffers")
		.where("propertyId", "==", propertyId)
		.get();
	for (const offerDoc of propertyOfferSnapshot.docs) {
		const offer = offerDoc.data();
		if (offer.status !== "Offer Withdrawn" && offer.status !== "Offer Declined") {
			throw new HttpsError("failed-precondition", "Property already has an active offer.");
		}
	}

	const now = new Date();
	const created = await db.collection("clientOffers").add({
		clientId,
		agentId,
		propertyId,
		status,
		createdAt: now,
		updatedAt: now,
	});

	return { ok: true, offerId: created.id };
});

export const appendOfferFileMetadata = onCall(async (request) => {
	const actorUid = requireAuthUid(request);
	const offerId = asNonEmptyString(request.data?.offerId, "offerId");
	const url = asNonEmptyString(request.data?.url, "url");
	const name = asOptionalTrimmedString(request.data?.name) || null;
	const metadata = request.data?.metadata && typeof request.data.metadata === "object" && !Array.isArray(request.data.metadata)
		? request.data.metadata as Record<string, unknown>
		: {};

	const db = getFirestore();
	const offerRef = db.collection("clientOffers").doc(offerId);
	const offerSnap = await offerRef.get();
	if (!offerSnap.exists) {
		throw new HttpsError("not-found", "Offer not found.");
	}

	const offer = offerSnap.data() || {};
	const isAllowed = offer.agentId === actorUid || offer.clientId === actorUid;
	if (!isAllowed) {
		throw new HttpsError("permission-denied", "You are not allowed to update this offer.");
	}

	await offerRef.update({
		files: FieldValue.arrayUnion({
			url,
			name,
			uploadedAt: new Date(),
			...metadata,
		}),
		updatedAt: new Date(),
	});

	return { ok: true };
});