/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
// imports removed: onRequest, logger (unused)

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

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const deactivateInactiveUsers = onSchedule("every hour", async (event) => {
	const db = getFirestore();
	const auth = getAuth();
	// const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
	const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
 
	// Get all users from Firebase Auth
	const listUsersResult = await auth.listUsers();
	for (const user of listUsersResult.users) {
	  if (user.metadata.lastSignInTime) {
		 const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
		 if (lastSignIn < oneWeekAgo) {
			// Set is_active to false in Firestore users collection
			await db.collection("users").doc(user.uid).update({is_active: false});
		 }
	  }
	}
 });