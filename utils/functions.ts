import { db } from '@/components/firebaseConfig';
import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Alert, Linking, Platform } from 'react-native';
import * as interfaces from './interfaces';

/**
 * Data access helpers for Firestore-backed app workflows.
 */

const toFavoritePhotos = (photos: any): { href: string }[] => {
	if (!Array.isArray(photos)) return [];
	return photos
		.map((photo) => {
			if (typeof photo === 'string') return { href: photo };
			if (photo && typeof photo.href === 'string') return { href: photo.href };
			return null;
		})
		.filter(Boolean) as { href: string }[];
};

export const mapPropertyDocToFavorite = (
	propertyId: string,
	data: any,
	favoriteDocId: string,
	userId = '',
	savedAt: any = null,
): interfaces.FavoriteProperty => {
	const photos = toFavoritePhotos(data?.photos);
	const primaryPhoto = data?.primary_photo?.href ?? data?.primaryPhoto ?? photos[0]?.href ?? null;

	const addressLine = data?.location?.address?.line ?? data?.address ?? 'Address not available';
	const city = data?.location?.address?.city ?? '';
	const state = data?.location?.address?.state_code ?? '';
	const fullAddress = [addressLine, city, state].filter(Boolean).join(', ') || addressLine;

	const latitude = data?.location?.address?.coordinate?.lat ?? data?.latitude ?? null;
	const longitude = data?.location?.address?.coordinate?.lon ?? data?.longitude ?? null;

	return {
		id: favoriteDocId,
		userId,
		propertyId,
		savedAt,
		price: data?.list_price ?? data?.price?.list_price ?? data?.price?.value ?? data?.price ?? null,
		address: fullAddress,
		beds: data?.description?.beds ?? data?.beds ?? null,
		baths: data?.description?.baths ?? data?.baths ?? null,
		latitude: typeof latitude === 'number' ? latitude : latitude !== null ? Number(latitude) : null,
		longitude: typeof longitude === 'number' ? longitude : longitude !== null ? Number(longitude) : null,
		lot_sqft: data?.description?.lot_sqft ?? data?.lot_sqft ?? null,
		status: data?.status ?? data?.status_code ?? null,
		sqft: data?.description?.sqft ?? data?.sqft ?? null,
		type: data?.description?.type ?? data?.type ?? null,
		photos,
		primaryPhoto,
	};
};

export const makeFavoriteDocId = (userId: string, propertyId: string): string => {
	const safeUser = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
	const safeProperty = String(propertyId).replace(/[^a-zA-Z0-9_-]/g, '_');
	return `${safeUser}__${safeProperty}`;
};

export const fetchUserData = async (userId: string): Promise<interfaces.UserData | null> => {
	try {
		if (!userId) return null;
		const userRef = doc(db, 'users', userId);
		const userSnap = await getDoc(userRef);
		if (!userSnap.exists()) {
			console.error(`[fetchUserData] ✗ User document not found for userId: ${userId}`);
			return null;
		}
		return { id: userSnap.id, ...userSnap.data() } as interfaces.UserData;
	} catch (error) {
		// Only log explicit user info, not the full user object
		let userInfo = '';
		try {
			// Dynamically import auth to avoid circular deps
			const { auth } = await import('@/components/firebaseConfig');
			const currentUser = auth.currentUser;
			if (currentUser) {
				userInfo = ` (auth.uid=${currentUser.uid}, email=${currentUser.email}, displayName=${currentUser.displayName})`;
			}
		} catch {}
		console.error(`[fetchUserData] ✗ Error fetching user ${userId}${userInfo}:`, error);
		return null;
	}
};

