import { auth, db } from "@/components/firebaseConfig";
import { agentDashboardStyles } from "@/constants/styles";
import { useAssignedClients, usePendingClientRequests, useUnassignedClients, useUserData } from "@/hooks/useFunctions";
import { fetchUserData, formatDate } from "@/utils/functions";
import { AvailableClients, ClientRequest, UserData } from "@/utils/interfaces";
import { useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Briefcase, Mail, Phone, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';


export default function RealtorDashboard() {
	const router = useRouter();
	const user = auth.currentUser;
	const { data: userData, loading: userLoading } = useUserData(user?.uid || null);
	const { data: assignedClients = [], refetch: refetchAssignedClients } = useAssignedClients(user?.uid || null);
	const { data: pendingRequests = [], refetch: refetchPendingRequests } = usePendingClientRequests(user?.uid || null);
	const { data: availableClients = [], refetch: refetchAvailableClients } = useUnassignedClients();
	const [clientDetails, setClientDetails] = useState<Record<string, UserData>>({});
	const [loadingDetails, setLoadingDetails] = useState(false);

	// Fetch details for all assigned clients
	useEffect(() => {
		const loadClientDetails = async () => {
			if (!assignedClients || assignedClients.length === 0) return;

			setLoadingDetails(true);
			const details: Record<string, UserData> = {};

			for (const request of assignedClients) {
				if (!details[request.clientId]) {
					try {
						const data = await fetchUserData(request.clientId);
						if (data) {
							details[request.clientId] = data;
						}
					} catch (error) {
						console.error("Error fetching client details:", error);
					}
				}
			}

			setClientDetails(details);
			setLoadingDetails(false);
		};

		loadClientDetails();
	}, [assignedClients]);

	const handleAssignClient = async (clientId: string) => {
		try {
			if (!user) return;

			// Check if there's an existing pending request for this client
			const requestsRef = collection(db, "clientRequests");
			const q = query(requestsRef, where("clientId", "==", clientId), where("status", "==", "Pending"));
			const snapshot = await getDocs(q);

			if (!snapshot.empty) {
				// Update existing pending request to approved
				const docRef = snapshot.docs[0].ref;
				await updateDoc(docRef, { status: "Approved", realtorId: user.uid });
			} else {
				// No pending request exists, create a new approved request
				await addDoc(requestsRef, { clientId, realtorId: user.uid, status: "Approved", createdAt: new Date() });
			}
			await refetchAssignedClients();
			await refetchPendingRequests();
			await refetchAvailableClients();
		} catch (error) {
			console.error("Error assigning client:", error);
			Alert.alert("Error", "Failed to assign client");
		}
	};

	const handleReleaseClient = async (clientId: string) => {
		try {
			const requestsRef = collection(db, "clientRequests");
			const q = query(requestsRef, where("clientId", "==", clientId));
			const snapshot = await getDocs(q);

			for (const doc of snapshot.docs) {
				await deleteDoc(doc.ref); // Remove the request
			}

			await refetchAssignedClients();
			await refetchPendingRequests();
			await refetchAvailableClients();
			Alert.alert("Client released!");
		} catch (error) {
			console.error("Error releasing client:", error);
			Alert.alert("Error", "Failed to release client");
		}
	};

	const handleCall = (phone: string) => {
		if (phone) {
			Linking.openURL(`tel:${phone}`);
		}
	};

	const handleEmail = (email: string) => {
		if (email) {
			Linking.openURL(`mailto:${email}`);
		}
	};

	const handleLogout = async () => {
		try {
			await auth.signOut();
			router.replace("/");
		} catch (error) {
			console.error("Error logging out:", error);
		}
	};

	if (userLoading) {
		return (
			<SafeAreaView style={agentDashboardStyles.container}>
				<View style={agentDashboardStyles.loadingContainer}>
					<ActivityIndicator
						size="large"
						color="#2C5F2D"
					/>
					<Text style={agentDashboardStyles.loadingText}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={agentDashboardStyles.container}>
			<View style={agentDashboardStyles.header}>
				<View style={agentDashboardStyles.headerContent}>
					<Briefcase
						color="#2C5F2D"
						size={32}
					/>
					<View style={agentDashboardStyles.headerTextContainer}>
						<Text style={agentDashboardStyles.headerTitle}>Agent Dashboard</Text>
						<Text style={agentDashboardStyles.headerSubtitle}>Welcome, {userData?.firstName || "Agent"}!</Text>
					</View>
				</View>
				<TouchableOpacity
					style={agentDashboardStyles.logoutButton}
					onPress={handleLogout}>
					<Text style={agentDashboardStyles.logoutButtonText}>Logout</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				style={agentDashboardStyles.scrollView}
				contentContainerStyle={agentDashboardStyles.scrollContent}>
				{/* Active Clients Section */}
				<View style={agentDashboardStyles.section}>
					<Text style={agentDashboardStyles.sectionTitle}>Active Clients</Text>
					<Text style={agentDashboardStyles.sectionDescription}>These are your currently active clients.</Text>

					{assignedClients?.length === 0 ? (
						<View style={agentDashboardStyles.emptyState}>
							<User
								color="#CCCCCC"
								size={48}
							/>
							<Text style={agentDashboardStyles.emptyStateText}>No client assignments.</Text>
							<Text style={agentDashboardStyles.emptyStateSubtext}>You currently have no active clients.</Text>
						</View>
					) : (
						<View style={agentDashboardStyles.requestsContainer}>
							{assignedClients?.map((request: ClientRequest) => {
								const client = clientDetails[request.clientId];
								return (
									<View
										key={request.id}
										style={agentDashboardStyles.requestCard}>
										<View style={agentDashboardStyles.requestHeader}>
											<View style={agentDashboardStyles.clientAvatar}>
												<User
													color="#FFFFFF"
													size={24}
												/>
											</View>
											<View style={agentDashboardStyles.requestInfo}>
												<Text style={agentDashboardStyles.clientName}>{client ? `${client.firstName} ${client.lastName}` : "Loading..."}</Text>
												<Text style={agentDashboardStyles.requestDate}>{formatDate(request.createdAt)}</Text>
											</View>
											<View style={[agentDashboardStyles.statusBadge]}>
												<Text style={agentDashboardStyles.statusText}>{request.status.toUpperCase()}</Text>
											</View>
										</View>

										<View style={agentDashboardStyles.requestDetails}>
											{client?.email && (
												<TouchableOpacity
													style={agentDashboardStyles.detailRow}
													onPress={() => handleEmail(client.email)}>
													<Mail
														color="#666666"
														size={16}
													/>
													<Text style={agentDashboardStyles.detailText}>{client.email}</Text>
												</TouchableOpacity>
											)}
											{client?.phoneNumber && (
												<TouchableOpacity
													style={agentDashboardStyles.detailRow}
													onPress={() => handleCall(client.phoneNumber!)}>
													<Phone
														color="#666666"
														size={16}
													/>
													<Text style={agentDashboardStyles.detailText}>{client.phoneNumber}</Text>
												</TouchableOpacity>
											)}
										</View>

										<View style={agentDashboardStyles.requestActions}>
											<TouchableOpacity
												style={agentDashboardStyles.viewFavoritesButton}
												onPress={() => router.push(`/(shared_screens)/client_favorites_list?clientId=${request.clientId}`)}>
												<Text style={agentDashboardStyles.viewFavoritesButtonText}>View Favorites</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={agentDashboardStyles.actionButton}
												onPress={() => handleReleaseClient(request.clientId)}>
												<Text style={agentDashboardStyles.actionButtonText}>Release Client</Text>
											</TouchableOpacity>
										</View>
									</View>
								);
							})}
						</View>
					)}
				</View>

				{/* Pending Requests Section */}
				<View style={agentDashboardStyles.section}>
					<Text style={agentDashboardStyles.sectionTitle}>Pending Requests</Text>
					<Text style={agentDashboardStyles.sectionDescription}>These are clients who have requested to work with you.</Text>

					{pendingRequests?.length === 0 ? (
						<View style={agentDashboardStyles.emptyState}>
							<User
								color="#CCCCCC"
								size={48}
							/>
							<Text style={agentDashboardStyles.emptyStateText}>No pending requests.</Text>
							<Text style={agentDashboardStyles.emptyStateSubtext}>New client requests will appear here.</Text>
						</View>
					) : (
						<View style={agentDashboardStyles.requestsContainer}>
							{pendingRequests?.map((request: ClientRequest) => {
								const client = clientDetails[request.clientId];
								return (
									<View
										key={request.id}
										style={agentDashboardStyles.requestCard}>
										<View style={agentDashboardStyles.requestHeader}>
											<View style={agentDashboardStyles.clientAvatar}>
												<User
													color="#FFFFFF"
													size={24}
												/>
											</View>
											<View style={agentDashboardStyles.requestInfo}>
												<Text style={agentDashboardStyles.clientName}>{client ? `${client.firstName} ${client.lastName}` : "Loading..."}</Text>
												<Text style={agentDashboardStyles.requestDate}>{formatDate(request.createdAt)}</Text>
											</View>
											<View style={[agentDashboardStyles.statusBadge, agentDashboardStyles.pendingBadge]}>
												<Text style={agentDashboardStyles.statusText}>{request.status.toUpperCase()}</Text>
											</View>
										</View>

										<View style={agentDashboardStyles.requestDetails}>
											{client?.email && (
												<TouchableOpacity
													style={agentDashboardStyles.detailRow}
													onPress={() => handleEmail(client.email)}>
													<Mail
														color="#666666"
														size={16}
													/>
													<Text style={agentDashboardStyles.detailText}>{client.email}</Text>
												</TouchableOpacity>
											)}
											{client?.phoneNumber && (
												<TouchableOpacity
													style={agentDashboardStyles.detailRow}
													onPress={() => handleCall(client.phoneNumber!)}>
													<Phone
														color="#666666"
														size={16}
													/>
													<Text style={agentDashboardStyles.detailText}>{client.phoneNumber}</Text>
												</TouchableOpacity>
											)}
										</View>

										<View style={agentDashboardStyles.requestActions}>
											<TouchableOpacity
												style={agentDashboardStyles.actionButton}
												onPress={() => handleAssignClient(request.clientId)}>
												<Text style={agentDashboardStyles.actionButtonText}>Approve Request</Text>
											</TouchableOpacity>
										</View>
									</View>
								);
							})}
						</View>
					)}
				</View>

				{/* Available Clients Section */}
				<View style={agentDashboardStyles.section}>
					<Text style={agentDashboardStyles.sectionTitle}>Available Clients</Text>
					<Text style={agentDashboardStyles.sectionDescription}>
						New clients below do not currently have an agent assigned. Reach out to them to offer your services!
					</Text>

					{availableClients?.length === 0 ? (
						<View style={agentDashboardStyles.emptyState}>
							<User
								color="#CCCCCC"
								size={48}
							/>
							<Text style={agentDashboardStyles.emptyStateText}>No available clients.</Text>
							<Text style={agentDashboardStyles.emptyStateSubtext}>Clients will appear here when they are not assigned to an agent.</Text>
						</View>
					) : (
						<View style={agentDashboardStyles.requestsContainer}>
							{availableClients?.map((client: AvailableClients) => (
								<View
									key={client.id}
									style={agentDashboardStyles.requestCard}>
									<View style={agentDashboardStyles.requestHeader}>
										<View style={agentDashboardStyles.clientAvatar}>
											<User
												color="#FFFFFF"
												size={24}
											/>
										</View>
										<View style={agentDashboardStyles.requestInfo}>
											<Text style={agentDashboardStyles.clientName}>
												{client.firstName} {client.lastName}
											</Text>
											<Text style={agentDashboardStyles.requestDate}>{formatDate(client.createdAt)}</Text>
										</View>
									</View>
									<View style={agentDashboardStyles.requestDetails}>
										{client.email && (
											<TouchableOpacity
												style={agentDashboardStyles.detailRow}
												onPress={() => handleEmail(client.email)}>
												<Mail
													color="#666666"
													size={16}
												/>
												<Text style={agentDashboardStyles.detailText}>{client.email}</Text>
											</TouchableOpacity>
										)}
										{client.phoneNumber && (
											<TouchableOpacity
												style={agentDashboardStyles.detailRow}
												onPress={() => handleCall(client.phoneNumber!)}>
												<Phone
													color="#666666"
													size={16}
												/>
												<Text style={agentDashboardStyles.detailText}>{client.phoneNumber}</Text>
											</TouchableOpacity>
										)}
									</View>
									<View style={agentDashboardStyles.requestActions}>
										<TouchableOpacity
											style={agentDashboardStyles.actionButton}
											onPress={() => handleAssignClient(client.id)}>
											<Text style={agentDashboardStyles.actionButtonText}>Assign Client</Text>
										</TouchableOpacity>
									</View>
								</View>
							))}
						</View>
					)}
				</View>

				<TouchableOpacity
					style={agentDashboardStyles.navigateButton}
					onPress={() => router.push("/(tabs)/map")}>
					<Text style={agentDashboardStyles.navigateButtonText}>View Properties</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#F8F9FA" },
	header: {
		backgroundColor: "#FFFFFF",
		paddingVertical: 50,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E5E5",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerContent: { flexDirection: "row", alignItems: "center", flex: 1 },
	headerTextContainer: { marginLeft: 16 },
	headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
	headerSubtitle: { fontSize: 14, color: "#666666", marginTop: 4 },
	logoutButton: { backgroundColor: "#FF4444", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
	logoutButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
	scrollView: { flex: 1 },
	scrollContent: { paddingBottom: 40 },
	loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
	loadingText: { marginTop: 10, fontSize: 16, color: "#666666" },
	statsCard: { backgroundColor: "#2C5F2D", marginHorizontal: 16, marginTop: 16, marginBottom: 16, padding: 24, borderRadius: 12, alignItems: "center" },
	statsTitle: { fontSize: 16, color: "#FFFFFF", fontWeight: "600", marginBottom: 8 },
	statsNumber: { fontSize: 48, color: "#FFFFFF", fontWeight: "bold", marginBottom: 4 },
	statsSubtitle: { fontSize: 14, color: "#FFFFFF", opacity: 0.8 },
	section: { backgroundColor: "#FFFFFF", padding: 20, marginBottom: 16 },
	sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginBottom: 8 },
	sectionDescription: { fontSize: 14, color: "#666666", lineHeight: 20 },
	emptyState: { backgroundColor: "#FFFFFF", padding: 40, marginHorizontal: 16, borderRadius: 12, alignItems: "center" },
	emptyStateText: { fontSize: 16, color: "#666666", textAlign: "center", marginTop: 16, fontWeight: "600" },
	emptyStateSubtext: { fontSize: 14, color: "#999999", textAlign: "center", marginTop: 8 },
	requestsContainer: { paddingHorizontal: 16 },
	requestCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	requestHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
	clientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2C5F2D", justifyContent: "center", alignItems: "center" },
	requestInfo: { flex: 1, marginLeft: 12 },
	clientName: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A", marginBottom: 4 },
	requestDate: { fontSize: 12, color: "#999999" },
	statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
	pendingBadge: { backgroundColor: "#FFA500" },
	statusText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
	requestDetails: { borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 12, marginBottom: 12 },
	detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
	detailText: { fontSize: 14, color: "#666666", marginLeft: 8 },
	requestActions: {
		flexDirection: "row",
		borderTopWidth: 1,
		borderTopColor: "#F0F0F0",
		paddingTop: 12,
		justifyContent: "space-between",
		alignItems: "center",
	},
	actionButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#F0F7F0" },
	actionButtonText: { fontSize: 14, fontWeight: "600", color: "#2C5F2D", marginLeft: 6 },
	viewFavoritesButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#FF9800" },
	viewFavoritesButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
	navigateButton: {
		backgroundColor: "#007AFF",
		marginHorizontal: 16,
		marginTop: 8,
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 10,
		alignItems: "center",
	},
	navigateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
