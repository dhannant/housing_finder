import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

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

function asOptionalTrimmedString(value: unknown) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
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

async function canManageClient(actorUid: string, targetUserId: string): Promise<boolean> {
	if (actorUid === targetUserId) return true;

	const role = await getRequesterRole(actorUid);
	if (isAdminRole(role)) return true;
	if (!isAgentRole(role)) return false;

	const db = getFirestore();
	const assignment = await db
		.collection("clientRequests")
		.where("clientId", "==", targetUserId)
		.where("realtorId", "==", actorUid)
		.where("status", "==", "Approved")
		.limit(1)
		.get();

	return !assignment.empty;
}

async function deleteCollectionDocsByField(collectionName: string, fieldName: string, value: string) {
	const db = getFirestore();
	const snapshot = await db.collection(collectionName).where(fieldName, "==", value).get();
	if (snapshot.empty) return 0;

	const batch = db.batch();
	for (const document of snapshot.docs) {
		batch.delete(document.ref);
	}
	await batch.commit();
	return snapshot.size;
}

export const toggleFavorite = onCall(async (request) => {
	const actorUid = requireAuthUid(request);
	const targetUserId = asNonEmptyString(request.data?.userId, "userId");
	const propertyId = asNonEmptyString(request.data?.propertyId, "propertyId");

	const allowed = await canManageClient(actorUid, targetUserId);
	if (!allowed) {
		throw new HttpsError("permission-denied", "You are not allowed to modify favorites for this user.");
	}

	const db = getFirestore();
	const snapshot = await db
		.collection("clientFavorites")
		.where("userId", "==", targetUserId)
		.where("propertyId", "==", propertyId)
		.get();

	if (!snapshot.empty) {
		const batch = db.batch();
		for (const favoriteDoc of snapshot.docs) {
			batch.delete(favoriteDoc.ref);
		}
		await batch.commit();
		return { ok: true, isFavorite: false, removed: snapshot.size };
	}

	const favoriteDocId = `${targetUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}__${propertyId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
	const payload: Record<string, unknown> = {
		userId: targetUserId,
		propertyId,
		savedAt: new Date(),
	};

	if (actorUid !== targetUserId) {
		payload.assignedByAgentId = actorUid;
		payload.assignedAt = new Date();
	}

	await db.collection("clientFavorites").doc(favoriteDocId).set(payload, { merge: true });
	return { ok: true, isFavorite: true, favoriteDocId };
});

export const deleteFavorite = onCall(async (request) => {
	const actorUid = requireAuthUid(request);
	const favoriteDocId = asNonEmptyString(request.data?.favoriteDocId, "favoriteDocId");

	const db = getFirestore();
	const favoriteRef = db.collection("clientFavorites").doc(favoriteDocId);
	const favoriteSnap = await favoriteRef.get();
	if (!favoriteSnap.exists) {
		return { ok: true, deleted: false };
	}

	const favorite = favoriteSnap.data() || {};
	const ownerId = typeof favorite.userId === "string" ? favorite.userId : "";
	if (!ownerId) {
		throw new HttpsError("failed-precondition", "Favorite document is missing user ownership data.");
	}

	const allowed = await canManageClient(actorUid, ownerId);
	if (!allowed) {
		throw new HttpsError("permission-denied", "You are not allowed to remove this favorite.");
	}

	await favoriteRef.delete();
	return { ok: true, deleted: true };
});

export const updateOwnProfile = onCall(async (request) => {
	const userId = requireAuthUid(request);
	const firstName = asNonEmptyString(request.data?.firstName, "firstName");
	const lastName = asNonEmptyString(request.data?.lastName, "lastName");
	const email = asNonEmptyString(request.data?.email, "email").toLowerCase();
	const phoneNumber = asOptionalTrimmedString(request.data?.phoneNumber);
	const teamMemberId = asOptionalTrimmedString(request.data?.teamMemberId);
	const profileImageUrl = asOptionalTrimmedString(request.data?.profileImageUrl);
	const bioImageUrl = asOptionalTrimmedString(request.data?.bioImageUrl);

	const auth = getAuth();
	const existingAuthUser = await auth.getUser(userId);
	if ((existingAuthUser.email || "").trim().toLowerCase() !== email) {
		await auth.updateUser(userId, { email });
	}

	const db = getFirestore();
	await db.collection("users").doc(userId).set({
		firstName,
		lastName,
		email,
		phoneNumber,
		teamMemberId,
		profileImageUrl,
		bioImageUrl,
		updatedAt: new Date(),
	}, { merge: true });

	return { ok: true };
});

export const deleteOwnProfile = onCall(async (request) => {
	const userId = requireAuthUid(request);
	const db = getFirestore();

	await deleteCollectionDocsByField("clientFavorites", "userId", userId);
	await deleteCollectionDocsByField("clientOffers", "clientId", userId);
	await deleteCollectionDocsByField("clientOffers", "agentId", userId);
	await deleteCollectionDocsByField("clientRequests", "clientId", userId);
	await deleteCollectionDocsByField("clientRequests", "realtorId", userId);
	await deleteCollectionDocsByField("helpRequests", "clientId", userId);
	await deleteCollectionDocsByField("helpRequests", "realtorId", userId);
	await deleteCollectionDocsByField("clientPropertyListings", "clientId", userId);
	await deleteCollectionDocsByField("clientPropertyListings", "assignedAgentId", userId);

	await db.collection("users").doc(userId).delete();
	await getAuth().deleteUser(userId);

	return { ok: true };
});