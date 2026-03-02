import { db } from '@/components/firebaseConfig';
import { mapStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import PropertyDetailsModal from '@/components/modules/PropertyDetailsModal';
import * as Functions from '@/utils/functions';
import type { Property } from '@/utils/interfaces';
import { Picker } from '@react-native-picker/picker';
import * as Location from "expo-location";
import { collection, getDocs } from 'firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Text, TouchableOpacity, View } from 'react-native';
import { default as MapView, Marker, default as RNMapView } from 'react-native-maps';

import PropertyFilters, { type PropertyFilterOptions } from "../property_filters";

// Use Property type from service instead of local House interface
type House = Property;

// Mock data for testing
const MOCK_HOUSES: House[] = [
	{
		id: '1',
		price: 350000,
		address: '123 Main St, Commerce, GA',
		beds: 3,
		baths: 2,
		latitude: 34.2029,
		longitude: -83.4627,
		status: 'for_sale',
		type: 'single_family',
		primaryPhoto: 'https://picsum.photos/400/300?random=1',
		photos: [
			{ href: 'https://picsum.photos/400/300?random=1' },
			{ href: 'https://picsum.photos/400/300?random=2' },
			{ href: 'https://picsum.photos/400/300?random=3' },
		],
		lot_sqft: null,
		sqft: 1400
	},
	{
		id: '2',
		price: 425000,
		address: '456 Oak Ave, Maysville, GA',
		beds: 4,
		baths: 2.5,
		latitude: 34.2529,
		longitude: -83.5127,
		status: 'for_sale',
		type: 'single_family',
		primaryPhoto: 'https://picsum.photos/400/300?random=4',
		photos: [
			{ href: 'https://picsum.photos/400/300?random=4' },
			{ href: 'https://picsum.photos/400/300?random=5' },
			{ href: 'https://picsum.photos/400/300?random=6' },
			{ href: 'https://picsum.photos/400/300?random=7' },
		],
		lot_sqft: null,
		sqft: 2500
	},
	{
		id: '3',
		price: 1200,
		address: '789 Elm St, Commerce, GA',
		beds: 2,
		baths: 1,
		latitude: 34.1829,
		longitude: -83.4427,
		status: 'for_rent',
		type: 'apartment',
		primaryPhoto: 'https://picsum.photos/400/300?random=8',
		photos: [
			{ href: 'https://picsum.photos/400/300?random=8' },
			{ href: 'https://picsum.photos/400/300?random=9' },
		],
		lot_sqft: null,
		sqft: 2350
	},
	{
		id: '4',
		price: 299000,
		address: '321 Pine Rd, Commerce, GA',
		beds: 3,
		baths: 2,
		latitude: 34.2129,
		longitude: -83.4527,
		status: 'for_sale',
		type: 'townhouse',
		primaryPhoto: 'https://picsum.photos/400/300?random=10',
		photos: [
			{ href: 'https://picsum.photos/400/300?random=10' },
			{ href: 'https://picsum.photos/400/300?random=11' },
			{ href: 'https://picsum.photos/400/300?random=12' },
		],
		lot_sqft: 5000,
		sqft: 1800
	},
	{
		id: '5',
		price: 1500,
		address: '654 Maple Dr, Maysville, GA',
		beds: 3,
		baths: 2,
		latitude: 34.2329,
		longitude: -83.4927,
		status: 'for_rent',
		type: 'single_family',
		primaryPhoto: 'https://picsum.photos/400/300?random=13',
		photos: [
			{ href: 'https://picsum.photos/400/300?random=13' },
			{ href: 'https://picsum.photos/400/300?random=14' },
			{ href: 'https://picsum.photos/400/300?random=15' },
		],
		lot_sqft: null,
		sqft: null
	},
	{
		id: '6',
		price: 525000,
		address: '987 Birch Ln, Commerce, GA',
		beds: 4,
		baths: 3,
		latitude: 34.1929,
		longitude: -83.4727,
		status: 'pending',
		type: 'single_family',
		primaryPhoto: 'https://picsum.photos/400/300?random=16',
		photos: [
			{ href: 'https://picsum.photos/400/300?random=16' },
			{ href: 'https://picsum.photos/400/300?random=17' },
			{ href: 'https://picsum.photos/400/300?random=18' },
			{ href: 'https://picsum.photos/400/300?random=19' },
			{ href: 'https://picsum.photos/400/300?random=20' },
		],
		lot_sqft: null,
		sqft: null
	},
];

// Utility: Pin color
function getPinColor(status: string) {
    switch (status) {
        case "for_sale": return "#FF0000";
        case "for_rent": return "#0000FF";
        case "sold": return "#808080";
        case "pending": return "#FFA500";
        case "off_market": return "#A9A9A9";
        default: return "#FF0000";
    }
}

function toPhotoArray(photos: any): { href: string }[] {
	if (!Array.isArray(photos)) return [];
	return photos
		.map((photo) => {
			if (typeof photo === 'string') return { href: photo };
			if (photo && typeof photo.href === 'string') return { href: photo.href };
			return null;
		})
		.filter(Boolean) as { href: string }[];
}

function mapFirestoreProperty(docId: string, data: any): House | null {
	const lat = data?.location?.address?.coordinate?.lat ?? data?.latitude ?? null;
	const lon = data?.location?.address?.coordinate?.lon ?? data?.longitude ?? null;
	if (lat === null || lon === null) return null;

	const line = data?.location?.address?.line ?? data?.address ?? "";
	const city = data?.location?.address?.city ?? "";
	const state = data?.location?.address?.state_code ?? "";
	const fullAddress = [line, city, state].filter(Boolean).join(", ") || "Address unavailable";

	const photos = toPhotoArray(data?.photos);
	const primaryPhoto = data?.primary_photo?.href ?? data?.primaryPhoto ?? photos[0]?.href ?? null;

	const mapped: any = {
		id: docId,
		favoriteId: "",
		price: data?.list_price ?? data?.price?.list_price ?? data?.price?.value ?? null,
		address: fullAddress,
		beds: data?.description?.beds ?? data?.beds ?? null,
		baths: data?.description?.baths ?? data?.baths ?? null,
		latitude: typeof lat === 'number' ? lat : Number(lat),
		longitude: typeof lon === 'number' ? lon : Number(lon),
		lot_sqft: data?.description?.lot_sqft ?? data?.lot_sqft ?? null,
		status: data?.status ?? data?.status_code ?? null,
		sqft: data?.description?.sqft ?? data?.sqft ?? null,
		type: data?.description?.type ?? data?.type ?? null,
		photos,
		primaryPhoto,
	};

	if (!Number.isFinite(mapped.latitude) || !Number.isFinite(mapped.longitude)) return null;
	return mapped as House;
}

// Utility: Build a bounding box polygon around user's location
function buildBoundingBox(lat: number, lon: number, delta = 0.01) {
	return {
		minLat: lat - delta,
		maxLat: lat + delta,
		minLon: lon - delta,
		maxLon: lon + delta,
	};
}

function isWithinBoundingBox(house: House, lat: number, lon: number, delta = 0.01): boolean {
	if (house.latitude === null || house.longitude === null) return false;
	const box = buildBoundingBox(lat, lon, delta);
	return (
		house.latitude >= box.minLat &&
		house.latitude <= box.maxLat &&
		house.longitude >= box.minLon &&
		house.longitude <= box.maxLon
	);
}

export default function HomeScreen() {

	/**
	 * Set to true to use fake data instead of making API 
	 * calls (for testing UI without hitting API limits)
	 */
	const useMockData = false;

	// Get current user from auth context
	const { user, userData } = useAuth();
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [eligibleClients, setEligibleClients] = useState<any[]>([]);
	const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

	// State variables (declare only once)
	const [location, setLocation] = useState<Location.LocationObject | null>(null);
	const [houses, setHouses] = useState<House[]>([]);
	const [filteredHouses, setFilteredHouses] = useState<House[]>([]);
	const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
	const [isFavorite, setIsFavorite] = useState(false);
	const [filterVisible, setFilterVisible] = useState(false);
	const [activeFilters, setActiveFilters] = useState<PropertyFilterOptions>({});
	const params = useLocalSearchParams();
	const [loading, setLoading] = useState(false);

	const fetchHouses = useCallback(async (lat: number, lon: number, city?: string) => {
		setLoading(true);
		try {
			let properties: House[] = [];
			if (useMockData) {
				properties = MOCK_HOUSES.filter(h => h.status === 'for_sale' || h.status === 'pending');
				setTimeout(() => {
					setHouses(properties);
					setFilteredHouses(properties);
					setLoading(false);
					console.log(`Loaded ${properties.length} mock houses`);
				}, 500);
				return;
			}

			const snapshot = await getDocs(collection(db, "properties"));
			properties = snapshot.docs
				.map((doc) => mapFirestoreProperty(doc.id, doc.data()))
				.filter(Boolean) as House[];

			properties = properties.filter((house) => house.status === 'for_sale' || house.status === 'pending');

			if (city && city.trim()) {
				const cityLower = city.trim().toLowerCase();
				properties = properties.filter((house) => house.address.toLowerCase().includes(cityLower));
			} else {
				properties = properties.filter((house) => isWithinBoundingBox(house, lat, lon));
			}

			if (properties.length > 0) {
				setHouses(properties);
				setFilteredHouses(properties);
				console.log(`✅ Loaded ${properties.length} houses from Firestore`);
			} else {
				setHouses([]);
				setFilteredHouses([]);
				console.log('⚠️ No properties found');
			}
		} catch (error) {
			console.error("💥 Error fetching houses from Firestore:", error);
			Alert.alert("Error", "Failed to fetch houses from Firestore");
		} finally {
			setLoading(false);
		}
	}, [useMockData]);

	useEffect(() => {
		(async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				Alert.alert(
					"Location Required",
					"This app needs access to your device's location. Please enable location services and grant permission for the app to function properly."
				);
				return;
			}
			let loc = await Location.getCurrentPositionAsync({});
			setLocation(loc);
			if (loc && loc.coords) {
				fetchHouses(loc.coords.latitude, loc.coords.longitude);
			}
		})();
	}, [fetchHouses]);

	// Apply filters to the house list
	function applyFilters(houses: House[], filters: PropertyFilterOptions): House[] {
		return houses.filter((house) => {
			if (filters.minBedrooms !== undefined && (house.beds === null || house.beds < filters.minBedrooms)) return false;
			if (filters.maxBedrooms !== undefined && (house.beds === null || house.beds > filters.maxBedrooms)) return false;
			if (filters.minBathrooms !== undefined && (house.baths === null || house.baths < filters.minBathrooms)) return false;
			if (filters.maxBathrooms !== undefined && (house.baths === null || house.baths > filters.maxBathrooms)) return false;
			if (filters.minPrice !== undefined && (house.price === null || house.price < filters.minPrice)) return false;
			if (filters.maxPrice !== undefined && (house.price === null || house.price > filters.maxPrice)) return false;
			if (filters.minSquareFeet !== undefined && (house as any).squareFeet < filters.minSquareFeet) return false;
			if (filters.maxSquareFeet !== undefined && (house as any).squareFeet > filters.maxSquareFeet) return false;
			if (filters.minLotSize !== undefined && (house as any).lotSize < filters.minLotSize) return false;
			if (filters.maxLotSize !== undefined && (house as any).lotSize > filters.maxLotSize) return false;
			return true;
		});
	}
	// Remove stray fetchHouses call outside of any function
	// When filters are applied from the modal
	function handleApplyFilters(filters: PropertyFilterOptions) {
		setActiveFilters(filters);
		setFilteredHouses(applyFilters(houses, filters));
	}

	useEffect(() => {
		setFilteredHouses(applyFilters(houses, activeFilters));
	}, [houses, activeFilters]);

	async function handleRequestHelp() {
		const userId = user?.uid;
		if (!userId) {
			Alert.alert(
				'Account Required',
				'You need to create an account before requesting help so the realtor can contact you.',
				[
					{ text: 'Register', onPress: () => router.push('/register') },
					{ text: 'Cancel', style: 'cancel' }
				]
			);
			return;
		}
		// TODO: Implement realtor selection and email subject/body
		// Example:
		// const selectedRealtorId = ...;
		// const subject = ...;
		// const body = ...;
		// await Functions.handleEmail(userId, selectedRealtorId, subject, body);
		Alert.alert(
			'Help Requested',
			'We have the coordinates of your search location and will research any available homes in the area.  A realtor will contact you soon.'
		);
	}

	// Default to false if not present
	const zoomToUser = params.zoomToUser === 'true';
	const initialRegion = {
		latitude: location && location.coords ? location.coords.latitude : 34.23,
		longitude: location && location.coords ? location.coords.longitude : -83.48,
		//if zoomerToUser is true, use .001, else use .07
		latitudeDelta: zoomToUser ? 0.001 : 0.07,
		longitudeDelta: zoomToUser ? 0.001 : 0.07,
	};

