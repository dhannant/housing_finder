import * as styles from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOfferDatabyID, fetchPropertyData, fetchUserData, formatDate } from "@/utils/functions";
import { OFFER_STATUSES, OfferData } from '@/utils/interfaces';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from 'expo-router';
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { Calendar, Mail, Phone, User } from "lucide-react-native";

import { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";


// Props: offerId, clientId, agentId, propertyId, initialOfferData
export default function ClientOfferDetailsScreen() {
	const [ activeDatePicker, setActiveDatePicker ] = useState<string | null>(null);
	const { user, userData, role } = useAuth();
	// const { offerId, clientId, agentId, propertyId, initialOfferData } = useLocalSearchParams();
	const params = useLocalSearchParams();

	const agentIdStr = Array.isArray(params.agentId) ? params.agentId[0] : params.agentId;
	const clientIdStr = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
	const propertyIdStr = Array.isArray(params.propertyId) ? params.propertyId[0] : params.propertyId;
	const offerIdStr = Array.isArray(params.offerId) ? params.offerId[0] : params.offerId;
	
	const [isAgent, setIsAgent] = useState(false);
	const [isAssignedAgent, setIsAssignedAgent] = useState(false);
	const [agentData, setAgentData] = useState<any>(null);
	const [clientData, setClientData] = useState<any>(null);
	const [propertyData, setPropertyData] = useState<any>(null);

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
		earnestMoneyDueDate: null,
		earnestMoneyAmountDue: null,
		notes: "",
		files: "",
	});

	const isUnderContract = offerData.status !== 'Offer Declined' && 
								   offerData.status !== 'Offer Withdrawn' &&
  									offerData.status !== 'Offer Made';
									
	useEffect(() => {
		async function checkRole() {
			   // [REMOVED LOG]
			if (!user?.uid) return;  //stop here if the user id isn't available
			if (agentIdStr) setAgentData(await fetchUserData(agentIdStr));
			if (clientIdStr) setClientData(await fetchUserData(clientIdStr));

			if (propertyIdStr) setPropertyData(await fetchPropertyData(propertyIdStr, clientIdStr));
			if (offerIdStr) { 
				const offer = await fetchOfferDatabyID(offerIdStr);
				if (offer) setOfferData(offer);
			} 

				setIsAgent(role === "Agent");
			setIsAssignedAgent(user?.uid === agentIdStr);
		}
		checkRole();
	}, [user, clientIdStr, agentIdStr]);

	// click phone number
	const handleCall = (phone: string) => {
		if (phone) {
			Linking.openURL(`tel:${phone}`);
		}
	};

	// click email
	const handleEmail = (email: string) => {
		if (email) {
			Linking.openURL(`mailto:${email}`);
		}
	};

	// Handler for agent editing fields
	const handleFieldChange = (field: keyof OfferData, value: any) => {
		setOfferData((prev: OfferData) => ({ ...prev, [field]: value, updatedAt: new Date() }));
	};

	// Handler for agent saving changes
	const handleSave = async () => {
		try { 
			const { offerId, clientId, agentId, createdAt, ...updateFields } = offerData;  //remove offerId, clientId, agentId from the offerData that will be pushed to firestore
			// updateFields.updatedAt = new Date();  // update the updatedAt field

			const offerUpdateRef = doc(getFirestore(), 'clientOffers', offerIdStr);
			await updateDoc(offerUpdateRef, updateFields);
			alert("Offer updated!");
		} catch (error) {
			console.error("[ClientOfferDetailsScreen] Error in checkRole:", error);
		}
	};

	// Render fields (leave room for more fields)
	return (
		<SafeAreaView style={styles.landingStyles.container}>
			<ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#F8F9FA' }}>
				{/* Client Card */}
				<View style={styles.agentDashboardStyles.requestCard}>
					<View style={styles.agentDashboardStyles.requestHeader}>
						<View style={styles.agentDashboardStyles.clientAvatar}>
							<User color="#FFFFFF" size={28} />
						</View>
						<View style={styles.agentDashboardStyles.requestInfo}>
							<Text style={styles.agentDashboardStyles.clientName}>
								{clientData ? `${clientData.firstName} ${clientData.lastName}` : "Loading..."}
							</Text>
							<Text style={styles.agentDashboardStyles.requestDate}>
								{clientData?.email}
							</Text>
						</View>
					</View>
					<View style={styles.agentDashboardStyles.requestDetails}>
						{/** CLIENT EMAIL */}
						{clientData?.email && (
							<TouchableOpacity style={styles.agentDashboardStyles.detailRow} onPress={() => handleEmail(clientData.email)}>
								<Mail color="#666666" size={16} />
								<Text style={styles.agentDashboardStyles.detailText}>{clientData.email}</Text>
							</TouchableOpacity>
						)}
						{/** CLIENT PHONE NUMBER */}
						{clientData?.phoneNumber && (
							<TouchableOpacity style={styles.agentDashboardStyles.detailRow} onPress={() => handleCall(clientData.phoneNumber)}>
								<Phone color="#666666" size={16} />
								<Text style={styles.agentDashboardStyles.detailText}>{clientData.phoneNumber}</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Offer Details Section */}
				<View style={styles.defaultPage_styles.section}>
					<Text style={styles.defaultPage_styles.sectionTitle}>Offer Details</Text>
					<View style={{ marginBottom: 12 }}>
						<Text style={styles.landingStyles.buttonTitle}>Status</Text>

						{/* OFFER STATUS */}
						{isAgent && isAssignedAgent ? (
							<View style={{
									borderWidth: 1,
									borderColor: "#E5E5E5",
									borderRadius: 8,
									backgroundColor: "#FFF",
									marginTop: 4,
							}}>
								<Picker
									selectedValue={offerData.status}
									onValueChange={(itemValue) => handleFieldChange("status", itemValue)}
									style={{ fontSize: 16, marginBottom: 1 }}>
									{OFFER_STATUSES.map((status, idx) => status === "separator" ? (
										<Picker.Item key={`separator-${idx}`}
														label="------------------------------------------------------------"
														value="separator"
														enabled={false}
														color='#0c6711'
														
										/>
									) : (
										<Picker.Item key={status} label={status} value={status}/>
									))}
								</Picker>
							</View>
						) : (
							<Text style={styles.landingStyles.buttonSubtitle}>{offerData.status}</Text>
						)}
					</View>

					{isUnderContract && ( 
						<View>
							{/* DUE DILIGENCE START */}
							<View style={{ marginBottom: 12 }}>
								<Text style={styles.landingStyles.buttonTitle}>Due Diligence Start</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={[styles.landingStyles.buttonSubtitle, !offerData.dueDiligenceStart && { color: 'red' } ]}>
										{offerData.dueDiligenceStart ? formatDate(offerData.dueDiligenceStart) : 'Not set'}
									</Text>
									<TouchableOpacity
										style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}
										onPress={() => setActiveDatePicker('dueDiligenceStart')}>
										<Calendar color="#2C5F2D" size={22}/>
										<Text style={{ color: '#2C5F2D', marginLeft: 4 }}>Change</Text>
									</TouchableOpacity>
								</View>
								{activeDatePicker === 'dueDiligenceStart' && (
									<DateTimePicker
										value={offerData.dueDiligenceStart || new Date()}
										mode="date"
										display={Platform.OS === 'ios' ? 'spinner' : 'default'}
										onChange={(event, date) => {
											setActiveDatePicker(null);
											if (date) handleFieldChange('dueDiligenceStart', date);
										}}
									/>
								)}
							</View>
			
							{/* DUE DILIGENCE END */}
							<View style={{ marginBottom: 12 }}>
								<Text style={styles.landingStyles.buttonTitle}>Due Diligence End</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={[styles.landingStyles.buttonSubtitle, !offerData.dueDiligenceEnd && { color: 'red' } ]}>
										{offerData.dueDiligenceEnd ? formatDate(offerData.dueDiligenceEnd) : 'Not set'}
									</Text>
									<TouchableOpacity
										style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}
										onPress={() => setActiveDatePicker('dueDiligenceEnd')}>
										<Calendar color="#2C5F2D" size={22} />
										<Text style={{ color: '#2C5F2D', marginLeft: 4 }}>Change</Text>
									</TouchableOpacity>
								</View>
								{activeDatePicker === 'dueDiligenceEnd' && (
									<DateTimePicker
										value={offerData.dueDiligenceEnd || new Date()}
										mode="date"
										display={Platform.OS === 'ios' ? 'spinner' : 'default'}
										onChange={(event, date) => {
											setActiveDatePicker(null);
											if (date) handleFieldChange('dueDiligenceEnd', date);
										}}
									/>
								)}
							</View>
			
							{/* INSPECTION DATE */}
							<View style={{ marginBottom: 12 }}>
								<Text style={styles.landingStyles.buttonTitle}>Inspection</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={[styles.landingStyles.buttonSubtitle, !offerData.inspectionDate && { color: 'red' } ]}>
										{offerData.inspectionDate ? formatDate(offerData.inspectionDate) : 'Not set'}
									</Text>
									<TouchableOpacity
										style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}
										onPress={() => setActiveDatePicker('inspectionDate')}>
										<Calendar color="#2C5F2D" size={22} />
										<Text style={{ color: '#2C5F2D', marginLeft: 4 }}>Change</Text>
									</TouchableOpacity>
								</View>
								{activeDatePicker === 'inspectionDate' && (
									<DateTimePicker
										value={offerData.inspectionDate || new Date()}
										mode="date"
										display={Platform.OS === 'ios' ? 'spinner' : 'default'}
										onChange={(event, date) => {
											setActiveDatePicker(null);
											if (date) handleFieldChange('inspectionDate', date);
										}}
									/>
								)}
							</View>
			
							{/* CLOSING DATE */}
							<View style={{ marginBottom: 12 }}>
								<Text style={styles.landingStyles.buttonTitle}>Closing Date</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={[styles.landingStyles.buttonSubtitle, !offerData.closingDate && { color: 'red' } ]}>
										{offerData.closingDate ? formatDate(offerData.closingDate) : 'Not set'}
									</Text>
									<TouchableOpacity
										style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}
										onPress={() => setActiveDatePicker('closingDate')}>
										<Calendar color="#2C5F2D" size={22} />
										<Text style={{ color: '#2C5F2D', marginLeft: 4 }}>Change</Text>
									</TouchableOpacity>
								</View>
								{activeDatePicker === 'closingDate' && (
									<DateTimePicker
										value={offerData.closingDate || new Date()}
										mode="date"
										display={Platform.OS === 'ios' ? 'spinner' : 'default'}
										onChange={(event, date) => {
											setActiveDatePicker(null);
											if (date) handleFieldChange('closingDate', date);
										}}
									/>
								)}
							</View>

							{/* EARNEST MONEY DUE DATE */}
							<View style={{ marginBottom: 12 }}>
								<Text style={styles.landingStyles.buttonTitle}>Earnest Money Due Date</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={[styles.landingStyles.buttonSubtitle, !offerData.earnestMoneyDueDate && { color: 'red' } ]}>
										{offerData.earnestMoneyDueDate ? formatDate(offerData.earnestMoneyDueDate) : 'Not set'}
									</Text>
									<TouchableOpacity
										style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center' }}
										onPress={() => setActiveDatePicker('earnestMoneyDueDate')}>
										<Calendar color="#2C5F2D" size={22} />
										<Text style={{ color: '#2C5F2D', marginLeft: 4 }}>Change</Text>
									</TouchableOpacity>
								</View>
								{activeDatePicker === 'earnestMoneyDueDate' && (
									<DateTimePicker
										value={offerData.earnestMoneyDueDate || new Date()}
										mode="date"
										display={Platform.OS === 'ios' ? 'spinner' : 'default'}
										onChange={(event, date) => {
											setActiveDatePicker(null);
											if (date) handleFieldChange('earnestMoneyDueDate', date);
										}}
									/>
								)}
							</View>
			
							{/* EARNEST MONEY AMOUNT DUE */}
							<View style={{ marginBottom: 12 }}>
								<Text style={styles.landingStyles.buttonTitle}>Earnest Money Amount Due</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<TextInput
										style={[
											styles.landingStyles.buttonSubtitle,
											{
												borderWidth: 1,
												borderColor: '#E5E5E5',
												borderRadius: 8,
												padding: 8,
												minWidth: 120,
												backgroundColor: '#FFF',
											},
										]}
										keyboardType="numeric"
										value={
											offerData.earnestMoneyAmountDue !== null && offerData.earnestMoneyAmountDue !== undefined
												? offerData.earnestMoneyAmountDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
												: ''
										}
										onChangeText={text => {
											// Remove non-numeric except dot and comma
											const numeric = text.replace(/[^\d.]/g, '');
											const value = parseFloat(numeric);
											handleFieldChange('earnestMoneyAmountDue', isNaN(value) ? null : value);
										}}
										placeholderTextColor={ offerData.earnestMoneyAmountDue === null || 
																	offerData.earnestMoneyAmountDue === 0 ? 'red' : undefined }
										placeholder="$0.00"
									/>
								</View>
							</View>
							{/* Add more fields as needed */}
						</View>
					)}
					
					
					{isAgent && isAssignedAgent && (
						<TouchableOpacity style={[styles.agentDashboardStyles.actionButton, { marginTop: 16 }]} onPress={handleSave}>
							<Text style={styles.agentDashboardStyles.actionButtonText}>Save Changes</Text>
						</TouchableOpacity>
					)}
					<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 12 }}>
						<Text style={[styles.landingStyles.buttonTitle, { width: 110 }]}>Created At:</Text>
						<Text style={[styles.landingStyles.buttonSubtitle, { width: 150, marginLeft: 12 }]}>{formatDate(offerData.createdAt)}</Text>
					</View>
					<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
						<Text style={[styles.landingStyles.buttonTitle, { width: 110 }]}>Updated At:</Text>
						<Text style={[styles.landingStyles.buttonSubtitle, { width: 150, marginLeft: 12 }]}>{formatDate(offerData.updatedAt)}</Text>
					</View>
				</View>
			</ScrollView>

			{/* Footer with copyright */}
			<View style={styles.landingStyles.footer}>
				
			</View>
		</SafeAreaView>
	);
}