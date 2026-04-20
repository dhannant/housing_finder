import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

// ===== User Activity Maintenance =====

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
					bioImageUrl: null,
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
export const deactivateInactiveUsers = onSchedule("every 24 hours", async (_event) => {
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
export const deactivateUsersAfterCloseDate = onSchedule("every 24 hours", async (_event) => {
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
