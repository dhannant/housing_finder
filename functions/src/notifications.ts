import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";

const expoPushApiUrl = "https://exp.host/--/api/v2/push/send";

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
	ticketId?: string;
	details?: string;
};

// ===== Push Utilities =====

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

function formatShowingBlock(block: any): string {
	const start = typeof block?.start === "string" ? block.start.trim() : "";
	const end = typeof block?.end === "string" ? block.end.trim() : "";
	if (!start && !end) return "a requested time";
	if (start && end) return `${start} - ${end}`;
	return start || end;
}

type UserTokens = { pushToken: string | null; fcmToken: string | null };

async function getUserTokens(userId: string): Promise<UserTokens> {
	if (!userId) return { pushToken: null, fcmToken: null };
	const db = getFirestore();
	const userSnap = await db.collection("users").doc(userId).get();
	if (!userSnap.exists) return { pushToken: null, fcmToken: null };
	const data = userSnap.data();
	const pushToken = typeof data?.pushToken === "string" && data.pushToken.trim().length > 0
		? data.pushToken.trim() : null;
	const fcmToken = typeof data?.fcmToken === "string" && data.fcmToken.trim().length > 0
		? data.fcmToken.trim() : null;
	return { pushToken, fcmToken };
}

function isLikelyExpoPushToken(token: string): boolean {
	return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendExpoPushToUser(userId: string, payload: NotificationPayload): Promise<PushSendResult> {
	const { pushToken, fcmToken } = await getUserTokens(userId);

	// Android path: send directly via Firebase Admin SDK using native FCM device token
	if (fcmToken) {
		try {
			await getMessaging().send({
				token: fcmToken,
				notification: { title: payload.title, body: payload.body },
				data: payload.data ? Object.fromEntries(
					Object.entries(payload.data).map(([k, v]) => [k, String(v)])
				) : {},
				android: { priority: "high", notification: { channelId: "default", sound: "default" } },
			});
			console.log(`[Push] FCM direct sent user=${userId}, title=${payload.title}`);
			return {
				ok: true,
				reason: "sent",
				userId,
				tokenPreview: `${fcmToken.slice(0, 10)}...`,
				details: "deliveryPath=fcm_direct",
			};
		} catch (error: any) {
			console.warn(`[Push] FCM direct send failed user=${userId}:`, error?.message || error);
			return { ok: false, reason: "exception", userId, details: error?.message || String(error) };
		}
	}

	// iOS path: send via Expo push API using Expo push token
	const token = pushToken;
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
			channelId: "default",
			priority: "high",
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
	const ticketRaw = json?.data;
	const ticket = Array.isArray(ticketRaw) ? ticketRaw[0] : ticketRaw;
	const ticketId = typeof ticket?.id === "string" ? ticket.id : undefined;
	const ticketStatus = typeof ticket?.status === "string" ? ticket.status : "unknown";
	const isExpoError = ticketStatus === "error";
	if (isExpoError) {
		const expoMessage = ticket?.message || "Unknown Expo push ticket error";
		console.warn(`[Push] Expo ticket error user=${userId}, message=${expoMessage}`);
		return {
			ok: false,
			reason: "expo_error",
			userId,
			tokenPreview: `${token.slice(0, 10)}...`,
			ticketId,
			details: String(expoMessage),
		};
	}

	console.log(`[Push] Sent user=${userId}, title=${payload.title}, ticketId=${ticketId || "n/a"}, ticketStatus=${ticketStatus}`);

	return {
		ok: true,
		reason: "sent",
		userId,
		tokenPreview: `${token.slice(0, 10)}...`,
		ticketId,
		details: ticketId
			? "deliveryPath=expo"
			: `deliveryPath=expo; No ticket id in Expo response. ticketStatus=${ticketStatus}`,
	};
}

async function getExpoPushReceipts(ticketIds: string[]) {
	const ids = Array.from(new Set(ticketIds.filter((id) => typeof id === "string" && id.trim().length > 0)));
	if (ids.length === 0) {
		return { ok: false, message: "No valid ticket IDs provided." };
	}

	const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({ ids }),
	});

	const body = await response.json().catch(() => null);
	return {
		ok: response.ok,
		status: response.status,
		body,
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

// ===== Notification Triggers =====

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

// New client property listing: notify the assigned agent.
export const notifyAgentOnClientPropertyListingCreated = onDocumentCreated("clientPropertyListings/{listingId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;

	const listing = snapshot.data() as any;
	if (typeof listing?.assignedAgentId !== "string" || typeof listing?.clientId !== "string") return;

	const db = getFirestore();
	const clientSnap = await db.collection("users").doc(listing.clientId).get();
	const clientName = getDisplayName(clientSnap.data(), "A client");

	const sendResult = await sendExpoPushToUser(listing.assignedAgentId, {
		title: "Client listing assistance requested",
		body: `${clientName} submitted a home listing assistance request.`,
		data: {
			type: "client_property_listing_created",
			listingId: snapshot.id,
			clientId: listing.clientId,
			assignedAgentId: listing.assignedAgentId,
			status: listing.status || "Submitted",
		},
	});

	if (!sendResult.ok) {
		console.warn(
			`[Push] notifyAgentOnClientPropertyListingCreated failed listingId=${snapshot.id}, assignedAgentId=${listing.assignedAgentId}, reason=${sendResult.reason}, details=${sendResult.details || "n/a"}`,
		);
	}
});