export const fetchPropertyData = async (
	propertyId: string,
	_clientId?: string,
): Promise<interfaces.FavoriteProperty | null> => {
	try {
		if (!propertyId) return null;
		const propertyRef = doc(db, 'properties', propertyId);
		const propertySnap = await getDoc(propertyRef);
		if (!propertySnap.exists()) return null;

		return mapPropertyDocToFavorite(propertyId, propertySnap.data(), propertyId);
	} catch (error) {
		console.error(`[fetchPropertyData] ✗ Error fetching property ${propertyId}:`, error);
		return null;
	}
};

export const fetchFavoriteByID = async (favoriteDocId: string): Promise<interfaces.FavoriteProperty | null> => {
	try {
		if (!favoriteDocId) return null;
		const favoriteRef = doc(db, 'clientFavorites', favoriteDocId);
		const favoriteSnap = await getDoc(favoriteRef);
		if (!favoriteSnap.exists()) return null;

		const favoriteData = favoriteSnap.data() as { userId?: string; propertyId?: string; savedAt?: any };
		const propertyId = favoriteData?.propertyId;
		if (!propertyId) return null;

		const propertyRef = doc(db, 'properties', propertyId);
		const propertySnap = await getDoc(propertyRef);
		if (!propertySnap.exists()) return null;

		return mapPropertyDocToFavorite(
			propertyId,
			propertySnap.data(),
			favoriteSnap.id,
			favoriteData?.userId ?? '',
			favoriteData?.savedAt ?? null,
		);
	} catch (error) {
		console.error(`[fetchFavoriteByID] ✗ Error fetching favorite ${favoriteDocId}:`, error);
		return null;
	}
};

export const fetchClients = async (): Promise<interfaces.ClientData[]> => {
	try {
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Client"));
		const querySnapshot = await getDocs(q);

		const clients: interfaces.ClientData[] = [];
		querySnapshot.forEach((doc) => {
			clients.push({ id: doc.id, ...doc.data() } as interfaces.ClientData);
		});
		return clients;
	} catch (error) {
		console.error(`[fetchClients] ✗ Error fetching clients:`, error);
		throw error;
	}
};

/** Fetches all users with an 'Agent' Role
 * @returns 
 */
export const fetchRealtors = async (): Promise<interfaces.RealtorData[]> => {
	try {
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Agent"));
		const querySnapshot = await getDocs(q);

		const realtors: interfaces.RealtorData[] = [];
		querySnapshot.forEach((doc) => {
			realtors.push({ id: doc.id, ...doc.data() } as interfaces.RealtorData);
		});
		return realtors;
	} catch (error) {
		console.error(`[fetchRealtors] ✗ Error fetching realtors:`, error);
		throw error;
	}
};

/** Fetches all clients that do not have an assigned agent in the clientRequests table.
 */
export const fetchUnassignedClients = async (): Promise<interfaces.AvailableClients[]> => {
	try {
		const clients = await fetchClients();
		const unassignedClients: interfaces.AvailableClients[] = [];

		for (const client of clients) {
			const requestsRef = collection(db, "clientRequests");
			const requestsQuery = query(requestsRef, where("clientId", "==", client.id));
			const requestsSnapshot = await getDocs(requestsQuery);

			const hasAssignedAgent = requestsSnapshot.docs.some((reqDoc) => reqDoc.data().realtorId && reqDoc.data().realtorId !== "");
			if (!hasAssignedAgent) {
				unassignedClients.push(client);
			}
		}
		return unassignedClients;
	} catch (error) {
		console.error(`[fetchUnassignedClients] ✗ Error fetching unassigned clients:`, error);
		throw error;
	}
};

/** Fetches a clients assigned agent
 * @param clientId
 * @returns 
 */
export const fetchAssignedRealtor = async (clientId: string): Promise<interfaces.RealtorData | null> => {
	try {
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("clientId", "==", clientId), where("status", "==", "Approved"));
		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			const request = querySnapshot.docs[0].data();
			const realtorId = request.realtorId || null;
			return realtorId;
		}
		return null;
	} catch (error) {
		console.error(`[fetchAssignedRealtor] ✗ Error fetching assigned realtor for ${clientId}:`, error);
		throw error;
	}
};

