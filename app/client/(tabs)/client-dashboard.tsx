import { auth } from "@/components/firebaseConfig";
import { useAssignedRealtor, useUserData } from "@/hooks/useFunctions";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { landingStyles } from '@/constants/styles';


import { Home, MapPin, UserCircle } from "lucide-react-native";
import { OffersModule } from '../../../components/modules/OffersModule';
import { YourAgentModule } from '../../../components/modules/YourAgentModule';

export default function ClientDashboard() {
	const router = useRouter();
	const user = auth.currentUser;

	const { data: userData, loading } = useUserData(user?.uid || null);
	const { data: assignedRealtorId } = useAssignedRealtor(user?.uid || null);

	const handleLogout = async () => {
		try {
			await auth.signOut();
			router.replace("/");
		} catch (error) {
			console.error("Error logging out:", error);
		}
	};

		if (loading) {
			return (
				<SafeAreaView style={styles.container}>
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#2C5F2D" />
						<Text style={styles.loadingText}>Loading...</Text>
					</View>
				</SafeAreaView>
			);
		}

		return (
			   <SafeAreaView style={styles.container}>
				   <View style={styles.header}>
					   <View style={styles.headerContent}>
						   <UserCircle color="#2C5F2D" size={32} />
						   <View style={styles.headerTextContainer}>
							   <Text style={styles.headerTitle}>Client Dashboard</Text>
							   <Text style={styles.headerSubtitle}>Welcome, {userData?.firstName || "Client"}!</Text>
						   </View>
					   </View>
					   <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
						   <Text style={styles.logoutButtonText}>Logout</Text>
					   </TouchableOpacity>
				   </View>
				   <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
					   {/* Offers module if user has active offers */}
					   {user && <OffersModule userId={user.uid} styles={styles} />}
					   {/* Your Realtor section if assigned */}
					   {assignedRealtorId && <YourAgentModule realtorId={assignedRealtorId} styles={styles} />}
					   <View style={styles.bottomButtonsContainer}>
						   <TouchableOpacity
							   style={[landingStyles.actionButton, landingStyles.buyButton, { marginHorizontal: 16, marginTop: 8, paddingVertical: 16, paddingHorizontal: 16 }]}
							   onPress={() => router.push({ pathname: '/(tabs)/map', params: { userType: 'buy', zoomToUser: 'false' } })}
							   activeOpacity={0.8}
						   >
							   <View style={[landingStyles.buttonContent, { minHeight: 42 }]}> 
								   <View style={[landingStyles.iconCircle, landingStyles.buyIconCircle, { width: 42, height: 42, borderRadius: 21, marginRight: 12 }]}> 
									   <Home color="#FFFFFF" size={22} />
								   </View>
								   <View style={landingStyles.buttonTextContainer}>
									   <Text style={landingStyles.buttonTitle}>I&apos;m looking to buy a home/land</Text>
									   <Text style={landingStyles.buttonSubtitle}>Create profile & start searching</Text>
								   </View>
							   </View>
							   <Text style={landingStyles.arrow}>→</Text>
						   </TouchableOpacity>
						   <TouchableOpacity
							   style={[landingStyles.actionButton, landingStyles.geolocateButton, { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, paddingVertical: 16, paddingHorizontal: 16 }]}
							   activeOpacity={0.8}
							   onPress={() => router.push({ pathname: '/(tabs)/map', params: { userType: 'geolocate', zoomToUser: 'true' } })}
						   >
							   <View style={[landingStyles.iconCircle, landingStyles.geolocateIconCircle, { width: 42, height: 42, borderRadius: 21, marginRight: 12 }]}> 
								   <MapPin color="#FFFFFF" size={22} />
							   </View>
							   <View style={landingStyles.buttonTextContainer}>
								   <Text style={landingStyles.buttonTitle}>I&apos;m at a home I love & need more info</Text>
								   <Text style={landingStyles.buttonSubtitle}>Geo-locate property details</Text>
							   </View>
							   <Text style={landingStyles.arrow}>→</Text>
						   </TouchableOpacity>
					   </View>
				   </ScrollView>
			   </SafeAreaView>
		);
}

const styles = StyleSheet.create({
	bottomButtonsContainer: {
		backgroundColor: '#F8F9FA',
		paddingBottom: 24,
		paddingTop: 8,
		alignItems: 'center',
		marginTop: 24,
	},
	container: { flex: 1, backgroundColor: "#F8F9FA" },
	header: {
		backgroundColor: "#FFFFFF",
		paddingVertical: 20,
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
	scrollContent: { paddingBottom: 100 },
	loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
	loadingText: { marginTop: 10, fontSize: 16, color: "#666666" },
	section: { backgroundColor: "#FFFFFF", padding: 20, marginBottom: 16 },
	sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginBottom: 8 },
	sectionDescription: { fontSize: 14, color: "#666666", lineHeight: 20 },
	emptyState: { backgroundColor: "#FFFFFF", padding: 40, marginHorizontal: 16, borderRadius: 12, alignItems: "center" },
	emptyStateText: { fontSize: 16, color: "#666666", textAlign: "center" },
	realtorsContainer: { paddingHorizontal: 16 },
	realtorCard: {
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
	realtorInfo: { flexDirection: "row", marginBottom: 16 },
	realtorAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#2C5F2D", justifyContent: "center", alignItems: "center" },
	realtorInitials: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold" },
	realtorDetails: { flex: 1, marginLeft: 16, justifyContent: "center" },
	realtorName: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A", marginBottom: 4 },
	realtorEmail: { fontSize: 14, color: "#666666", marginBottom: 2 },
	realtorPhone: { fontSize: 14, color: "#666666" },
	selectButton: { backgroundColor: "#2C5F2D", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: "center" },
	disabledButton: { opacity: 0.6 },
	selectButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
	requestSentBadge: { backgroundColor: "#4CAF50", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: "center" },
	requestSentText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
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