// New client property listing: notify the client that their listing was received.
export const notifyClientOnPropertyListingCreated = onDocumentCreated("clientPropertyListings/{listingId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;

	const listing = snapshot.data() as any;
	if (typeof listing?.clientId !== "string") return;

	const hasAgent = typeof listing?.assignedAgentId === "string";
	const body = hasAgent
		? "Your home listing request was received and assigned to your agent."
		: "Your home listing request was received. An agent will be in touch soon.";

	const sendResult = await sendExpoPushToUser(listing.clientId, {
		title: "Listing submitted",
		body,
		data: {
			type: "client_property_listing_submitted",
			listingId: snapshot.id,
			clientId: listing.clientId,
			assignedAgentId: listing.assignedAgentId ?? null,
			status: listing.status || "Submitted",
		},
	});

	if (!sendResult.ok) {
		console.warn(
			`[Push] notifyClientOnPropertyListingCreated failed listingId=${snapshot.id}, clientId=${listing.clientId}, reason=${sendResult.reason}, details=${sendResult.details || "n/a"}`,
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
		const userTokens = await getUserTokens(userId);

		const result = await sendExpoPushToUser(userId, {
			title,
			body,
			data: { type: "push_test", userId },
		});

		res.status(result.ok ? 200 : 400).json({
			ok: result.ok,
			debug: {
				hasFcmToken: Boolean(userTokens.fcmToken),
				hasExpoPushToken: Boolean(userTokens.pushToken),
				fcmPreview: userTokens.fcmToken ? `${userTokens.fcmToken.slice(0, 10)}...` : null,
				expoPreview: userTokens.pushToken ? `${userTokens.pushToken.slice(0, 10)}...` : null,
			},
			result,
		});
		return;
	} catch (error: any) {
		console.error("sendPushTestToUser failed:", error);
		res.status(500).json({ ok: false, message: error?.message || "Unknown error" });
		return;
	}
});