/** Fetches all assigned (status = 'Approved') clients for an agent
 * @param realtorId
 * @returns An array of 
 */
export const fetchAssignedClients = async (realtorId: string): Promise<interfaces.ClientRequest[]> => {
	try {
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("realtorId", "==", realtorId), where("status", "==", "Approved"));
		const querySnapshot = await getDocs(q);
		const requests: interfaces.ClientRequest[] = [];

		// Check each client's active status
		for (const doc of querySnapshot.docs) {
			const requestData = doc.data() as interfaces.ClientRequest;
			try {
				const clientData = await fetchUserData(requestData.clientId);
				const isActive = (clientData as any)?.is_active !== false; // Default to true if undefined\
				if (clientData && isActive) {
					requests.push({ ...requestData, id: doc.id });
				} else {
					   // [REMOVED LOG]
				}
			} catch (error) {
				console.error(`Error checking client ${requestData.clientId} active status:`, error);
			}
		}

		requests.sort((a, b) => {
			const dateA = a.createdAt?.toDate?.() || new Date(0);
			const dateB = b.createdAt?.toDate?.() || new Date(0);
			return dateB.getTime() - dateA.getTime();
		});
		return requests;
	} catch (error) {
		console.error(`[fetchAssignedClients] ✗ Error fetching assigned clients for realtor ${realtorId}:`, error);
		throw error;
	}
};

/** Fetches all requests for an agent/client that are pending
 * @param userId - Dependant on whether you are querying by the agentId or clientId
 * @param role - 'client' to find which agent, 'agent' to find which clients
 * @returns
 */
export const fetchPendingClientRequests = async (userId: string, role: "client" | "agent"): Promise<interfaces.ClientRequest[]> => {
	try {
		const field = role === "client" ? "clientId" : "realtorId";
		const requestsRef = collection(db, "clientRequests");
		const constraints = [where("status", "==", "Pending")];
		if (userId) {
			constraints.push(where(field, "==", userId));
		}
		const q = query(requestsRef, ...constraints);
		const querySnapshot = await getDocs(q);

		const requests: interfaces.ClientRequest[] = [];
		querySnapshot.forEach((doc) => {
			requests.push({ id: doc.id, ...doc.data() } as interfaces.ClientRequest);
		});

		requests.sort((a, b) => {
			const dateA = a.createdAt?.toDate?.() || new Date(0);
			const dateB = b.createdAt?.toDate?.() || new Date(0);
			return dateB.getTime() - dateA.getTime();
		});
		return requests;
	} catch (error) {
		console.error(`[fetchPendingClientRequests] ✗ Error fetching pending requests:`, error);
		throw error;
	}
};

/** Fetch all client request records for an agent across all statuses.
 * @param realtorId
 */
export const fetchAgentClientRequests = async (realtorId: string): Promise<interfaces.ClientRequest[]> => {
	try {
		if (!realtorId) return [];
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("realtorId", "==", realtorId));
		const querySnapshot = await getDocs(q);

		const requests: interfaces.ClientRequest[] = [];
		querySnapshot.forEach((doc) => {
			requests.push({ id: doc.id, ...doc.data() } as interfaces.ClientRequest);
		});

		requests.sort((a, b) => {
			const dateA = a.createdAt?.toDate?.() || new Date(0);
			const dateB = b.createdAt?.toDate?.() || new Date(0);
			return dateB.getTime() - dateA.getTime();
		});

		return requests;
	} catch (error) {
		console.error(`[fetchAgentClientRequests] ✗ Error fetching agent requests for ${realtorId}:`, error);
		throw error;
	}
};

/** Custom function to return a date / timestamp since Firestore saves date/time in the weirdest way possible.
 * @param dateValue
 * @param includeTimestamp Optional - Boolean value to return timestamp or not.  Default: False
 * @returns 
 */
