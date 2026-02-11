import {
    fetchAssignedClients,
    fetchAssignedRealtor,
    fetchPendingClientRequests,
    fetchRealtors,
    fetchUnassignedClients,
    fetchUserData
} from "@/utils/functions";
import { useEffect, useState } from "react";

interface UseDataReturn<T> {
	data: T | null;
	loading: boolean;
	error: Error | null;
	refetch: () => Promise<void>;
}

export const useUserData = (userId: string | null): UseDataReturn<any> => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const refetch = async () => {
		if (!userId) return;
		try {
			setLoading(true);
			const result = await fetchUserData(userId);
			setData(result);
			setError(null);
		} catch (err: any) {
			setError(err);
			console.error("useUserData error:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refetch();
	}, [userId]);

	return { data, loading, error, refetch };
};

export const useRealtors = (): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const refetch = async () => {
		try {
			setLoading(true);
			const result = await fetchRealtors();
			setData(result);
			setError(null);
		} catch (err: any) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refetch();
	}, []);

	return { data, loading, error, refetch };
};

export const useUnassignedClients = (): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const refetch = async () => {
		try {
			setLoading(true);
			const result = await fetchUnassignedClients();
			setData(result);
			setError(null);
		} catch (err: any) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refetch();
	}, []);

	return { data, loading, error, refetch };
};

export const useAssignedRealtor = (clientId: string | null): UseDataReturn<string | null> => {
	const [data, setData] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const refetch = async () => {
		if (!clientId) return;
		try {
			setLoading(true);
			const result = await fetchAssignedRealtor(clientId);
			setData(result);
			setError(null);
		} catch (err: any) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refetch();
	}, [clientId]);

	return { data, loading, error, refetch };
};

export const useAssignedClients = (realtorId: string | null): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const refetch = async () => {
		if (!realtorId) return;
		try {
			setLoading(true);
			const result = await fetchAssignedClients(realtorId);
			setData(result);
			setError(null);
		} catch (err: any) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refetch();
	}, [realtorId]);

	return { data, loading, error, refetch };
};

export const usePendingClientRequests = (realtorId?: string): UseDataReturn<any[]> => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const refetch = async () => {
		try {
			setLoading(true);
			const result = await fetchPendingClientRequests(realtorId);
			setData(result);
			setError(null);
		} catch (err: any) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refetch();
	}, [realtorId]);

	return { data, loading, error, refetch };
};
