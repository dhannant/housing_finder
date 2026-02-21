import { db } from "@/components/firebaseConfig";
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { Alert, Linking } from "react-native";
import * as interfaces from "./interfaces";


/**
 * Fetches the active offer for a specific client & property 
 * @param clientId 
 * @param propertyId 
 * @returns 
 */
export const fetchActiveOfferForClientProperty = async (
	clientId: string,
	propertyId: string
) : Promise<interfaces.OfferData | null> => {
	try {
		const offersRef = collection(db, "clientOffers");
		const q = query(
			offersRef,
			where("clientId", "==", clientId),
			where("propertyId", "==", propertyId)
		);
		const querySnapshot = await getDocs(q);
		for (const doc of querySnapshot.docs) {
			const offer = doc.data();
			// Only consider offers that are not withdrawn/declined
			if (
				offer.status !== "withdrawn" &&
				offer.status !== "Offer Declined" &&
				offer.status !== "offer declined"
			) {
				return {
					offerId: doc.id,
					...offer
				} as interfaces.OfferData;
			}
		}
		return null;
	} catch (error) {
		console.error(`[fetchActiveOfferForClientProperty] ✗ Error fetching offer for client ${clientId} property ${propertyId}:`, error);
		return null;
	}
};


/**
 * Fetches a specific property in the clientFavorites collection for the propertyId provided.
 *
 *   @param propertyId: string - The Firestore document ID for the property.
 *   @return: Property object or null if not found.
 *   @useage const property = await fetchPropertyData(propertyId);
 */
export const fetchPropertyData = async (propertyId: string): Promise<interfaces.Property | null> => {
	try {
		// Fetch from clientFavorites collection by propertyId
		const favoritesRef = collection(db, 'clientFavorites');
		const q = query(favoritesRef, where('propertyId', '==', propertyId));
		const snapshot = await getDocs(q);
		if (!snapshot.empty) {
			// Return the first matching favorite property
			return snapshot.docs[0].data() as interfaces.Property;
		}
		return null;
	} catch (error) {
		console.error(`[fetchPropertyData] Error fetching property ${propertyId} from clientFavorites:`, error);
		return null;
	}
};

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


export const fetchUserData = async (userId: string): Promise<interfaces.UserData | null> => {
	try {
		console.log(`[fetchUserData] Fetching user: ${userId}`);
		const userDoc = await getDoc(doc(db, "users", userId));
		if (userDoc.exists()) {
			const userData = userDoc.data() as interfaces.UserData;
			console.log(`[fetchUserData] ✓ Found user:`, { id: userId, name: `${userData.firstName} ${userData.lastName}`, role: userData.role });
			return userData;
		}
		console.log(`[fetchUserData] ✗ User not found: ${userId}`);
		return null;
	} catch (error) {
		console.error(`[fetchUserData] ✗ Error fetching user ${userId}:`, error);
		throw error;
	}
};

export const fetchClients = async (): Promise<interfaces.ClientData[]> => {
	try {
		console.log(`[fetchClients] Querying all clients...`);
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Client"));
		const querySnapshot = await getDocs(q);

		const clients: interfaces.ClientData[] = [];
		querySnapshot.forEach((doc) => {
			clients.push({ id: doc.id, ...doc.data() } as interfaces.ClientData);
		});
		console.log(`[fetchClients] ✓ Found ${clients.length} total clients`);
		return clients;
	} catch (error) {
		console.error(`[fetchClients] ✗ Error fetching clients:`, error);
		throw error;
	}
};

export const fetchRealtors = async (): Promise<interfaces.RealtorData[]> => {
	try {
		console.log(`[fetchRealtors] Querying all realtors/agents...`);
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Agent"));
		const querySnapshot = await getDocs(q);

		const realtors: interfaces.RealtorData[] = [];
		querySnapshot.forEach((doc) => {
			realtors.push({ id: doc.id, ...doc.data() } as interfaces.RealtorData);
		});

		console.log(`[fetchRealtors] ✓ Found ${realtors.length} realtors`);
		return realtors;
	} catch (error) {
		console.error(`[fetchRealtors] ✗ Error fetching realtors:`, error);
		throw error;
	}
};

export const fetchUnassignedClients = async (): Promise<interfaces.AvailableClients[]> => {
	console.log(`[fetchUnassignedClients] Starting search for unassigned clients...`);
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
				console.log(`[fetchUnassignedClients] ✓ ${client.firstName} ${client.lastName} is unassigned`);
			}
		}

		console.log(`[fetchUnassignedClients] ✓ Found ${unassignedClients.length} unassigned clients`);
		return unassignedClients;
	} catch (error) {
		console.error(`[fetchUnassignedClients] ✗ Error fetching unassigned clients:`, error);
		throw error;
	}
};

