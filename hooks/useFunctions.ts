import { db } from "@/components/firebaseConfig";
import { fetchCalendarEvents, fetchRealtors, fetchUnassignedClients, fetchUserData, } from "@/utils/functions";
import type { AgentAssignedClientPropertyListing, ClientData, ClientPropertyListing, ClientRequest, GetCalendarEventsResponse, RealtorData, ShowingRequest, UserData } from "@/utils/interfaces";
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

const sortShowingRequestsByUpdatedAtDesc = (requests: ShowingRequest[]): ShowingRequest[] => {
	return [...requests].sort((a, b) => {
		const dateA = Number.isFinite(new Date(a.updatedAt).getTime()) ? new Date(a.updatedAt).getTime() : 0;
		const dateB = Number.isFinite(new Date(b.updatedAt).getTime()) ? new Date(b.updatedAt).getTime() : 0;
		return dateB - dateA;
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
				   // [REMOVED LOG]
				setData(null);
				setError(null);
				setLoading(false);
				return;
			}
			   // [REMOVED LOG]
			try {
				setLoading(true);
				const result = await fetchUserData(userId);
				setData(result);
				setError(null);
				   // [REMOVED LOG]
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

export const useRealtors = (): UseDataReturn<RealtorData[]> => {
const [data, setData] = useState<RealtorData[]>([]);
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
			   // [REMOVED LOG]
			try {
				setLoading(true);
				const result = await fetchRealtors();
				setData(result);
				setError(null);
				   // [REMOVED LOG]
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

export const useUnassignedClients = (): UseDataReturn<ClientData[]> => {
const [data, setData] = useState<ClientData[]>([]);
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
			   // [REMOVED LOG]
			try {
				setLoading(true);
				const result = await fetchUnassignedClients();
				setData(result);
				setError(null);
				   // [REMOVED LOG]
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
			   // [REMOVED LOG]
			setData(null);
			setError(null);
			setLoading(false);
			return;
		}

		// [REMOVED LOG]
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

export const useAssignedClients = (realtorId: string | null | undefined): UseDataReturn<ClientRequest[]> => {
const [data, setData] = useState<ClientRequest[]>([]);
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
			   // [REMOVED LOG]
			setData([]);
			setError(null);
			setLoading(false);
			return;
		}

		// [REMOVED LOG]
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

				setData(activeRequests.filter((r): r is ClientRequest => r !== null));
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

		// [REMOVED LOG]
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

export const useClientShowingRequests = (clientId: string | null | undefined): UseDataReturn<ShowingRequest[]> => {
	const [data, setData] = useState<ShowingRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	useEffect(() => {
		if (!clientId) {
			setData([]);
			setError(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		const showingRequestsRef = collection(db, "showingRequests");
		const q = query(showingRequestsRef, where("clientId", "==", clientId));

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const showingRequests = sortShowingRequestsByUpdatedAtDesc(
					snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ShowingRequest)),
				);
				setData(showingRequests);
				setError(null);
				setLoading(false);
			},
			(err: unknown) => {
				setError(toError(err));
				setLoading(false);
				console.error(`[useClientShowingRequests] Listener error for client ${clientId}:`, err);
			},
		);

		return () => unsubscribe();
	}, [clientId, reloadKey]);

	return { data, loading, error, refetch };
};

export const useAgentShowingRequests = (realtorId: string | null | undefined): UseDataReturn<ShowingRequest[]> => {
	const [data, setData] = useState<ShowingRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	useEffect(() => {
		if (!realtorId) {
			setData([]);
			setError(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		const showingRequestsRef = collection(db, "showingRequests");
		const q = query(showingRequestsRef, where("realtorId", "==", realtorId));

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const showingRequests = sortShowingRequestsByUpdatedAtDesc(
					snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ShowingRequest)),
				);
				setData(showingRequests);
				setError(null);
				setLoading(false);
			},
			(err: unknown) => {
				setError(toError(err));
				setLoading(false);
				console.error(`[useAgentShowingRequests] Listener error for agent ${realtorId}:`, err);
			},
		);

		return () => unsubscribe();
	}, [realtorId, reloadKey]);

	return { data, loading, error, refetch };
};

const toMillis = (value: any): number => {
	try {
		if (!value) return 0;
		if (typeof value?.toDate === "function") return value.toDate().getTime();
		if (value instanceof Date) return value.getTime();
		const parsed = new Date(value).getTime();
		return Number.isFinite(parsed) ? parsed : 0;
	} catch {
		return 0;
	}
};

export const useAgentAssignedPropertyListings = (
	agentId: string | null | undefined,
): UseDataReturn<AgentAssignedClientPropertyListing[]> => {
	const [data, setData] = useState<AgentAssignedClientPropertyListing[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	useEffect(() => {
		if (!agentId) {
			setData([]);
			setError(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		let disposed = false;

		const listingsRef = collection(db, "clientPropertyListings");
		const q = query(listingsRef, where("assignedAgentId", "==", agentId));

		const unsubscribe = onSnapshot(
			q,
			async (snapshot) => {
				const rawListings = snapshot.docs.map(
					(docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ClientPropertyListing),
				);

				const enriched = await Promise.all(
					rawListings.map(async (listing) => {
						const client = await fetchUserData(listing.clientId);
						const firstName = client?.firstName?.trim() || "";
						const lastName = client?.lastName?.trim() || "";
						const clientName = `${firstName} ${lastName}`.trim() || "Client";

						return {
							...listing,
							id: listing.id || "",
							clientName,
							clientEmail: client?.email || listing.contactEmail || "",
							clientPhoneNumber: client?.phoneNumber || listing.contactPhone || "",
						} as AgentAssignedClientPropertyListing;
					}),
				);

				enriched.sort((a, b) => {
					const aTime = toMillis(a.submittedAt || a.createdAt);
					const bTime = toMillis(b.submittedAt || b.createdAt);
					return bTime - aTime;
				});

				if (disposed) return;
				setData(enriched);
				setError(null);
				setLoading(false);
			},
			(err: unknown) => {
				if (disposed) return;
				setError(toError(err));
				setLoading(false);
				console.error("[useAgentAssignedPropertyListings] Listener error:", err);
			},
		);

		return () => {
			disposed = true;
			unsubscribe();
		};
	}, [agentId, reloadKey]);

	return { data, loading, error, refetch };
};

export const useCalendarEvents = (
	role: "agent" | "client" | null,
	activeOfferId?: string | null,
): UseDataReturn<GetCalendarEventsResponse> => {
	const [data, setData] = useState<GetCalendarEventsResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	useEffect(() => {
		if (!role) {
			setData(null);
			setLoading(false);
			return;
		}
		let cancelled = false;
		const load = async () => {
			try {
				setLoading(true);
				const result = await fetchCalendarEvents(role, activeOfferId);
				if (!cancelled) {
					setData(result);
					setError(null);
				}
			} catch (err: unknown) {
				if (!cancelled) setError(toError(err));
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => { cancelled = true; };
	}, [role, activeOfferId, reloadKey]);

	return { data, loading, error, refetch };
};