const mapRef = useRef<RNMapView | null>(null);
const hasZoomedRef = useRef(false);

	useEffect(() => {
		if (location?.coords && mapRef.current) {
			if (hasZoomedRef.current && !zoomToUser) return;
			mapRef.current.animateToRegion({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				//if zoomerToUser is true, use .001, else use .07
				latitudeDelta: zoomToUser ? 0.001 : 0.07,  
				longitudeDelta: zoomToUser ? 0.001 : 0.07,
			}, 500);
			hasZoomedRef.current = true;
		}
	}, [zoomToUser, location]);

	const renderPropertyModal = () => {
		if (!selectedHouse) return null;

		const favoriteButton = (
			<TouchableOpacity
				onPress={async () => {
					if (!user?.uid || !userData) {
						Alert.alert('Please log in', 'You must be logged in to save favorites.');
						return;
					}
					if (!selectedHouse) return;
					if (userData.role === 'Agent') {
						try {
							const agentId = user?.uid;
							if (!agentId) {
								Alert.alert('Error', 'Agent ID not found.');
								return;
							}
							const assignedClients = await Functions.fetchAssignedClients(agentId);
							const eligible: any[] = [];
							for (const client of assignedClients) {
								const alreadyFavorite = await Functions.checkIfFavorite(client.clientId, selectedHouse.id);
								if (!alreadyFavorite) {
									const clientUser = await Functions.fetchUserData(client.clientId);
									eligible.push({
										clientId: client.clientId,
										firstName: clientUser?.firstName || '',
										lastName: clientUser?.lastName || '',
									});
								}
							}
							if (eligible.length === 0) {
								Alert.alert('No eligible clients', 'All your assigned clients already have this property as a favorite.');
								return;
							}
							setEligibleClients(eligible);
							setSelectedClientId(null);
							setShowAssignModal(true);
						} catch (error) {
							Alert.alert('Error', 'Failed to load assigned clients.');
							console.error('Error loading assinged clients:', error);
						}
						return;
					}

					if (userData.role !== 'Agent') {
						try {
							const newStatus = await Functions.toggleFavorite(user.uid, selectedHouse);
							setIsFavorite(newStatus);
						} catch (error) {
							Alert.alert('Error', 'Failed to update favorite status.');
							console.error('Error toggling favorite:', error);
						}
					}
				}}
				style={mapStyles.starButton}
			>
				<Text style={mapStyles.starButtonText}>{isFavorite ? '⭐' : '☆'}</Text>
			</TouchableOpacity>
		);

		return (
			<PropertyDetailsModal
				visible={selectedHouse !== null}
				property={selectedHouse}
				onClose={() => {
					setSelectedHouse(null);
					setShowAssignModal(false);
				}}
				headerRight={favoriteButton}
			/>
		);
	};

	return (
		<View style={mapStyles.container}>
			<View style={{ position: 'absolute', top: 60, left: 20, right: 20, zIndex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
				{/* Request Help Button */}
				<TouchableOpacity
					style={{ backgroundColor: '#FFA500', 
								paddingVertical: 12, 
								paddingHorizontal: 16, 
								borderColor: '#000', 
								borderWidth: 1, 
								borderRadius: 25, 
								flexDirection: 'row', 
								alignItems: 'center', 
								elevation: 5, 
								shadowColor: '#000', 
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.25, 
								shadowRadius: 3.84 }}
					onPress={handleRequestHelp}>
						{/* <Text style={{fontSize: 18, marginRight: 8}}></Text> */}
						<Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>Request Help</Text>
					</TouchableOpacity>
				{/* Filter Button Floating at Top */}
				<TouchableOpacity
					style={{ backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}
					onPress={() => setFilterVisible(true)}>
					<Text style={{ fontSize: 18, marginRight: 8 }}>⚙️</Text>
					<Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>Filters</Text>
					{Object.keys(activeFilters).length > 0 && (
						<View style={{ backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8, minWidth: 20, alignItems: 'center' }}>
							<Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{Object.keys(activeFilters).length}</Text>
						</View>
					)}
				</TouchableOpacity>
			</View>

			{renderPropertyModal()}
			{showAssignModal && (
				<Modal
					visible={showAssignModal}
					animationType="slide"
					transparent={true}
					onRequestClose={() => setShowAssignModal(false)}
				>
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
						<View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, alignItems: 'center' }}>
							<Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Assign Favorite to Client</Text>
							<Text style={{ marginBottom: 12 }}>Select a client to assign this favorite:</Text>
							<View style={{ width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, overflow: 'hidden' }}>
								<Picker
									selectedValue={selectedClientId || 'placeholder'}
									onValueChange={(itemValue) => {
										if (itemValue !== 'placeholder') setSelectedClientId(itemValue);
									}}
									style={{ width: '100%' }}
								>
									<Picker.Item label="Select Client" value="placeholder" enabled={false} color="#888" />
									{eligibleClients.map((client) => (
										<Picker.Item
											key={client.clientId}
											label={`${client.firstName} ${client.lastName}`}
											value={client.clientId}
										/>
									))}
								</Picker>
							</View>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
								<TouchableOpacity
									style={{ backgroundColor: '#2C5F2D', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6, marginRight: 12, opacity: (!selectedClientId || selectedClientId === 'placeholder') ? 0.5 : 1 }}
									disabled={!selectedClientId || selectedClientId === 'placeholder'}
									onPress={async () => {
										if (!selectedClientId || selectedClientId === 'placeholder' || !selectedHouse) return;
										try {
											await Functions.toggleFavorite(selectedClientId, selectedHouse);
											setShowAssignModal(false);
											Alert.alert('Success', 'Favorite assigned to client.');
										} catch (err) {
											console.error('[Assign Favorite] Error assigning favorite:', err);
											Alert.alert('Error', 'Failed to assign favorite.');
										}
									}}
								>
									<Text style={{ color: '#fff', fontWeight: 'bold' }}>Assign</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{ backgroundColor: '#ccc', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 }}
									onPress={() => setShowAssignModal(false)}
								>
									<Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>
			)}
			{loading && (
				<View style={mapStyles.loadingContainer}>
					<ActivityIndicator size="large" color="#0000ff" />
					<Text>Loading houses...</Text>
				</View>
			)}
			   <MapView
				   ref={ref => { mapRef.current = ref; }}
				   style={mapStyles.map}
				   initialRegion={initialRegion}
				   showsUserLocation={true}
				   onRegionChangeComplete={zoomToUser ? undefined : (region) => {
					   // Only update location if not zooming to user
					   setLocation({
						   coords: {
							   latitude: region.latitude,
							   longitude: region.longitude,
							   altitude: null,
							   accuracy: null,
							   altitudeAccuracy: null,
							   heading: null,
							   speed: null,
						   },
						   timestamp: Date.now(),
					   });
				   }}
			   >
				{filteredHouses
					.filter(house => house.latitude !== null && house.longitude !== null)
					.map((house) => (
						<Marker
							key={house.id}
							coordinate={{
								latitude: house.latitude!,
								longitude: house.longitude!,
							}}
							pinColor={getPinColor(house.status || 'for_sale')}
					onPress={async () => {
						setSelectedHouse(house);
						// Check if this property is favorited when opening modal
						if (user?.uid) {
							const favorited = await Functions.checkIfFavorite(user.uid, house.id);
							setIsFavorite(favorited);
						} else {
							setIsFavorite(false);
						}
					}}
				/>
			))}
		</MapView>

		<TouchableOpacity
			style={mapStyles.searchButton}
		onPress={() => {
			if (location) {
				fetchHouses(location.coords.latitude, location.coords.longitude);
			}
		}}>
		<Text style={mapStyles.searchButtonText}>Search This Area</Text>
	</TouchableOpacity>

	{/* Filter Modal */}
	<PropertyFilters
		visible={filterVisible}
		onClose={() => setFilterVisible(false)}
		onApply={handleApplyFilters}
		initialFilters={activeFilters}/>
</View>);
}