export const formatDate = (dateValue: any, includeTimestamp?: boolean): string => {
	if (!dateValue) return "Unknown date";
	const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
	if (includeTimestamp) {
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
	}
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Determine if a property is currently a favorite of a client
 * @param userId 
 * @param propertyId 
 * @returns 
 */
export const checkIfFavorite = async (userId: string, propertyId: string): Promise<boolean> => {
	try {	
		// define the variable for the query with the collection name.
		const favsRef = collection(db, 'clientFavorites');
		
		// define the query with two where conditions to match both userId AND propertyId
		const q = query(favsRef, where("userId", "==", userId), where("propertyId", "==", propertyId));
		
		// execute the query and store the results in querySnapshot.
		const querySnapshot = await getDocs(q);
		
		// return true if found, false if not found
		const isFavorited = !querySnapshot.empty;
		return isFavorited;
	} catch (error) {
		console.error(`[checkIfFavorite] ✗ Error checking favorite status for property ${propertyId}:`, error);
		throw error;
	}
};

type FavoriteWriteMetadata = {
	assignedByAgentId?: string;
};

/** Toggles a property as a favorite for the userId provided
 * @param userId
 * @returns boolean
 */
export const toggleFavorite = async (
	userId: string,
	property: interfaces.Property,
	metadata: FavoriteWriteMetadata = {},
): Promise<boolean> => {
	try {
		const propertyId = String((property as any).id || (property as any).propertyId || "").trim();
		if (!propertyId) {
			throw new Error("Property ID is required to toggle favorite");
		}

		const isFavorite = await checkIfFavorite(userId, propertyId);
		
		if (isFavorite) {
			// Property is already favorited - need to delete it
			const favsRef = collection(db, 'clientFavorites');
			const q = query(favsRef, where("userId", "==", userId), where("propertyId", "==", propertyId));
			const querySnapshot = await getDocs(q);
			
			for (const favoriteDoc of querySnapshot.docs) {
				await deleteDoc(doc(db, "clientFavorites", favoriteDoc.id));
			}
			return false;
		} else {
			// Property is not favorited - store minimal linkage data only
			const favoriteDocId = makeFavoriteDocId(userId, propertyId);
			const writePayload: Record<string, unknown> = {
				userId,
				propertyId,
				savedAt: new Date(),
			};

			if (typeof metadata.assignedByAgentId === 'string' && metadata.assignedByAgentId.trim().length > 0) {
				writePayload.assignedByAgentId = metadata.assignedByAgentId.trim();
				writePayload.assignedAt = new Date();
			}

			await setDoc(doc(db, "clientFavorites", favoriteDocId), {
				...writePayload,
			}, { merge: true });
			return true;
		}
	} catch (error) {
		console.error(`[toggleFavorite] ✗ Error toggling favorite status:`, error);
		throw error;
	}
};

/** Fetches all favorites for provided userId
 * @param userId
 * @returns array of favorite objects
 */
export const fetchClientFavorites = async (userId: string): Promise<interfaces.FavoriteProperty[]> => {
	try {
		const ref = collection(db, 'clientFavorites');
		const q = query(ref, where("userId", "==", userId));
		const querySnapshot = await getDocs(q);

		const favorites = await Promise.all(
			querySnapshot.docs.map((favoriteDoc) => fetchFavoriteByID(favoriteDoc.id)),
		);

		return favorites.filter(Boolean) as interfaces.FavoriteProperty[];

	} catch (error) {
		console.error(`[fetchClientFavorites] Error retrieving favorites list:`, error);
		throw error;
	}
}

export function getShortDateString(date = new Date()) {
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	const yyyy = date.getFullYear();
	return `${mm}/${dd}/${yyyy}`;
 }

export async function saveUserPushToken(userId: string, pushToken: string): Promise<void> {
	if (!userId || !pushToken) return;

	await setDoc(doc(db, 'users', userId), {
		pushToken,
		expoPushToken: pushToken,
		pushTokenPlatform: Platform.OS,
		pushTokenUpdatedAt: new Date(),
	}, { merge: true });
}

const dayOrder: Record<string, number> = {
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
	Sunday: 7,
};

const toMinutes = (time: string): number | null => {
	const match = String(time).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
	if (!match) return null;

	let hour = Number(match[1]);
	const minute = Number(match[2]);
	const period = match[3].toUpperCase();

	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
	if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

	if (period === 'AM') {
		if (hour === 12) hour = 0;
	} else {
		if (hour !== 12) hour += 12;
	}

	return hour * 60 + minute;
};

const toTimeString = (minutes: number): string => {
	const safe = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutes)));
	const hour24 = Math.floor(safe / 60);
	const minute = safe % 60;
	const period = hour24 >= 12 ? 'PM' : 'AM';
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
};

