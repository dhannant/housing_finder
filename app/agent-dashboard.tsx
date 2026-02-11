import { auth, db } from "@/components/firebaseConfig";
import { useRouter } from "expo-router";
import { addDoc, collection, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Briefcase, Mail, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ClientRequest {
	id: string;
	clientId: string;
	clientName: string;
	clientEmail: string;
	realtorId: string;
	status: string;
	createdAt: any;
}

interface AvailableClients {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	createdAt: any;
}

interface UserData {
	firstName: string;
	lastName: string;
	email: string;
	role: string;
}

export default function RealtorDashboard() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [clientRequests, setClientRequests] = useState<ClientRequest[]>([]);
	const [userData, setUserData] = useState<UserData | null>(null);
	const [availableClients, setAvailableClients] = useState<AvailableClients[]>([]);

	// once the screen loads, useEffect will trigger and call the fetchUserData, fetchClientRequests, and fetchAvailableClients functions to populate the dashboard with the relevant data for the logged in agent
	useEffect(() => {
		fetchUserData();
		fetchClientRequests();
		fetchAvailableClients();
	}, []);

	// Fetches the current user's data from Firestore and sets it in state for use in the dashboard (e.g., displaying the agent's name in the welcome message).
	const fetchUserData = async () => {
		try {
			const user = auth.currentUser;
			if (user) {
				const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", user.uid)));
				if (!userDoc.empty) {
					const data = userDoc.docs[0].data() as UserData;
					setUserData(data);
				}
			}
		} catch (error) {
			console.error("Error fetching user data:", error);
		}
	};

	// Fetches client-agent requests from Firestore that are assigned to the logged-in agent and sets them in state to be displayed in the dashboard.
	const fetchClientRequests = async () => {
		try {
			const user = auth.currentUser;
			if (!user) return;

			const requestsRef = collection(db, "clientRequests");
			const q = query(requestsRef, where("realtorId", "==", user.uid));
			const querySnapshot = await getDocs(q);

			const requests: ClientRequest[] = [];
			querySnapshot.forEach((doc) => {
				requests.push({ id: doc.id, ...doc.data() } as ClientRequest);
			});

			// Sort by creation date, newest first
			requests.sort((a, b) => {
				const dateA = a.createdAt?.toDate?.() || new Date(0);
				const dateB = b.createdAt?.toDate?.() || new Date(0);
				return dateB.getTime() - dateA.getTime();
			});

			setClientRequests(requests);
		} catch (error) {
			console.error("Error fetching client requests:", error);
			Alert.alert("Error", "Failed to load client requests");
		} finally {
			setLoading(false);
		}
	};

	// Fetches clients from Firestore that do not currently have an assigned agent and sets them in state to be displayed in the "Available Clients" section of the dashboard.
	const fetchAvailableClients = async () => {
		try {
			const user = auth.currentUser;
			if (!user) return;

			// Pull ALL users with a "client" role
			const unassignedClientsRef = collection(db, "users");
			const clientsQuery = query(unassignedClientsRef, where("role", "==", "Client"));
			const clientsSnapshot = await getDocs(clientsQuery);

			const availableClients: AvailableClients[] = [];

			// For each client, check if they have an assigned realtor (checking the clientRequest collection)
			for (const clientDoc of clientsSnapshot.docs) {
				const clientData = clientDoc.data();
				const clientId = clientDoc.id;

				// check the clientRequests collection for this clientID
				const requestsRef = collection(db, "clientRequests");
				const requestsQuery = query(requestsRef, where("clientId", "==", clientId));
				const requestsSnapshot = await getDocs(requestsQuery);

				// If there are no requests OR requests are unassigned, add the clientID to the availableClients list
				const hasAssignedAgent = requestsSnapshot.docs.some((reqDoc) => reqDoc.data().realtorId && reqDoc.data().realtorId !== "");
				if (!hasAssignedAgent) {
					availableClients.push({ id: clientId, ...clientData } as AvailableClients);
				}
			}

			setAvailableClients(availableClients);

			// Sort by creation date, newest first
			availableClients.sort((a, b) => {
				const dateA = a.createdAt?.toDate?.() || new Date(0);
				const dateB = b.createdAt?.toDate?.() || new Date(0);
				return dateB.getTime() - dateA.getTime();
			});
		} catch (error) {
			console.error("Error fetching available clients:", error);
			Alert.alert("Error", "Failed to load available clients");
		} finally {
			setLoading(false);
		}
	};

	// Assign client to agent
	//this function is called when the agent clicks the "Assign Client" button on an available client.
	// It creates a new clientRequest document in Firestore to establish the relationship between the agent and client, then refreshes the lists to reflect the changes.
	const handleAssignClient = async (clientId: string) => {
		try {
			const user = auth.currentUser;
			if (!user) return;
			// Create a new clientRequest document to assign the client to the agent
			await addDoc(collection(db, "clientRequests"), { clientId, realtorId: user.uid, status: "Approved", createdAt: new Date() });
			await fetchClientRequests();
			await fetchAvailableClients();
		} catch (error) {
			console.error("Error assigning client:", error);
			Alert.alert("Error", "Failed to assign client");
		}
	};

	// Release client handler (removes the agent - client relationship, making the client available again)
	const handleReleaseClient = async (clientId: string) => {
		try {
			// Remove agent assignment from user document
			const clientRef = doc(db, "users", clientId);
			await updateDoc(clientRef, { agentId: "" }); // Or null, as your schema requires
			setAvailableClients((prev) => prev.filter((client) => client.id !== clientId));
			await fetchAvailableClients(); // Refresh the list to reflect changes
			Alert.alert("Client released!");
		} catch (error) {
			Alert.alert("Error", "Failed to release client");
		}
	};

	const handleCall = (phone: string) => {
		Linking.openURL(`tel:${phone}`);
	};

	const handleEmail = (email: string) => {
		Linking.openURL(`mailto:${email}`);
	};

	const handleLogout = async () => {
		try {
			await auth.signOut();
			router.replace("/");
		} catch (error) {
			console.error("Error logging out:", error);
		}
	};

	const formatDate = (timestamp: any) => {
		if (!timestamp) return "Unknown date";
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator
						size="large"
						color="#2C5F2D"
					/>
					<Text style={styles.loadingText}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<View style={styles.headerContent}>
					<Briefcase
						color="#2C5F2D"
						size={32}
					/>
					<View style={styles.headerTextContainer}>
						<Text style={styles.headerTitle}>Agent Dashboard</Text>
						<Text style={styles.headerSubtitle}>Welcome, {userData?.firstName || "Agent"}!</Text>
					</View>
				</View>
				<TouchableOpacity
					style={styles.logoutButton}
					onPress={handleLogout}>
					<Text style={styles.logoutButtonText}>Logout</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}>
				<View style={styles.statsCard}>
					<Text style={styles.statsTitle}>Client Requests</Text>
					<Text style={styles.statsNumber}>{clientRequests.length}</Text>
					<Text style={styles.statsSubtitle}>Total requests received</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Client Requests</Text>
					<Text style={styles.sectionDescription}>These are clients who have requested to work with you.</Text>
				</View>

				{clientRequests.length === 0 ? (
					<View style={styles.emptyState}>
						<User
							color="#CCCCCC"
							size={48}
						/>
						<Text style={styles.emptyStateText}>No client requests yet.</Text>
						<Text style={styles.emptyStateSubtext}>Clients will appear here when they select you as their realtor.</Text>
					</View>
				) : (
					<View style={styles.requestsContainer}>
						{clientRequests.map((request) => (
							<View
								key={request.id}
								style={styles.requestCard}>
								<View style={styles.requestHeader}>
									<View style={styles.clientAvatar}>
										<User
											color="#FFFFFF"
											size={24}
										/>
									</View>
									<View style={styles.requestInfo}>
										<Text style={styles.clientName}>{request.clientName}</Text>
										<Text style={styles.requestDate}>{formatDate(request.createdAt)}</Text>
									</View>
									<View style={[styles.statusBadge, request.status === "pending" && styles.pendingBadge]}>
										<Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
									</View>
								</View>

								<View style={styles.requestDetails}>
									<View style={styles.detailRow}>
										<Mail
											color="#666666"
											size={16}
										/>
										<Text style={styles.detailText}>{request.clientEmail}</Text>
									</View>
								</View>

								<View style={styles.requestActions}>
									<TouchableOpacity
										style={styles.actionButton}
										onPress={() => handleEmail(request.clientEmail)}>
										<Mail
											color="#2C5F2D"
											size={18}
										/>
										<Text style={styles.actionButtonText}>Email</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={styles.actionButton}
										onPress={() => handleReleaseClient(request.id)}>
										<Text style={styles.actionButtonText}>Release Client</Text>
									</TouchableOpacity>
								</View>
							</View>
						))}
					</View>
				)}

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Available Clients</Text>
					<Text style={styles.sectionDescription}>
						New clients below do not currently have an agent assigned. Reach out to them to offer your services!
					</Text>
				</View>

				{availableClients.length === 0 ? (
					<View style={styles.emptyState}>
						<User
							color="#CCCCCC"
							size={48}
						/>
						<Text style={styles.emptyStateText}>No available clients.</Text>
						<Text style={styles.emptyStateSubtext}>Clients will appear here when they are not assigned to an agent.</Text>
					</View>
				) : (
					<View style={styles.requestsContainer}>
						{availableClients.map((client) => (
							<View
								key={client.id}
								style={styles.requestCard}>
								<View style={styles.requestHeader}>
									<View style={styles.clientAvatar}>
										<User
											color="#FFFFFF"
											size={24}
										/>
									</View>
									<View style={styles.requestInfo}>
										<Text style={styles.clientName}>
											{client.firstName} {client.lastName}
										</Text>
										<Text style={styles.requestDate}>{formatDate(client.createdAt)}</Text>
									</View>
								</View>
								<View style={styles.requestDetails}>
									<View style={styles.detailRow}>
										<Mail
											color="#666666"
											size={16}
										/>
										<Text style={styles.detailText}>{client.email}</Text>
									</View>
								</View>
								<View style={styles.requestActions}>
									<TouchableOpacity
										style={styles.actionButton}
										onPress={() => handleAssignClient(client.id)}>
										<Text style={styles.actionButtonText}>Assign Client</Text>
									</TouchableOpacity>
								</View>
							</View>
						))}
					</View>
				)}

				<TouchableOpacity
					style={styles.navigateButton}
					onPress={() => router.push("/(tabs)/map")}>
					<Text style={styles.navigateButtonText}>View Properties</Text>
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
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: "#F0F7F0",
		marginRight: 12,
	},
	actionButtonText: { fontSize: 14, fontWeight: "600", color: "#2C5F2D", marginLeft: 6 },
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
