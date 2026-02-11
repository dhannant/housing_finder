import { db } from "@/components/firebaseConfig";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

interface ClientRequest {
	id: string;
	clientId: string;
	clientName: string;
	clientEmail: string;
	realtorId: string;
	status: string;
	createdAt: any;
}

interface UserData {
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	phoneNumber?: string;
	createdAt?: any;
}

export const fetchUserData = async (userId: string): Promise<UserData | null> => {
	try {
		const userDoc = await getDoc(doc(db, "users", userId));
		if (userDoc.exists()) {
			return userDoc.data() as UserData;
		}
		return null;
	} catch (error) {
		console.error("Error fetching user data:", error);
		throw error;
	}
};

export const fetchClients = async (): Promise<(UserData & { id: string })[]> => {
	try {
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Client"));
		const querySnapshot = await getDocs(q);

		const clients: (UserData & { id: string })[] = [];
		querySnapshot.forEach((doc) => {
			clients.push({ id: doc.id, ...doc.data() } as UserData & { id: string });
		});

		return clients;
	} catch (error) {
		console.error("Error fetching clients:", error);
		throw error;
	}
};

export const fetchRealtors = async (): Promise<(UserData & { id: string })[]> => {
	try {
		const usersRef = collection(db, "users");
		const q = query(usersRef, where("role", "==", "Agent"));
		const querySnapshot = await getDocs(q);

		const realtors: (UserData & { id: string })[] = [];
		querySnapshot.forEach((doc) => {
			realtors.push({ id: doc.id, ...doc.data() } as UserData & { id: string });
		});

		return realtors;
	} catch (error) {
		console.error("Error fetching realtors:", error);
		throw error;
	}
};

export const fetchUnassignedClients = async (): Promise<(UserData & { id: string })[]> => {
	try {
		const clients = await fetchClients();
		const unassignedClients: (UserData & { id: string })[] = [];

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
		console.error("Error fetching unassigned clients:", error);
		throw error;
	}
};

export const fetchAssignedRealtor = async (clientId: string): Promise<string | null> => {
	try {
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("clientId", "==", clientId));
		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			const request = querySnapshot.docs[0].data();
			return request.realtorId || null;
		}
		return null;
	} catch (error) {
		console.error("Error fetching assigned realtor:", error);
		throw error;
	}
};

export const fetchAssignedClients = async (realtorId: string): Promise<ClientRequest[]> => {
	try {
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("realtorId", "==", realtorId));
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

		return requests;
	} catch (error) {
		console.error("Error fetching assigned clients:", error);
		throw error;
	}
};

export const fetchPendingClientRequests = async (realtorId?: string): Promise<ClientRequest[]> => {
	try {
		const requestsRef = collection(db, "clientRequests");
		const constraints = [where("status", "==", "pending")];
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

		return requests;
	} catch (error) {
		console.error("Error fetching pending requests:", error);
		throw error;
	}
};

export const formatDate = (timestamp: any): string => {
	if (!timestamp) return "Unknown date";
	const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
