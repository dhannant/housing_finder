type IngestableProperty = Record<string, any>;

function getPropertyDocId(property: IngestableProperty): string | null {
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

export async function upsertPropertiesForPage(
	db: FirebaseFirestore.Firestore,
	properties: IngestableProperty[],
	pullDate: string,
	runId: string,
	apiSource: string,
): Promise<{ upserted: number; skippedNoPropertyId: number }> {
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

		const lat = property?.location?.address?.coordinate?.lat ??
						property?.latitude ??
						null;
		const lon = property?.location?.address?.coordinate?.lon ??
						property?.longitude ??
						null;

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
			apiSource,
			apiActive: true,
			latitude: lat,
			longitude: lon,
		}, { merge: true });

		upserted += 1;
	}

	if (upserted > 0) {
		try {
			await firstSeenBatch.commit();
		} catch {
			console.log("apiFirstSeenDate already exists for one or more docs in this batch; skipping first-seen initialization.");
		}
		await writeBatch.commit();
	}

	return { upserted, skippedNoPropertyId };
}