const normalizeAvailabilityWindows = (
	windows: interfaces.AvailabilityWindow[],
): interfaces.AvailabilityWindow[] => {
	type ParsedWindow = interfaces.AvailabilityWindow & { startMinutes: number; endMinutes: number };

	const parsed: ParsedWindow[] = windows
		.map((window) => {
			const startMinutes = toMinutes(window.startTime);
			const endMinutes = toMinutes(window.endTime);
			if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;
			return { ...window, startMinutes, endMinutes };
		})
		.filter(Boolean) as ParsedWindow[];

	parsed.sort((a, b) => {
		const dayDelta = (dayOrder[a.dayOfWeek] ?? 999) - (dayOrder[b.dayOfWeek] ?? 999);
		if (dayDelta !== 0) return dayDelta;
		if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
		return a.endMinutes - b.endMinutes;
	});

	const merged: ParsedWindow[] = [];
	for (const window of parsed) {
		const last = merged[merged.length - 1];
		if (
			last &&
			last.dayOfWeek === window.dayOfWeek &&
			window.startMinutes <= last.endMinutes
		) {
			last.endMinutes = Math.max(last.endMinutes, window.endMinutes);
			last.endTime = toTimeString(last.endMinutes);
			continue;
		}

		merged.push({ ...window });
	}

	return merged.map(({ dayOfWeek, startMinutes, endMinutes }) => ({
		dayOfWeek,
		startTime: toTimeString(startMinutes),
		endTime: toTimeString(endMinutes),
	}));
};

type SubmitClientPropertyListingInput = {
	clientId: string;
	branchType: interfaces.SellBranchType;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state?: string;
	postalCode: string;
	propertyType?: string;
	bedrooms?: number | null;
	bathrooms?: number | null;
	squareFeet?: number | null;
	lotSizeSqft?: number | null;
	yearBuilt?: number | null;
	timelineToSell?: string;
	notes?: string;
	preferredContactMethod: interfaces.PreferredContactMethod;
	contactPhone?: string;
	contactEmail?: string;
	availability: interfaces.AvailabilityWindow[];
};

/**
 * Creates a private sell-home listing request for a client and auto-links
 * the currently approved agent (when present).
 */
