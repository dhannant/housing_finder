import { auth, db } from "@/components/firebaseConfig";
import { agentDashboardStyles } from "@/constants/styles";
import { useAssignedClients, usePendingClientRequests, useUnassignedClients, useUserData } from "@/hooks/useFunctions";
import { fetchUserData, formatDate } from "@/utils/functions";
import { AvailableClients, ClientRequest, UserData } from "@/utils/interfaces";
import { useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Briefcase, Mail, Phone, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

// Modal component for entering decline reason
interface DeclineReasonModalProps {
	visible: boolean;
	onCancel: () => void;
	onSubmit: () => void;
	reason: string;
	setReason: (reason: string) => void;
}

function DeclineReasonModal({
	visible,
	onCancel,
	onSubmit,
	reason,
	setReason,
}: DeclineReasonModalProps) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
		>
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
				<View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '80%' }}>
					<Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Reason for Decline</Text>
					<TextInput
						value={reason}
						onChangeText={setReason}
						placeholder="Enter reason..."
						style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 60, marginBottom: 16 }}
						multiline
					/>
					<View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
						<TouchableOpacity onPress={onCancel} style={{ marginRight: 16 }}>
							<Text style={{ color: '#666', fontWeight: '600' }}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={onSubmit}>
							<Text style={{ color: '#FF4444', fontWeight: '600' }}>Submit</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}


export default function RealtorDashboard() {
	// Decline modal state
	const [declineModalVisible, setDeclineModalVisible] = useState(false);
	const [declineReason, setDeclineReason] = useState("");
	const [declineClientId, setDeclineClientId] = useState<string | null>(null);
	const router = useRouter();
	const user = auth.currentUser;
	const { data: userData, loading: userLoading } = useUserData(user?.uid || null);
	const { data: assignedClients = [], refetch: refetchAssignedClients } = useAssignedClients(user?.uid || null);
	const { data: pendingRequests = [], refetch: refetchPendingRequests } = usePendingClientRequests(user?.uid || null, "agent");
	const { data: availableClients = [], refetch: refetchAvailableClients } = useUnassignedClients();
	const [clientDetails, setClientDetails] = useState<Record<string, UserData>>({});
	const [expandedSections, setExpandedSections] = useState({
		activeClients: true,
		pendingRequests: true,
		availableClients: true,
	});

	const toggleSection = (section: 'activeClients' | 'pendingRequests' | 'availableClients') => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const renderSectionHeader = (
		title: string,
		description: string,
		section: 'activeClients' | 'pendingRequests' | 'availableClients'
	) => (
		<TouchableOpacity
			onPress={() => toggleSection(section)}
			activeOpacity={0.8}
			style={{ marginBottom: 12 }}
		>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
				<Text style={agentDashboardStyles.sectionTitle}>{title}</Text>
				<Text style={{ fontSize: 18, color: '#666' }}>{expandedSections[section] ? '▾' : '▸'}</Text>
			</View>
			<Text style={agentDashboardStyles.sectionDescription}>{description}</Text>
		</TouchableOpacity>
	);


	// Fetch details for all assigned and pending clients
	useEffect(() => {
		const loadClientDetails = async () => {
			const allRequests = [
				...(assignedClients || []),
				...(pendingRequests || [])
			];
			if (allRequests.length === 0) return;

			const details: Record<string, UserData> = {};

			for (const request of allRequests) {
				if (!details[request.clientId] && !clientDetails[request.clientId]) {
					try {
						const data = await fetchUserData(request.clientId);
						if (data) {
							details[request.clientId] = data;
						}
					} catch (error) {
						console.error("Error fetching client details:", error);
					}
				} else if (clientDetails[request.clientId]) {
					details[request.clientId] = clientDetails[request.clientId];
				}
			}

			setClientDetails(details);
		};

		loadClientDetails();
	}, [assignedClients, pendingRequests]);

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

	const handleDeclineRequest = async (clientId: string, reason: string) => {
		try {
			if (!user) return;

			// get the pending request
			const requestsRef = collection(db, "clientRequests");
			const q = query(requestsRef, where("clientId", "==", clientId), where("status", "==", "Pending"));
			const snapshot = await getDocs(q);

			if (!snapshot.empty) {
				// Update existing pending request to approved
				const docRef = snapshot.docs[0].ref;
				await updateDoc(docRef, { status: "Declined", reason, realtorId: user.uid });
			}
			await refetchAssignedClients();
			await refetchPendingRequests();
			await refetchAvailableClients();
		} catch (error) {
			console.error("Error disapproving client:", error);
			Alert.alert("Error", "Failed to disapproved client");
		}
	}

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
					{renderSectionHeader('Active Clients', 'These are your currently active clients.', 'activeClients')}

					{expandedSections.activeClients && (assignedClients?.length === 0 ? (
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
												<User color="#FFFFFF" size={24} />
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
												onPress={() => router.push(`/agent/client-favorites?clientId=${request.clientId}`)}>
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
					))}
				</View>

				{/* Pending Requests Section */}
				<View style={agentDashboardStyles.section}>
					{renderSectionHeader('Pending Requests', 'These are clients who have requested to work with you.', 'pendingRequests')}

					{expandedSections.pendingRequests && (pendingRequests?.length === 0 ? (
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
												<Text style={agentDashboardStyles.actionButtonText}>Approve</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={[agentDashboardStyles.actionButton, { backgroundColor: '#FF4444', marginLeft: 8 }]}
												onPress={() => {
													setDeclineClientId(request.clientId);
													setDeclineReason("");
													setDeclineModalVisible(true);
												}}>
												<Text style={[agentDashboardStyles.actionButtonText, { color: '#fff' }]}>Decline</Text>
											</TouchableOpacity>
											<DeclineReasonModal
												visible={declineModalVisible}
												reason={declineReason}
												setReason={setDeclineReason}
												onCancel={() => setDeclineModalVisible(false)}
												onSubmit={async () => {
													if (declineClientId && declineReason.trim()) {
														await handleDeclineRequest(declineClientId, declineReason.trim());
														setDeclineModalVisible(false);
													} else {
														Alert.alert('Reason required', 'Please enter a reason for declining.');
													}
												}}
											/>
										</View>
									</View>
								);
							})}
						</View>
					))}
				</View>

				{/* Available Clients Section */}
				<View style={agentDashboardStyles.section}>
					{renderSectionHeader(
						'Available Clients',
						'New clients below do not currently have an agent assigned. Reach out to them to offer your services!',
						'availableClients'
					)}

					{expandedSections.availableClients && (availableClients?.length === 0 ? (
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
					))}
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