// Manual receipt check endpoint for debugging Expo ticket outcomes.
export const getPushReceiptStatus = onRequest(async (req, res) => {
	try {
		const ticketIdParam = String(req.query.ticketId || req.body?.ticketId || "").trim();
		const ticketIdsParam = String(req.query.ticketIds || req.body?.ticketIds || "").trim();

		const ids = [
			...ticketIdParam ? [ticketIdParam] : [],
			...ticketIdsParam ? ticketIdsParam.split(",").map((id) => id.trim()) : [],
		].filter((id) => id.length > 0);

		if (ids.length === 0) {
			res.status(400).json({
				ok: false,
				message: "Provide ticketId or ticketIds (comma-separated).",
			});
			return;
		}

		const receiptResponse = await getExpoPushReceipts(ids);
		res.status(receiptResponse.ok ? 200 : 400).json(receiptResponse);
		return;
	} catch (error: any) {
		console.error("getPushReceiptStatus failed:", error);
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

// New showing request created by client: notify assigned agent.
export const notifyAgentOnShowingRequestCreated = onDocumentCreated("showingRequests/{showingRequestId}", async (event) => {
	const snapshot = event.data;
	if (!snapshot) return;

	const showingRequest = snapshot.data() as any;
	if (showingRequest?.status !== "pending") return;
	if (typeof showingRequest?.realtorId !== "string" || typeof showingRequest?.clientId !== "string") return;

	const db = getFirestore();
	const clientSnap = await db.collection("users").doc(showingRequest.clientId).get();
	const clientName = getDisplayName(clientSnap.data(), "A client");

	const sendResult = await sendExpoPushToUser(showingRequest.realtorId, {
		title: "New showing request",
		body: `${clientName} requested a home showing.`,
		data: {
			type: "showing_request_created",
			showingRequestId: snapshot.id,
			propertyId: showingRequest.propertyId || null,
			clientId: showingRequest.clientId,
			realtorId: showingRequest.realtorId,
			status: showingRequest.status,
		},
	});

	if (!sendResult.ok) {
		console.warn(
			`[Push] notifyAgentOnShowingRequestCreated failed showingRequestId=${snapshot.id}, realtorId=${showingRequest.realtorId}, reason=${sendResult.reason}, details=${sendResult.details || "n/a"}`,
		);
	}
});

// Showing request status changes: notify client.
export const notifyClientOnShowingRequestUpdated = onDocumentUpdated("showingRequests/{showingRequestId}", async (event) => {
	const showingRequestId = typeof event.params?.showingRequestId === "string" ? event.params.showingRequestId : "unknown";
	const before = event.data?.before?.data() as any;
	const after = event.data?.after?.data() as any;
	if (!before || !after) return;

	if (before.status === after.status) return;
	if (typeof after?.clientId !== "string") return;

	if (after.status === "confirmed") {
		const blocks = Array.isArray(after.requestedBlocks) ? after.requestedBlocks : [];
		const confirmedIndex = Number(after.confirmedBlockIndex);
		const confirmedBlock = Number.isInteger(confirmedIndex) && confirmedIndex >= 0 && confirmedIndex < blocks.length
			? blocks[confirmedIndex]
			: null;
		const confirmedLabel = formatShowingBlock(confirmedBlock);

		await sendExpoPushToUser(after.clientId, {
			title: "Showing confirmed",
			body: `Your showing is confirmed for ${confirmedLabel}.`,
			data: {
				type: "showing_request_confirmed",
				showingRequestId,
				propertyId: after.propertyId || null,
				clientId: after.clientId,
				realtorId: after.realtorId || null,
				status: after.status,
				confirmedBlockIndex: after.confirmedBlockIndex ?? null,
			},
		});
		return;
	}

	if (after.status === "declined") {
		const reason = typeof after.agentNotes === "string" && after.agentNotes.trim().length > 0
			? ` Reason: ${after.agentNotes.trim()}`
			: "";

		await sendExpoPushToUser(after.clientId, {
			title: "Showing request declined",
			body: `Your showing request was declined.${reason}`,
			data: {
				type: "showing_request_declined",
				showingRequestId,
				propertyId: after.propertyId || null,
				clientId: after.clientId,
				realtorId: after.realtorId || null,
				status: after.status,
				agentNotes: after.agentNotes || null,
			},
		});
	}
});