export async function submitClientPropertyListing(
	input: SubmitClientPropertyListingInput,
): Promise<string> {
	const now = new Date();

	const requestsRef = collection(db, 'clientRequests');
	const assignmentQuery = query(
		requestsRef,
		where('clientId', '==', input.clientId),
		where('status', '==', 'Approved'),
	);
	const assignmentSnapshot = await getDocs(assignmentQuery);
	const assignedAgentId = assignmentSnapshot.empty
		? null
		: (assignmentSnapshot.docs[0].data()?.realtorId ?? null);

	const payload: interfaces.ClientPropertyListing = {
		clientId: input.clientId,
		assignedAgentId,
		branchType: input.branchType,
		status: assignedAgentId ? 'Assigned' : 'Submitted',
		addressLine1: input.addressLine1.trim(),
		addressLine2: input.addressLine2?.trim() || '',
		city: input.city.trim(),
		state: input.state?.trim() || '',
		postalCode: input.postalCode.trim(),
		propertyType: input.propertyType?.trim() || '',
		bedrooms: input.bedrooms ?? null,
		bathrooms: input.bathrooms ?? null,
		squareFeet: input.squareFeet ?? null,
		lotSizeSqft: input.lotSizeSqft ?? null,
		yearBuilt: input.yearBuilt ?? null,
		timelineToSell: input.timelineToSell?.trim() || '',
		notes: input.notes?.trim() || '',
		preferredContactMethod: input.preferredContactMethod,
		contactPhone: input.contactPhone?.trim() || '',
		contactEmail: input.contactEmail?.trim() || '',
		availability: normalizeAvailabilityWindows(input.availability),
		createdAt: now,
		updatedAt: now,
		submittedAt: now,
	};

	const docRef = await addDoc(collection(db, 'clientPropertyListings'), payload);
	return docRef.id;
}
 
 /** Used to send emails to the assigned agent for specific issues / tasks from the app.
  * This will first check if the logged in user has an account, and require them to create one if they don't.
  * @param user: This is the user id from the logged in user and should be user?.uid
  * @param realtorId: This should also come from app state user (ie: user.realtorId)
  * @param subject: Subject of the email relative to the context sending the email request (ie: Help Request, Client Request Received, etc...)
  * @param body: The body of the email
  */
 export async function handleEmail(userId: string, realtorId: string, subject: string, body: string) {
	const realtorData = await fetchUserData(realtorId);
	const realtorEmail = realtorData?.email;

	try {
		const mailtoUrl = `mailto:${realtorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;	
		Linking.openURL(mailtoUrl);
	} catch {
		Alert.alert('Failed building email', 'App failed to generate the email.')
		// [REMOVED LOG]
	}
 }

/**
 * Uploads a file to Firebase Storage and saves the download URL/metadata to a Firestore document.
 * @param fileUrl The local URI of the file to upload
 * @param storagePath The path in Firebase Storage (e.g., 'clientOffers/{offerId}/{filename}')
 * @param offerDocId The Firestore document ID for the offer
 * @param metadata Optional metadata to store with the file (object)
 * @returns The download URL of the uploaded file
 */
export async function uploadFileAndSaveUrl({
	fileUrl,
	storagePath,
	offerDocId,
	metadata = {},
}: {
	fileUrl: string;
	storagePath: string;
	offerDocId: string;
	metadata?: any;
}): Promise<string> {
	const storage = getStorage();
	const firestore = getFirestore();
	const response = await fetch(fileUrl);
	const blob = await response.blob();
	const storageRef = ref(storage, storagePath);
	await uploadBytes(storageRef, blob);
	const downloadUrl = await getDownloadURL(storageRef);

	// Save file info to Firestore (append to files array)
	const offerDocRef = doc(firestore, 'clientOffers', offerDocId);
	await updateDoc(offerDocRef, {
		files: arrayUnion({
			url: downloadUrl,
			name: storagePath.split('/').pop(),
			uploadedAt: new Date(),
			...metadata,
		}),
  	});
	return downloadUrl;
}




/** OFFERS QUERIES */
/**
 * Fetches only the active offer for a specific client
 * @param clientId 
 * @returns 
 */
export const fetchActiveOfferForClient = async (
	clientId: string,
) : Promise<interfaces.OfferData | null> => {
	try {
		const offersRef = collection(db, "clientOffers");
		const q = query(offersRef,where("clientId", "==", clientId));
		const querySnapshot = await getDocs(q);
		for (const doc of querySnapshot.docs) {
			const offer = doc.data();
			// Only consider offers that are not withdrawn/declined
			if (
				offer.status !== "Offer Withdrawn" &&
				offer.status !== "Offer Declined"
			) {
				return {
					offerId: doc.id,
					...offer
				} as interfaces.OfferData;
			}
		}
		return null;
	} catch (error) {
		console.error(`[fetchActiveOfferForClientProperty] ✗ Error fetching offer for client ${clientId}:`, error);
		return null;
	}
};

/**
 * Fetches only the active offer for a specific property 
 * @param propertyId 
 * @returns 
 */
export const fetchActiveOfferForProperty = async (
	propertyId: string
) : Promise<interfaces.OfferData | null> => {
	try {
		const offersRef = collection(db, "clientOffers");
		const q = query(offersRef,where("propertyId", "==", propertyId));
		const querySnapshot = await getDocs(q);
		for (const doc of querySnapshot.docs) {
			const offer = doc.data();
			// Only consider offers that are not withdrawn/declined
			if (
				offer.status !== "Offer Withdrawn" &&
				offer.status !== "Offer Declined"
			) {
				return {
					offerId: doc.id,
					...offer
				} as interfaces.OfferData;
			}
		}
		return null;
	} catch (error) {
		console.error(`[fetchActiveOfferForClientProperty] ✗ Error fetching offer for property ${propertyId}:`, error);
		return null;
	}
};

/**
 * Fetches all offers for a client including delicned and withdrawn.
 * @param userId
 * @returns 
 */
export const fetchUserOffers = async (userId: string): Promise<interfaces.OfferData[]> => {
	try {
		const offersRef = collection(db, "clientOffers");
		const q = query(offersRef, where("clientId", "==", userId));
		const querySnapshot = await getDocs(q);
		const offers: interfaces.OfferData[] = querySnapshot.docs.map(doc => ({ offerId: doc.id, ...doc.data() } as interfaces.OfferData));
		return offers;
	} catch (error) {
		console.error(`[fetchUserOffers] ✗ Error fetching offers for user ${userId}:`, error);
		return [];
	}
};

/**
 * Fetch offerId data- Must have correct offerId for this usage
 * @param offerId
 * @returns Offer data object
 */
export const fetchOfferDatabyID = async (offerId: string): Promise<interfaces.OfferData | null> => {
	try {
		const offerRef = doc(db,"clientOffers", offerId);
		const offerSnap = await getDoc(offerRef);	
	if (offerSnap.exists()){
			return offerSnap.data() as interfaces.OfferData;
		}
	return null;
	} catch (error) {
		console.error(`[fetchOfferDatabyID] Error fetching offers for offerID: ${offerId}:`, error)
		return null
	}
}

 /**
 * Creates a new clientOffer in Firestore.
 * @param clientId - The client making the offer
 * @param agentId - The agent assigned to the client
 * @param propertyId - The property for the offer
 * @param status - The status of the offer (see getClientOfferStatuses)
 * @returns The created document reference
 */
export const createClientOffer = async (
	clientId: string,
	agentId: string,
	propertyId: string,
	status: string
) => {
	try {
		const now = new Date();
		const offerData = {
			clientId,
			agentId,
			propertyId,
			status,
			createdAt: now,
			updatedAt: now,
		};
		const docRef = await addDoc(collection(db, "clientOffers"), offerData);
		return docRef;
	} catch (error) {
		console.error(`[createClientOffer] ✗ Error creating offer:`, error);
		throw error;
	}
};

/**
 * Delete a favorite property by favorite document ID
 * @param favoriteDocId The Firestore document ID of the favorite (clientFavorites collection)
 */
export const deleteFavoriteById = async (favoriteDocId: string): Promise<void> => {
  if (!favoriteDocId) return;
  try {
    await deleteDoc(doc(db, 'clientFavorites', favoriteDocId));
  } catch (error) {
    console.error(`[deleteFavoriteById] ✗ Error deleting favorite ${favoriteDocId}:`, error);
    throw error;
  }
};