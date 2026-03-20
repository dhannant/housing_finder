import { db } from "@/components/firebaseConfig";
import {
	fetchRealtors,
	fetchUnassignedClients,
	fetchUserData,
} from "@/utils/functions";
import { ClientRequest, UserData } from "@/utils/interfaces";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

interface UseDataReturn<T> {
	data: T | null;
	loading: boolean;
	error: Error | null;
	refetch: () => Promise<void>;
}

const toError = (err: unknown): Error => (err instanceof Error ? err : new Error(String(err)));

const sortByCreatedAtDesc = (requests: ClientRequest[]): ClientRequest[] => {
	return [...requests].sort((a, b) => {
		const dateA = a.createdAt?.toDate?.() || new Date(0);
		const dateB = b.createdAt?.toDate?.() || new Date(0);
		return dateB.getTime() - dateA.getTime();
	});
};

export const useUserData = (userId: string | null | undefined): UseDataReturn<UserData> => {
	const [data, setData] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when userId changes
	useEffect(() => {
		const loadUser = async () => {
			if (!userId) {
				console.log(`[useUserData] No userId provided`);
				setData(null);
				setError(null);
				setLoading(false);
				return;
			}
			console.log(`[useUserData] Refetching user: ${userId}`);
			try {
				setLoading(true);
				const result = await fetchUserData(userId);
				setData(result);
				setError(null);
				console.log(`[useUserData] ✓ Refetch complete`);
			} catch (err: unknown) {
				setError(toError(err));
				console.error(`[useUserData] ✗ Refetch error for ${userId}:`, err);
			} finally {
				setLoading(false);
			}
		};

		loadUser();
	}, [userId, reloadKey]);

	return { data, loading, error, refetch };
};

export const useRealtors = (): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};
	// Load data on mount AND when reloadKey changes
	useEffect(() => {
		const loadRealtors = async () => {
			console.log(`[useRealtors] Refetching realtors...`);
			try {
				setLoading(true);
				const result = await fetchRealtors();
				setData(result);
				setError(null);
				console.log(`[useRealtors] ✓ Loaded ${result.length} realtors`);
			} catch (err: unknown) {
				setError(toError(err));
				console.error(`[useRealtors] ✗ Error loading realtors:`, err);
			} finally {
				setLoading(false);
			}
		};

		loadRealtors();
	}, [reloadKey]);
	return { data, loading, error, refetch };
};

export const useUnassignedClients = (): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when reloadKey changes
	useEffect(() => {
		const loadUnassignedClients = async () => {
			console.log(`[useUnassignedClients] Refetching unassigned clients...`);
			try {
				setLoading(true);
				const result = await fetchUnassignedClients();
				setData(result);
				setError(null);
				console.log(`[useUnassignedClients] ✓ Loaded ${result.length} unassigned clients`);
			} catch (err: unknown) {
				setError(toError(err));
				console.error(`[useUnassignedClients] ✗ Error loading unassigned clients:`, err);
			} finally {
				setLoading(false);
			}
		};

		loadUnassignedClients();
	}, [reloadKey]);

	return { data, loading, error, refetch };
};

export const useAssignedRealtor = (clientId: string | null | undefined): UseDataReturn<string | null> => {
	const [data, setData] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when clientId changes
	useEffect(() => {
		if (!clientId) {
			console.log(`[useAssignedRealtor] No clientId provided`);
			setData(null);
			setError(null);
			setLoading(false);
			return;
		}

		console.log(`[useAssignedRealtor] Listening for assigned realtor: ${clientId}`);
		setLoading(true);

		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("clientId", "==", clientId), where("status", "==", "Approved"));

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const realtorId = snapshot.empty ? null : (snapshot.docs[0].data()?.realtorId ?? null);
				setData(realtorId);
				setError(null);
				setLoading(false);
			},
			(err: unknown) => {
				setError(toError(err));
				setLoading(false);
				console.error(`[useAssignedRealtor] ✗ Listener error for client ${clientId}:`, err);
			},
		);

		return () => unsubscribe();
	}, [clientId, reloadKey]);

	return { data, loading, error, refetch };
};

export const useAssignedClients = (realtorId: string | null | undefined): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when realtorId changes
	useEffect(() => {
		if (!realtorId) {
			console.log(`[useAssignedClients] No realtorId provided`);
			setData([]);
			setError(null);
			setLoading(false);
			return;
		}

		console.log(`[useAssignedClients] Listening for assigned clients: ${realtorId}`);
		setLoading(true);
		let disposed = false;

		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("realtorId", "==", realtorId), where("status", "==", "Approved"));

		const unsubscribe = onSnapshot(
			q,
			async (snapshot) => {
				const requests = sortByCreatedAtDesc(
					snapshot.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() } as ClientRequest)),
				);

				// Keep existing behavior: only include clients with is_active !== false.
				const activeRequests = await Promise.all(
					requests.map(async (request) => {
						try {
							const clientData = await fetchUserData(request.clientId);
							const isActive = (clientData as any)?.is_active !== false;
							return clientData && isActive ? request : null;
						} catch (innerError) {
							console.error(`Error checking client ${request.clientId} active status:`, innerError);
							return null;
						}
					}),
				);

				if (disposed) return;

				setData(activeRequests.filter(Boolean));
				setError(null);
				setLoading(false);
			},
			(err: unknown) => {
				if (disposed) return;
				setError(toError(err));
				setLoading(false);
				console.error(`[useAssignedClients] ✗ Listener error:`, err);
			},
		);

		return () => {
			disposed = true;
			unsubscribe();
		};
	}, [realtorId, reloadKey]);

	return { data, loading, error, refetch };
};


/**
 * 
 * @param realtorId 
 * @param clientId 
 * @param role - Required to determine if
 * @returns 
 */
export const usePendingClientRequests = (userId: string | null | undefined, role: "client" | "agent"): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when realtorId changes
	useEffect(() => {
		if (!userId) {
			setData([]);
			setError(null);
			setLoading(false);
			return;
		}

		console.log(`[usePendingClientRequests] Listening for pending requests for user: ${userId}`);
		setLoading(true);

		const field = role === "client" ? "clientId" : "realtorId";
		const requestsRef = collection(db, "clientRequests");
		const q = query(requestsRef, where("status", "==", "Pending"), where(field, "==", userId));

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const requests = sortByCreatedAtDesc(
					snapshot.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() } as ClientRequest)),
				);

				setData(requests);
				setError(null);
				setLoading(false);
			},
			(err: unknown) => {
				setError(toError(err));
				setLoading(false);
				console.error(`[usePendingClientRequests] ✗ Listener error:`, err);
			},
		);

		return () => unsubscribe();
	}, [userId, role, reloadKey]);

	return { data, loading, error, refetch };
};