export const fetchAssignedRealtor = async (clientId: string): Promise<interfaces.RealtorData | null> => {
	try {
		console.log(`[fetchAssignedRealtor] Checking assigned realtor for client: ${clientId}`);
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("clientId", "==", clientId));
		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			const request = querySnapshot.docs[0].data();
			const realtorId = request.realtorId || null;
			console.log(`[fetchAssignedRealtor] ✓ Client ${clientId} has realtor: ${realtorId}`);
			return realtorId;
		}
		console.log(`[fetchAssignedRealtor] ✗ Client ${clientId} has no assigned realtor`);
		return null;
	} catch (error) {
		console.error(`[fetchAssignedRealtor] ✗ Error fetching assigned realtor for ${clientId}:`, error);
		throw error;
	}
};

export const fetchAssignedClients = async (realtorId: string): Promise<interfaces.ClientRequest[]> => {
	try {
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("realtorId", "==", realtorId), where("status", "==", "Approved"));
		const querySnapshot = await getDocs(q);

		const requests: interfaces.ClientRequest[] = [];

		console.log(`[fetchAssignedClients] Found ${querySnapshot.docs.length} approved requests for realtor ${realtorId}`);

		// Check each client's active status
		for (const doc of querySnapshot.docs) {
			const requestData = doc.data() as interfaces.ClientRequest;
			try {
				const clientData = await fetchUserData(requestData.clientId);
				const isActive = (clientData as any)?.is_active !== false; // Default to true if undefined
				console.log(`[fetchAssignedClients] Client ${requestData.clientId}:`, {
					firstName: clientData?.firstName,
					lastName: clientData?.lastName,
					is_active: (clientData as any)?.is_active,
					isActive: isActive,
					type: typeof (clientData as any)?.is_active,
				});
				if (clientData && isActive) {
					requests.push({ ...requestData, id: doc.id });
					console.log(`[fetchAssignedClients] ✓ Added to active clients`);
				} else {
					console.log(`[fetchAssignedClients] ✗ Skipped - is_active is false`);
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

		console.log(`[fetchAssignedClients] Returning ${requests.length} active clients`);
		return requests;
	} catch (error) {
		console.error(`[fetchAssignedClients] ✗ Error fetching assigned clients for realtor ${realtorId}:`, error);
		throw error;
	}
};

export const fetchPendingClientRequests = async (realtorId?: string): Promise<interfaces.ClientRequest[]> => {
	try {
		console.log(`[fetchPendingClientRequests] Fetching pending requests${realtorId ? ` for realtor ${realtorId}` : ""}...`);
		const requestsRef = collection(db, "clientRequests");
		const constraints = [where("status", "==", "Pending")];
		if (realtorId) {
			constraints.push(where("realtorId", "==", realtorId));
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

		console.log(`[fetchPendingClientRequests] ✓ Found ${requests.length} pending requests`);
		return requests;
	} catch (error) {
		console.error(`[fetchPendingClientRequests] ✗ Error fetching pending requests:`, error);
		throw error;
	}
};

export const formatDate = (timestamp: any): string => {
	if (!timestamp) return "Unknown date";
	const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const checkIfFavorite = async (userId: string, propertyId: string): Promise<boolean> => {
	try {
		console.log(`[checkIfFavorite] Checking if property ${propertyId} is favorited by user ${userId}`);
		
		// define the variable for the query with the collection name.
		const favsRef = collection(db, 'clientFavorites');
		
		// define the query with two where conditions to match both userId AND propertyId
		const q = query(favsRef, where("userId", "==", userId), where("propertyId", "==", propertyId));
		
		// execute the query and store the results in querySnapshot.
		const querySnapshot = await getDocs(q);
		
		// return true if found, false if not found
		const isFavorited = !querySnapshot.empty;
		console.log(`[checkIfFavorite] ✓ Property ${propertyId} favorited: ${isFavorited}`);
		return isFavorited;
	} catch (error) {
		console.error(`[checkIfFavorite] ✗ Error checking favorite status for property ${propertyId}:`, error);
		throw error;
	}
};

export const toggleFavorite = async (userId: string, property: interfaces.Property): Promise<boolean> => {
	try {
		console.log(`[toggleFavorite] Toggling favorite for property ${property.id} by user ${userId}`);
		const isFavorite = await checkIfFavorite(userId, property.id);
		
		if (isFavorite) {
			// Property is already favorited - need to delete it
			// First, find the document by querying
			const favsRef = collection(db, 'clientFavorites');
			const q = query(favsRef, where("userId", "==", userId), where("propertyId", "==", property.id));
			const querySnapshot = await getDocs(q);
			
			// Delete the document using its ID
			if (!querySnapshot.empty) {
				const docId = querySnapshot.docs[0].id;
				await deleteDoc(doc(db, "clientFavorites", docId));
				console.log(`[toggleFavorite] ✓ Removed favorite for property ${property.id}`);
			}
			return false;
		} else {
			// Property is not favorited - add it with snapshot data
			await addDoc(collection(db, "clientFavorites"), {
				userId: userId,
				propertyId: property.id,
				address: property.address,
				price: property.price,
				beds: property.beds,
				baths: property.baths,
				status: property.status,
				photos: property.photos || [],
				primaryPhoto: property.primaryPhoto || (property.photos && property.photos[0]) || null,
				squareFootage: property.sqft || null,
				landArea: property.lot_sqft || null,
				savedAt: new Date()
			});
			console.log(`[toggleFavorite] ✓ Added favorite for property ${property.id}`);
			return true;
		}
	} catch (error) {
		console.error(`[toggleFavorite] ✗ Error toggling favorite status:`, error);
		throw error;
	}
}

export const getFavorites = async (userId: string): Promise<interfaces.FavoriteProperty[]> => {
	try {
		const ref = collection(db, 'clientFavorites');
		const q = query(ref, where("userId", "==", userId));
		const querySnapshot = await getDocs(q);

		// Build an array called favorites that uses the FavoriteProperty interface
		const favorites: interfaces.FavoriteProperty[] = [];

			console.log('[getFavorites] userId:', userId);
			console.log('[getFavorites] querySnapshot size:', querySnapshot.size);
		//Build the array with the information in the querySnapshot variable.
		querySnapshot.forEach((doc) => { 
			// assign each field to it's proper position in the FavoriteProperty interface.
			favorites.push({ id:doc.id, ...doc.data() } as interfaces.FavoriteProperty);  // Spread operator (elipsis) maps Firestore fields to interface fields automatically
				console.log('[getFavorites] favorite doc:', doc.id, doc.data());
		})

		return favorites;

	} catch (error) {
		console.error(`[getFavorites] Error retrieving favorites list:`, error);
		throw error;
	}
}

export function getShortDateString(date = new Date()) {
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	const yyyy = date.getFullYear();
	return `${mm}/${dd}/${yyyy}`;
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
	} catch (error) {
		Alert.alert('Failed building email', 'App failed to generate the email.')
		console.log('Sending email error:', error)
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
 * Returns valid status options for client offers.
 */
export const getClientOfferStatuses = () => [
	"Offer Made",
	"Under Contract",
	"Contingent",
	"Closed",
	// Additional suggestions based on real estate workflow:
	"Offer Accepted",
	"Offer Rejected",
	"Inspection Period",
	"Appraisal Ordered",
	"Financing Approved",
	"Title Cleared",
	"Pending",
	"Withdrawn",
	"Terminated",
	"Expired",
];

/**
 * Uploads a file to Firebase Storage and saves the download URL/metadata to a Firestore document.
 * @param fileUri The local URI of the file to upload
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




// PROPERTY SERVICES FUNCTIONS //
/**
 * Formats location string for RealtyUS API
 * Examples: "commerce, ga" -> "city:Commerce,GA"
 */
export function formatLocation(location: string): string {
	if (location.includes(":")) {
		return location; // Already formatted
	}

	// Convert "commerce, ga" to "city:Commerce,GA"
	const parts = location.split(",").map(s => s.trim());
	if (parts.length === 2) {
		const city = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
		const state = parts[1].toUpperCase();
		return `city:${city},${state}`;
	}

	return `city:${location}`;
}

/**
 * Builds the RealtyUS API URL with all parameters
 */
export function buildApiUrl(options: interfaces.SearchOptions): string {
	const formattedLocation = formatLocation(options.location);
	const params = new URLSearchParams({ location: formattedLocation });

	// Add all optional parameters
	const optionalParams: (keyof Omit<interfaces.SearchOptions, 'location'>)[] = [
		"zoneId",
		"resultsPerPage",
		"page",
		"sortBy",
		"expandSearchArea",
		"propertyType",
		"prices",
		"bedrooms",
		"bathrooms",
		"homeSize",
		"lotSize",
		"homeAge",
		"hidePendingContingent",
		"newConstructionOnly",
		"hideHomesNotYetBuilt",
		"foreclosuresOnly",
		"hideForeclosures",
		"seniorCommunityOnly",
		"openHousesOnly",
		"priceRecentlyReducedOnly",
		"virtualToursOnly",
		"threeDtoursOnly",
		"maxHoaFeesPerMonth",
		"showHomesWhereHoaIsNotKnown",
		"daysOnRealtor",
		"garageParking",
		"heatingCooling",
		"homeFeatures",
		"lotFeatures",
		"communityFeatures",
		"nycAmenities",
		"minListDate",
		"maxListDate",
	];

	optionalParams.forEach((key) => {
		const value = options[key];
		if (value !== undefined && value !== null && value !== "") {
			params.set(key, String(value));
		}
	});

	return `https://realty-us.p.rapidapi.com/properties/search-buy?${params.toString()}`;
}

/**
 * Normalizes raw API property data to consistent format
 */
export function normalizeProperty(property: any): interfaces.Property {
	const latitude =
		property.location?.address?.coordinate?.lat ??
		property.location?.coordinates?.lat ??
		property.location?.latitude ??
		property.latitude ??
		null;

	const longitude =
		property.location?.address?.coordinate?.lon ??
		property.location?.coordinates?.lon ??
		property.location?.longitude ??
		property.longitude ??
		null;

	return {
		id: property.property_id ?? property.id ?? property.listing_id ?? "",
		price: property.list_price ?? property.price ?? property.price?.list_price ?? property.price?.value ?? null,
		address:
			property.location?.address?.line ||
			property.address?.line ||
			property.location?.address ||
			property.address ||
			"Address not available",
		beds: property.description?.beds ?? property.beds ?? null,
		baths: property.description?.baths ?? property.baths ?? null,
		latitude,
		longitude,
		lot_sqft: property.description?.lot_sqft ?? property.lot_sqft ?? null,
		status: property.status ?? property.status_code ?? null,
		sqft: property.description?.sqft ?? property.sqft ?? null,
		type: property.description?.type ?? property.prop_type ?? property.type ?? null,
		photos: property.photos || property.photos?.list || [],
		primaryPhoto:
			property.primary_photo?.href ||
			property.primary_photo ||
			property.thumbnail ||
			property.photos?.[0]?.href ||
			null,
	};
}

/**
 * Parses raw API response to extract properties array
 */
export function parsePropertiesFromResponse(apiData: any): any[] {
	// Try multiple possible response structures
	const rawResults =
		(apiData?.data?.results && Array.isArray(apiData.data.results) && apiData.data.results) ||  // RealtyUS actual path
		(apiData?.properties && Array.isArray(apiData.properties) && apiData.properties) ||
		(apiData?.data?.home_search?.results && Array.isArray(apiData.data.home_search.results) && apiData.data.home_search.results) ||
		(apiData?.data?.home_search?.properties && Array.isArray(apiData.data.home_search.properties) && apiData.data.home_search.properties) ||
		[];

	return rawResults;
}

/**
 * Main function to search for properties
 * This calls the Vercel proxy which adds the API key
 */
export async function searchProperties(options: interfaces.SearchOptions): Promise<interfaces.Property[]> {
	try {
		// Build the full RealtyUS API URL client-side
		const apiUrl = buildApiUrl(options);

		console.log('🔍 Searching properties with URL:', apiUrl);

		// Use the Vercel deployment URL (not relative path to avoid calling localhost)
		const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://leading-edge-realty.vercel.app';
		const proxyUrl = `${apiBaseUrl}/api/proxy?apiUrl=${encodeURIComponent(apiUrl)}`;
		console.log('🔗 Calling Vercel proxy at:', proxyUrl);

		const response = await fetch(proxyUrl);
		console.log('📡 Response status:', response.status);
		console.log('📋 Content-Type:', response.headers.get('content-type'));

		// Get response as text first to see what we actually got
		const responseText = await response.text();
		console.log('📄 Raw response (first 200 chars):', responseText.substring(0, 200));

		if (!response.ok) {
			console.error('❌ Non-OK response. Full text:', responseText.substring(0, 500));
			let error;
			try {
				error = JSON.parse(responseText);
			} catch {
				throw new Error(`Proxy failed with status ${response.status}. Response: ${responseText.substring(0, 200)}`);
			}
			throw new Error(error.error || 'API request failed');
		}

		// Try to parse as JSON
		let rawData;
		try {
			rawData = JSON.parse(responseText);
			console.log('✅ Successfully parsed JSON');
			console.log('📦 Raw API response keys:', Object.keys(rawData));
		} catch (parseError: any) {
			console.error('💥 JSON PARSE ERROR:', parseError.message);
			console.error('📄 Received content type:', response.headers.get('content-type'));
			console.error('📄 Full response (first 1000 chars):', responseText.substring(0, 1000));
			throw new Error(`Failed to parse JSON: ${parseError.message}`);
		}

		// Parse properties from response
		const rawProperties = parsePropertiesFromResponse(rawData);
		console.log(`📊 Found ${rawProperties.length} raw properties`);

		if (rawProperties.length > 0) {
			console.log('🏠 Sample property (raw):', rawProperties[0]);
		}

		// Normalize all properties
		const properties = rawProperties.map(normalizeProperty);
		console.log(`✅ Normalized ${properties.length} properties`);

		if (properties.length > 0) {
			console.log('🏡 Sample property (normalized):', properties[0]);
		}

		return properties;

	} catch (error) {
		console.error('💥 Error in searchProperties:', error);
		throw error;
	}
}
