import { auth, db } from "@/components/firebaseConfig";
import CalendarModule from "@/components/modules/calendarModule";
import { clientDashboard_styles, landingStyles } from '@/constants/styles';
import { useAssignedRealtor, usePendingClientRequests, useRealtors, useUserData } from "@/hooks/useFunctions";
import { fetchActiveOfferForClient, fetchClientFavorites, fetchUserOffers } from "@/utils/functions";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { Home, MapPin, UserCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { OffersModule } from '../../../components/modules/OffersModule';
import { SelectAgentModule } from '../../../components/modules/SelectAgentModule';
import { YourAgentModule } from '../../../components/modules/YourAgentModule';

export default function ClientDashboard() {
	const router = useRouter();
	const user = auth.currentUser;

	const { data: userData, loading } = useUserData(user?.uid || null);
	const { data: assignedRealtorId, refetch: refetchAssignedRealtor } = useAssignedRealtor(user?.uid || null);
	const { data: pendingRequestsRealtorId, refetch: refetchPendingRequests } = usePendingClientRequests(user?.uid || null, "client");
	const { data: realtors = [], loading: realtorsLoading } = useRealtors();
	const [requesting, setRequesting] = useState(false);
	const [clientHasActiveOffer, setClientHasActiveOffer] = useState(false);

	// Store only document IDs
	const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
	const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

	useEffect(() => {
		async function fetchClientData() {
			if (!user?.uid) return;
			try {
				const favorites = await fetchClientFavorites(user.uid);
				setFavoriteIds(favorites.map(fav => fav.id));
				const activeOffer = await fetchActiveOfferForClient(user.uid);
				setActiveOfferId(activeOffer ? activeOffer.offerId : null);
				setClientHasActiveOffer(Boolean(activeOffer?.offerId));
				const allOffers = await fetchUserOffers(user.uid);
				console.log("favoriteIds:", favorites.map(fav => fav.id));
				console.log("activeOfferId:", activeOffer ? activeOffer.offerId : null);
				console.log("offerIds:", allOffers.map(offer => offer.offerId));
			} catch (error) {
				console.error("Error fetching client data:", error);
				setClientHasActiveOffer(false);
			}
		}
		fetchClientData();
	}, [user?.uid]);

	const handleSelectRealtor = async (realtorId: string) => {
		if (assignedRealtorId) {
			Alert.alert("Already Requested", "You already have an active request with a realtor");
			return;
		}
		setRequesting(true);
		try {
			if (!user) {
				Alert.alert("Error", "You must be logged in");
				return;
			}
			await addDoc(collection(db, "clientRequests"), { clientId: user.uid, realtorId: realtorId, status: "Pending", createdAt: new Date() });
			await refetchAssignedRealtor();
			await refetchPendingRequests();
			Alert.alert("Success", "Your request has been sent to the realtor!");
		} catch (error) {
			console.error("Error selecting realtor:", error);
			Alert.alert("Error", "Failed to send request to realtor");
		} finally {
			setRequesting(false);
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

	if (loading || realtorsLoading) {
		return (
			<SafeAreaView style={clientDashboard_styles.container}>
				<View style={clientDashboard_styles.loadingContainer}>
					<ActivityIndicator size="large" color="#2C5F2D" />
					<Text style={clientDashboard_styles.loadingText}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={clientDashboard_styles.container}>
			<View style={clientDashboard_styles.header}>
				<View style={clientDashboard_styles.headerContent}>
					<UserCircle color="#2C5F2D" size={32} />
					<View style={clientDashboard_styles.headerTextContainer}>
						<Text style={clientDashboard_styles.headerTitle}>Client Dashboard</Text>
						<Text style={clientDashboard_styles.headerSubtitle}>Welcome, {userData?.firstName || "Client"}!</Text>
					</View>
				</View>
				<TouchableOpacity style={clientDashboard_styles.logoutButton} onPress={handleLogout}>
					<Text style={clientDashboard_styles.logoutButtonText}>Logout</Text>
				</TouchableOpacity>
			</View>
			<ScrollView
				style={clientDashboard_styles.scrollView}
				contentContainerStyle={clientDashboard_styles.scrollContent}
				alwaysBounceVertical={false}
				overScrollMode="never"
			>
			{!assignedRealtorId && (
				<View>
					<View style={clientDashboard_styles.section}>
						<Text style={clientDashboard_styles.sectionTitle}>Select Your Realtor</Text>
						<Text style={clientDashboard_styles.sectionDescription}>
						Choose a realtor to work with. They will be able to view your requests and help you find your dream property.
						</Text>
					</View>
					<SelectAgentModule
						realtors={realtors ?? []}
						pendingRequestsRealtorId={pendingRequestsRealtorId}
						requesting={requesting}
						onSelectRealtor={handleSelectRealtor}
						styles={clientDashboard_styles}
					/>
				</View>
				)}
				{clientHasActiveOffer && user && (
					<OffersModule
						userId={user.uid}
						favoriteIds={favoriteIds}
						activeOfferId={activeOfferId}
						styles={clientDashboard_styles}
					/>
				)}
				{assignedRealtorId && <YourAgentModule realtorId={assignedRealtorId} styles={clientDashboard_styles} />}
				{clientHasActiveOffer && <CalendarModule role="client" activeOfferId={activeOfferId} />}
				{!clientHasActiveOffer && 
				<View style={clientDashboard_styles.bottomButtonsContainer}>
					<TouchableOpacity style={[landingStyles.actionButton, landingStyles.buyButton, { marginHorizontal: 16, marginTop: 8, paddingVertical: 16, paddingHorizontal: 16 }]} onPress={() => router.push({ pathname: '/(tabs)/map', params: { userType: 'buy', zoomToUser: 'false' } })} activeOpacity={0.8}>
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
					<TouchableOpacity style={[landingStyles.actionButton, landingStyles.geolocateButton, { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, paddingVertical: 16, paddingHorizontal: 16 }]} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(tabs)/map', params: { userType: 'geolocate', zoomToUser: 'true' } })}>
						<View style={[landingStyles.iconCircle, landingStyles.geolocateIconCircle, { width: 42, height: 42, borderRadius: 21, marginRight: 12 }]}> 
							<MapPin color="#FFFFFF" size={22} />
						</View>
						<View style={landingStyles.buttonTextContainer}>
							<Text style={landingStyles.buttonTitle}>I&apos;m at a home I love & need more info</Text>
							<Text style={landingStyles.buttonSubtitle}>Geo-locate property details</Text>
						</View>
						<Text style={landingStyles.arrow}>→</Text>
					</TouchableOpacity>
				</View>}
			</ScrollView>
		</SafeAreaView>
	);
}

