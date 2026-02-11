import { db } from "@/components/firebaseConfig";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { AvailableClients, ClientData, ClientRequest, RealtorData, UserData } from "./interfaces";

export const fetchUserData = async (userId: string): Promise<UserData | null> => {
	try {
		console.log(`[fetchUserData] Fetching user: ${userId}`);
		const userDoc = await getDoc(doc(db, "users", userId));
		if (userDoc.exists()) {
			const userData = userDoc.data() as UserData;
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

export const fetchClients = async (): Promise<ClientData[]> => {
	try {
		console.log(`[fetchClients] Querying all clients...`);
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Client"));
		const querySnapshot = await getDocs(q);

		const clients: ClientData[] = [];
		querySnapshot.forEach((doc) => {
			clients.push({ id: doc.id, ...doc.data() } as ClientData);
		});
		console.log(`[fetchClients] ✓ Found ${clients.length} total clients`);
		return clients;
	} catch (error) {
		console.error(`[fetchClients] ✗ Error fetching clients:`, error);
		throw error;
	}
};

export const fetchRealtors = async (): Promise<RealtorData[]> => {
	try {
		console.log(`[fetchRealtors] Querying all realtors/agents...`);
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Agent"));
		const querySnapshot = await getDocs(q);

		const realtors: RealtorData[] = [];
		querySnapshot.forEach((doc) => {
			realtors.push({ id: doc.id, ...doc.data() } as RealtorData);
		});

		console.log(`[fetchRealtors] ✓ Found ${realtors.length} realtors`);
		return realtors;
	} catch (error) {
		console.error(`[fetchRealtors] ✗ Error fetching realtors:`, error);
		throw error;
	}
};

export const fetchUnassignedClients = async (): Promise<AvailableClients[]> => {
	console.log(`[fetchUnassignedClients] Starting search for unassigned clients...`);
	try {
		const clients = await fetchClients();
		const unassignedClients: AvailableClients[] = [];

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

export const fetchAssignedRealtor = async (clientId: string): Promise<string | null> => {
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

export const fetchAssignedClients = async (realtorId: string): Promise<ClientRequest[]> => {
	try {
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("realtorId", "==", realtorId), where("status", "==", "Approved"));
		const querySnapshot = await getDocs(q);

		const requests: ClientRequest[] = [];

		console.log(`[fetchAssignedClients] Found ${querySnapshot.docs.length} approved requests for realtor ${realtorId}`);

		// Check each client's active status
		for (const doc of querySnapshot.docs) {
			const requestData = doc.data() as ClientRequest;
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

export const fetchPendingClientRequests = async (realtorId?: string): Promise<ClientRequest[]> => {
	try {
		console.log(`[fetchPendingClientRequests] Fetching pending requests${realtorId ? ` for realtor ${realtorId}` : ""}...`);
		const requestsRef = collection(db, "clientRequests");
		const constraints = [where("status", "==", "Pending")];
		if (realtorId) {
			constraints.push(where("realtorId", "==", realtorId));
		}
		const q = query(requestsRef, ...constraints);
		const querySnapshot = await getDocs(q);

		const requests: ClientRequest[] = [];
		querySnapshot.forEach((doc) => {
			requests.push({ id: doc.id, ...doc.data() } as ClientRequest);
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
