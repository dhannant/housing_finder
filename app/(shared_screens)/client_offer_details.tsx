import * as styles from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserData } from "@/utils/functions";
import { OfferData } from '@/utils/interfaces';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { Mail, Phone, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Button, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

// Props: offerId, clientId, agentId, propertyId, initialOfferData
export default function ClientOfferDetailsScreen() {

	const { user, userData } = useAuth();
	const { offerId, clientId, agentId, propertyId, initialOfferData } = useLocalSearchParams();

	const [offerData, setOfferData] = useState<OfferData>({
		clientId: "",
		agentId: "",
		propertyId: "",
		offerId: "",
		status: "Offer Made",
		createdAt: new Date(),
		updatedAt: new Date(),
		dueDiligenceStart: null,
		dueDiligenceEnd: null,
		closingDate: null,
		inspectionDate: null,
		moveInDate: null,
		earnestMoneyDueDate: null,
		earnestMoneyAmountDue: null,
		notes: "",
		files: "",
	});
	const [isAgent, setIsAgent] = useState(false);
	const [isAssignedAgent, setIsAssignedAgent] = useState(false);

	const [agentData, setAgentData] = useState<any>(null);
	const [clientData, setClientData] = useState<any>(null);
	const [propertyData, setPropertyData] = useState<any>(null);

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

	useEffect(() => {
		async function checkRole() {
			if (!user?.uid) return;  //stop here if the user id isn't available
			const userData = await fetchUserData(user?.uid);
			if (agentId) setAgentData (await fetchUserData(agentId));
			if (clientId) setClientData (await fetchUserData(clientId));
			if (propertyId) setPropertyData (await fetchPropertyData(propertyId));

			setIsAgent(userData?.role === "Agent");
			setIsAssignedAgent(user?.uid === agentId);
		}
		checkRole();
	}, [user,clientId, agentId]);

	// Handler for agent editing fields
	const handleFieldChange = (field: keyof OfferData, value: any) => {
		setOfferData((prev: OfferData) => ({ ...prev, [field]: value, updatedAt: new Date() }));
	};

	// Handler for agent saving changes
	const handleSave = async () => {
		// TODO: Update Firestore document for offerId
		// You can use updateDoc or setDoc here
		alert("Offer updated!");
	};

	// Render fields (leave room for more fields)
	return (
		<ScrollView contentContainerStyle={styles.landingStyles.container}>
			<View style={styles.agentDashboardStyles.requestCard}>
				<View style={styles.agentDashboardStyles.requestHeader}>
					<View style={styles.agentDashboardStyles.clientAvatar}>
						<User color="#FFFFFF" size={24} />
					</View>
					<View style={styles.agentDashboardStyles.requestInfo}>
						<Text style={styles.agentDashboardStyles.clientName}>
						{clientData ? `${clientData.firstName} ${clientData.lastName}` : "Loading..."}
						</Text>
						{/* Add other info as needed */}
					</View>
					{/* ...other card sections... */}
				</View>
				<View style={styles.agentDashboardStyles.requestDetails}>
					{clientData?.email && (
						<TouchableOpacity style={styles.agentDashboardStyles.detailRow} onPress={() => handleEmail(clientData.email)}>
						<Mail color="#666666" size={16} />
						<Text style={styles.agentDashboardStyles.detailText}>{clientData.email}</Text>
						</TouchableOpacity>
					)}
					{clientData?.phoneNumber && (
						<TouchableOpacity style={styles.agentDashboardStyles.detailRow} onPress={() => handleCall(clientData.phoneNumber!)}>
						<Phone color="#666666" size={16} />
						<Text style={styles.agentDashboardStyles.detailText}>{clientData.phoneNumber}</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
				

			<Text style={[styles.landingStyles.logoTitle, { fontSize: 22, marginBottom: 24 }]}>Client Offer Details</Text>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
				<Text style={[styles.landingStyles.logoSubtitle, { fontWeight: "bold", width: 120 }]}>Client ID:</Text>
				<Text style={styles.landingStyles.buttonSubtitle}>{offerData.clientId}</Text>
			</View>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
				<Text style={[styles.landingStyles.logoSubtitle, { fontWeight: "bold", width: 120 }]}>Agent ID:</Text>
				<Text style={styles.landingStyles.buttonSubtitle}>{offerData.agentId}</Text>
			</View>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
				<Text style={[styles.landingStyles.logoSubtitle, { fontWeight: "bold", width: 120 }]}>Property ID:</Text>
				<Text style={styles.landingStyles.buttonSubtitle}>{offerData.propertyId}</Text>
			</View>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
				<Text style={[styles.landingStyles.logoSubtitle, { fontWeight: "bold", width: 120 }]}>Status:</Text>
				{isAgent && isAssignedAgent ? (
					<TextInput
						style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 8, fontSize: 16, borderRadius: 4 }}
						value={offerData.status}
						onChangeText={(text) => handleFieldChange("status", text)}
						placeholder="Status"
					/>
				) : (
					<Text style={styles.landingStyles.buttonSubtitle}>{offerData.status}</Text>
				)}
			</View>
			{/* Room for additional fields */}
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
				<Text style={[styles.landingStyles.logoSubtitle, { fontWeight: "bold", width: 120 }]}>Created At:</Text>
				<Text style={styles.landingStyles.buttonSubtitle}>{offerData.createdAt.toString()}</Text>
			</View>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
				<Text style={[styles.landingStyles.logoSubtitle, { fontWeight: "bold", width: 120 }]}>Updated At:</Text>
				<Text style={styles.landingStyles.buttonSubtitle}>{offerData.updatedAt.toString()}</Text>
			</View>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
				<Text style={[styles.landingStyles.logoSubtitle, { fontWeight: "bold", width: 120 }]}>Due Diligence Start:</Text>
				
				<DateTimePicker value={offerData.dueDiligenceStart || new Date()}
					mode="date"
					onChange={(event, date) => handleFieldChange('dueDiligenceStart', date)}>
				</DateTimePicker>

			</View>
			{isAgent && isAssignedAgent && (
				<Button title="Save Changes" onPress={handleSave} />
			)}
		</ScrollView>
	);
}









// <View
// 	key={request.id}
// 	style={styles.requestCard}>
// 	<View style={styles.requestHeader}>
// 		<View style={styles.clientAvatar}>
// 			<User
// 				color="#FFFFFF"
// 				size={24}
// 			/>
// 		</View>
// 		<View style={styles.requestInfo}>
// 			<Text style={styles.clientName}>{client ? `${client.firstName} ${client.lastName}` : "Loading..."}</Text>
// 			<Text style={styles.requestDate}>{formatDate(request.createdAt)}</Text>
// 		</View>
// 		<View style={[styles.statusBadge]}>
// 			<Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
// 		</View>
// 	</View>

// 	<View style={styles.requestDetails}>
// 		{client?.email && (
// 			<TouchableOpacity
// 				style={styles.detailRow}
// 				onPress={() => handleEmail(client.email)}>
// 				<Mail
// 					color="#666666"
// 					size={16}
// 				/>
// 				<Text style={styles.detailText}>{client.email}</Text>
// 			</TouchableOpacity>
// 		)}
// 		{client?.phoneNumber && (
// 			<TouchableOpacity
// 				style={styles.detailRow}
// 				onPress={() => handleCall(client.phoneNumber!)}>
// 				<Phone
// 					color="#666666"
// 					size={16}
// 				/>
// 				<Text style={styles.detailText}>{client.phoneNumber}</Text>
// 			</TouchableOpacity>
// 		)}
// 	</View>

// </View>