import { auth } from "@/components/firebaseConfig";
import { useAgentShowingRequests } from "@/hooks/useFunctions";
import { confirmShowingRequest, declineShowingRequest, fetchUserData } from "@/utils/functions";
import type { ShowingRequest, UserData } from "@/utils/interfaces";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function blockLabel(start: string, end: string): string {
	return `${start} - ${end}`;
}

export default function AgentShowingsScreen() {
	const user = auth.currentUser;
	const { data: requests = [], loading, refetch } = useAgentShowingRequests(user?.uid || null);
	const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
	const [clientLookup, setClientLookup] = useState<Record<string, UserData>>({});

	const sortedRequests = useMemo(
		() => [...requests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
		[requests],
	);

	useEffect(() => {
		const loadClientDetails = async () => {
			const uniqueClientIds = Array.from(new Set(sortedRequests.map((request) => request.clientId)));
			if (uniqueClientIds.length === 0) return;

			const nextLookup: Record<string, UserData> = { ...clientLookup };
			for (const clientId of uniqueClientIds) {
				if (nextLookup[clientId]) continue;
				try {
					const client = await fetchUserData(clientId);
					if (client) nextLookup[clientId] = client;
				} catch (error) {
					console.error("[AgentShowings] Error loading client:", error);
				}
			}

			setClientLookup(nextLookup);
		};

		loadClientDetails();
	}, [sortedRequests]);

	const onConfirm = async (request: ShowingRequest, blockIndex: number) => {
		setBusyRequestId(request.id);
		try {
			await confirmShowingRequest(request.id, blockIndex);
			await refetch();
			Alert.alert("Showing confirmed", "The client will be notified.");
		} catch (error) {
			console.error("[AgentShowings] confirm error:", error);
			Alert.alert("Error", "Failed to confirm showing request.");
		} finally {
			setBusyRequestId(null);
		}
	};

	const onDecline = async (request: ShowingRequest) => {
		setBusyRequestId(request.id);
		try {
			await declineShowingRequest(request.id, "No compatible time available.");
			await refetch();
			Alert.alert("Showing declined", "The client will be notified.");
		} catch (error) {
			console.error("[AgentShowings] decline error:", error);
			Alert.alert("Error", "Failed to decline showing request.");
		} finally {
			setBusyRequestId(null);
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingWrap}>
					<ActivityIndicator size="large" color="#0F5132" />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.title}>Showing Requests</Text>

				{sortedRequests.length === 0 && (
					<View style={styles.card}>
						<Text style={styles.emptyText}>No showing requests right now.</Text>
					</View>
				)}

				{sortedRequests.map((request) => {
					const client = clientLookup[request.clientId];
					const statusColor =
						request.status === "confirmed" ? "#0F5132" : request.status === "declined" ? "#8B1E3F" : "#1F3B57";
					const confirmedBlock =
						request.confirmedBlockIndex !== null && request.requestedBlocks[request.confirmedBlockIndex]
							? request.requestedBlocks[request.confirmedBlockIndex]
							: null;

					return (
						<View style={styles.card} key={request.id}>
							<Text style={styles.clientName}>
								{client ? `${client.firstName} ${client.lastName}` : request.clientId}
							</Text>
							<Text style={styles.metaText}>Property ID: {request.propertyId}</Text>
							<Text style={[styles.statusText, { color: statusColor }]}>Status: {request.status}</Text>
							{request.clientNotes ? <Text style={styles.metaText}>Client note: {request.clientNotes}</Text> : null}

							{request.status === "pending" && (
								<View style={styles.blockList}>
									{request.requestedBlocks.map((block, index) => (
										<TouchableOpacity
											key={`${request.id}-${index}`}
											style={styles.blockButton}
											disabled={busyRequestId === request.id}
											onPress={() => onConfirm(request, index)}
										>
											<Text style={styles.blockButtonText}>{blockLabel(block.start, block.end)}</Text>
											<Text style={styles.blockButtonSubText}>Tap to Confirm</Text>
										</TouchableOpacity>
									))}
									<TouchableOpacity
										style={styles.declineButton}
										disabled={busyRequestId === request.id}
										onPress={() => onDecline(request)}
									>
										<Text style={styles.declineButtonText}>Decline Request</Text>
									</TouchableOpacity>
								</View>
							)}

							{request.status === "confirmed" && confirmedBlock && (
								<Text style={styles.confirmedText}>Confirmed: {blockLabel(confirmedBlock.start, confirmedBlock.end)}</Text>
							)}
						</View>
					);
				})}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F5F7FA",
	},
	loadingWrap: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		padding: 16,
		gap: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#102542",
	},
	card: {
		backgroundColor: "#FFFFFF",
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: "#E1E5EB",
		gap: 8,
	},
	clientName: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1F2937",
	},
	metaText: {
		fontSize: 13,
		color: "#4B5563",
	},
	statusText: {
		fontSize: 13,
		fontWeight: "700",
	},
	blockList: {
		gap: 8,
	},
	blockButton: {
		padding: 10,
		backgroundColor: "#E9F3FF",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#C9DFF8",
	},
	blockButtonText: {
		color: "#12324F",
		fontWeight: "700",
	},
	blockButtonSubText: {
		color: "#35516B",
		fontSize: 12,
		marginTop: 2,
	},
	declineButton: {
		alignItems: "center",
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: "#FDE8E8",
		borderWidth: 1,
		borderColor: "#F8C5C5",
	},
	declineButtonText: {
		color: "#9B1C1C",
		fontWeight: "700",
	},
	confirmedText: {
		color: "#0F5132",
		fontWeight: "700",
	},
	emptyText: {
		color: "#6B7280",
	},
});
