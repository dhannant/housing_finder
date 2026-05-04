import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

interface CalendarEventRange {
	startDate: string; // YYYY-MM-DD
	endDate: string;   // YYYY-MM-DD
	type: "due_diligence";
	color: string;
	title: string;
	description?: string;
	sourceId: string;
}

interface CalendarEventPoint {
	date: string; // YYYY-MM-DD
	type: "inspection" | "closing" | "showing";
	color: string;
	title: string;
	description?: string;
	time?: string;
	sourceId: string;
}

interface GetCalendarEventsResponse {
	ranges: CalendarEventRange[];
	points: CalendarEventPoint[];
}

interface GetCalendarEventsInput {
	role: string;
	activeOfferId?: string | null;
}

function requireAuthUid(request: { auth?: { uid?: string } }): string {
	const uid = request.auth?.uid;
	if (!uid) throw new HttpsError("unauthenticated", "Authentication is required.");
	return uid;
}

function formatAdminDate(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === "string") return value.split("T")[0];
	if (value instanceof Date) return value.toISOString().split("T")[0];
	const v = value as any;
	if (v._seconds != null) return new Date(v._seconds * 1000).toISOString().split("T")[0];
	if (v.seconds != null) return new Date(v.seconds * 1000).toISOString().split("T")[0];
	return null;
}

