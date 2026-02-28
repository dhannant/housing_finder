import {
	fetchAssignedClients,
	fetchAssignedRealtor,
	fetchPendingClientRequests,
	fetchRealtors,
	fetchUnassignedClients,
	fetchUserData,
} from "@/utils/functions";
import { RealtorData, UserData } from "@/utils/interfaces";
import { useEffect, useState } from "react";

interface UseDataReturn<T> {
	data: T | null;
	loading: boolean;
	error: Error | null;
	refetch: () => Promise<void>;
}

export const useUserData = (userId: string | null | undefined): UseDataReturn<UserData> => {
	const [data, setData] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
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
			} catch (err: any) {
				setError(err);
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
	const [error, setError] = useState(null);
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
			} catch (err: any) {
				setError(err);
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
	const [error, setError] = useState(null);
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
			} catch (err: any) {
				setError(err);
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
	const [data, setData] = useState<RealtorData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when clientId changes
	useEffect(() => {
		const loadAssignedRealtor = async () => {
			if (!clientId) {
				console.log(`[useAssignedRealtor] No clientId provided`);
				setData(null);
				setError(null);
				setLoading(false);
				return;
			}
			console.log(`[useAssignedRealtor] Checking realtor for client: ${clientId}`);
			try {
				setLoading(true);
				const result = await fetchAssignedRealtor(clientId);
				setData(result);
				setError(null);
				console.log(`[useAssignedRealtor] ✓ Realtor: ${result || "none"}`);
			} catch (err: any) {
				setError(err);
				console.error(`[useAssignedRealtor] ✗ Error for client ${clientId}:`, err);
			} finally {
				setLoading(false);
			}
		};

		loadAssignedRealtor();
	}, [clientId, reloadKey]);

	return { data, loading, error, refetch };
};

export const useAssignedClients = (realtorId: string | null | undefined): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when realtorId changes
	useEffect(() => {
		const loadAssignedClients = async () => {
			if (!realtorId) {
				console.log(`[useAssignedClients] No realtorId provided`);
				setData([]);
				setError(null);
				setLoading(false);
				return;
			}
			console.log(`[useAssignedClients] Refetching assigned clients for realtor: ${realtorId}`);
			try {
				setLoading(true);
				const result = await fetchAssignedClients(realtorId);
				setData(result);
				setError(null);
				console.log(`[useAssignedClients] ✓ Loaded ${result.length} assigned clients`);
			} catch (err: any) {
				setError(err);
				console.error(`[useAssignedClients] ✗ Error loading assigned clients:`, err);
			} finally {
				setLoading(false);
			}
		};

		loadAssignedClients();
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
	const [error, setError] = useState(null);
	const [reloadKey, setReloadKey] = useState(0);

	// Manual refetch for component to call after mutations
	const refetch = async () => {
		setReloadKey((prev) => prev + 1);
	};

	// Load data on mount AND when realtorId changes
	useEffect(() => {
		const loadPendingRequests = async () => {
			if (!userId) {
				setData([]);
				setError(null);
				setLoading(false);
				return;
			}
			console.log(`[usePendingClientRequests] Refetching pending requests for user: ${userId}`);
			try {
				setLoading(true);
				const result = await fetchPendingClientRequests(userId, role);
				setData(result);
				setError(null);
				console.log(`[usePendingClientRequests] ✓ Loaded ${result.length} pending requests`);
			} catch (err: any) {
				setError(err);
				console.error(`[usePendingClientRequests] ✗ Error loading pending requests:`, err);
			} finally {
				setLoading(false);
			}
		};

		loadPendingRequests();
	}, [userId, role, reloadKey]);

	return { data, loading, error, refetch };
};