function extractDateFromDateTimeString(s: string): string | null {
	// Format: "MM/DD/YYYY HH:MM AM/PM"
	const parts = s.split(" ");
	if (!parts[0]) return null;
	const [month, day, year] = parts[0].split("/");
	if (!month || !day || !year) return null;
	return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractTimeFromDateTimeString(s: string): string | null {
	const parts = s.split(" ");
	return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : null;
}

export const getCalendarEvents = onCall<GetCalendarEventsInput>(async (request) => {
	const uid = requireAuthUid(request);
	const { role, activeOfferId } = request.data;
	const db = getFirestore();
	const ranges: CalendarEventRange[] = [];
	const points: CalendarEventPoint[] = [];

	if (role === "agent") {
		// ── Offers ───────────────────────────────────────────────────────────
		const offersSnap = await db.collection("clientOffers").where("agentId", "==", uid).get();
		const offerDocs = offersSnap.docs.map((offerDoc) => ({ id: offerDoc.id, data: offerDoc.data() }));

		// ── Confirmed showings ────────────────────────────────────────────────
		const showingsSnap = await db
			.collection("showingRequests")
			.where("realtorId", "==", uid)
			.where("status", "==", "confirmed")
			.get();

		const propertyIds = new Set<string>();
		const clientIds = new Set<string>();
		const showingDocs: { id: string; data: FirebaseFirestore.DocumentData }[] = [];

		for (const s of showingsSnap.docs) {
			const d = s.data();
			if (d.confirmedBlockIndex !== null && d.confirmedBlockIndex !== undefined) {
				showingDocs.push({ id: s.id, data: d });
				if (d.propertyId) propertyIds.add(String(d.propertyId));
				if (d.clientId) clientIds.add(String(d.clientId));
			}
		}

		for (const { data: d } of offerDocs) {
			if (d.propertyId) propertyIds.add(String(d.propertyId));
			if (d.clientId) clientIds.add(String(d.clientId));
		}

		// Parallel-fetch property addresses and client names
		const addressById: Record<string, string> = {};
		const nameById: Record<string, string> = {};

		await Promise.all([
			...[...propertyIds].map(async (pid) => {
				try {
					const pdoc = await db.collection("properties").doc(pid).get();
					if (pdoc.exists) {
						const pd = pdoc.data()!;
						const line = pd.location?.address?.line ?? pd.address ?? "";
						const city = pd.location?.address?.city ?? "";
						const state = pd.location?.address?.state_code ?? "";
						addressById[pid] = [line, city, state].filter(Boolean).join(", ") || pid;
					} else {
						addressById[pid] = pid;
					}
				} catch {
					addressById[pid] = pid;
				}
			}),
			...[...clientIds].map(async (cid) => {
				try {
					const cdoc = await db.collection("users").doc(cid).get();
					if (cdoc.exists) {
						const cd = cdoc.data()!;
						nameById[cid] = `${cd.firstName ?? ""} ${cd.lastName ?? ""}`.trim() || cid;
					} else {
						nameById[cid] = cid;
					}
				} catch {
					nameById[cid] = cid;
				}
			}),
		]);

		for (const { id, data: d } of offerDocs) {
			const ddStart = formatAdminDate(d.dueDiligenceStart);
			const ddEnd = formatAdminDate(d.dueDiligenceEnd);
			const offerDescParts = [
				d.propertyId ? `Property: ${addressById[String(d.propertyId)] ?? String(d.propertyId)}` : null,
				d.clientId ? `Client: ${nameById[String(d.clientId)] ?? String(d.clientId)}` : null,
			].filter(Boolean);
			const offerDescription = offerDescParts.length > 0 ? offerDescParts.join("\n") : undefined;

			if (ddStart && ddEnd) {
				ranges.push({
					startDate: ddStart,
					endDate: ddEnd,
					type: "due_diligence",
					color: "#FFF9C4",
					title: "Due Diligence",
					description: offerDescription,
					sourceId: id,
				});
			}

			const inspDate = formatAdminDate(d.inspectionDate);
			if (inspDate) {
				points.push({ date: inspDate, type: "inspection", color: "#1976D2", title: "Inspection", description: offerDescription, sourceId: id });
			}

			const closeDate = formatAdminDate(d.closingDate);
			if (closeDate) {
				points.push({ date: closeDate, type: "closing", color: "#F44336", title: "Closing", description: offerDescription, sourceId: id });
			}
		}

		for (const { id, data: d } of showingDocs) {
			const block = d.requestedBlocks?.[d.confirmedBlockIndex];
			if (!block) continue;
			const dateStr = extractDateFromDateTimeString(String(block.start ?? ""));
			if (!dateStr) continue;
			const time = extractTimeFromDateTimeString(String(block.start ?? "")) ?? undefined;
			const address = d.propertyId ? (addressById[d.propertyId] ?? undefined) : undefined;
			const clientName = d.clientId ? (nameById[d.clientId] ?? undefined) : undefined;
			const descParts = [
				address ? `Property: ${address}` : null,
				clientName ? `Client: ${clientName}` : null,
			].filter(Boolean);
			points.push({
				date: dateStr,
				type: "showing",
				color: "#4CAF50",
				title: "Confirmed Showing",
				description: descParts.length > 0 ? descParts.join("\n") : undefined,
				time,
				sourceId: id,
			});
		}
	} else if (role === "client" && activeOfferId) {
		const offerDoc = await db.collection("clientOffers").doc(activeOfferId).get();
		if (!offerDoc.exists) throw new HttpsError("not-found", "Offer not found.");
		const d = offerDoc.data()!;
		if (d.clientId !== uid) throw new HttpsError("permission-denied", "Not your offer.");

		const ddStart = formatAdminDate(d.dueDiligenceStart);
		const ddEnd = formatAdminDate(d.dueDiligenceEnd);
		if (ddStart && ddEnd) {
			ranges.push({
				startDate: ddStart,
				endDate: ddEnd,
				type: "due_diligence",
				color: "#FFF9C4",
				title: "Due Diligence",
				sourceId: offerDoc.id,
			});
		}

		const inspDate = formatAdminDate(d.inspectionDate);
		if (inspDate) {
			points.push({ date: inspDate, type: "inspection", color: "#1976D2", title: "Inspection", sourceId: offerDoc.id });
		}

		const closeDate = formatAdminDate(d.closingDate);
		if (closeDate) {
			points.push({ date: closeDate, type: "closing", color: "#F44336", title: "Closing", sourceId: offerDoc.id });
		}
	}

	return { ranges, points } as GetCalendarEventsResponse;
});
