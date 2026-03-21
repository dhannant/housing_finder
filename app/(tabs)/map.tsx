import { db } from '@/components/firebaseConfig';
import PropertyDetailsModal from '@/components/modules/PropertyDetailsModal';
import { mapStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import * as Functions from '@/utils/functions';
import type { Property } from '@/utils/interfaces';
import { Picker } from '@react-native-picker/picker';
import * as Location from "expo-location";
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Text, TouchableOpacity, View } from 'react-native';
import { default as MapView, Marker, default as RNMapView, type Region } from 'react-native-maps';

import PropertyFilters, { type PropertyFilterOptions } from "../property_filters";

// Use Property type from service instead of local House interface
type House = Property;

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
function buildBoundingBox(lat: number, lon: number, latitudeDelta = 0.01, longitudeDelta = 0.01) {
	const latHalf = latitudeDelta / 2;
	const lonHalf = longitudeDelta / 2;
	return {
		minLat: lat - latHalf,
		maxLat: lat + latHalf,
		minLon: lon - lonHalf,
		maxLon: lon + lonHalf,
	};
}

function isWithinBoundingBox(
	house: House,
	lat: number,
	lon: number,
	latitudeDelta = 0.01,
	longitudeDelta = 0.01,
): boolean {
	if (house.latitude === null || house.longitude === null) return false;
	const box = buildBoundingBox(lat, lon, latitudeDelta, longitudeDelta);
	return (
		house.latitude >= box.minLat &&
		house.latitude <= box.maxLat &&
		house.longitude >= box.minLon &&
		house.longitude <= box.maxLon
	);
}

export default function HomeScreen() {

	// Get current user and role from auth context
	const { user, userData, role } = useAuth();
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
	const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

	const fetchHouses = useCallback(async (
		lat: number,
		lon: number,
		city?: string,
		searchRegion?: Pick<Region, 'latitudeDelta' | 'longitudeDelta'>,
	) => {
		setLoading(true);
		try {
			const latitudeDelta = searchRegion?.latitudeDelta ?? 0.01;
			const longitudeDelta = searchRegion?.longitudeDelta ?? 0.01;
			const regionLog = `center=(${lat.toFixed(5)}, ${lon.toFixed(5)}), latDelta=${latitudeDelta.toFixed(5)}, lonDelta=${longitudeDelta.toFixed(5)}`;
			let properties: House[] = [];

			const snapshot = await getDocs(collection(db, "properties"));
			properties = snapshot.docs
				.map((doc) => mapFirestoreProperty(doc.id, doc.data()))
				.filter(Boolean) as House[];

			properties = properties.filter((house) => house.status === 'for_sale' || house.status === 'pending');

			if (city && city.trim()) {
				const cityLower = city.trim().toLowerCase();
				properties = properties.filter((house) => house.address.toLowerCase().includes(cityLower));
			} else {
				properties = properties.filter((house) =>
					isWithinBoundingBox(house, lat, lon, latitudeDelta, longitudeDelta),
				);
			}

			if (properties.length > 0) {
				setHouses(properties);
				setFilteredHouses(properties);
				console.log(`✅ Loaded ${properties.length} houses from Firestore (${regionLog})`);
			} else {
				setHouses([]);
				setFilteredHouses([]);
				console.log(`⚠️ No properties found (${regionLog})`);
			}
		} catch (error) {
			console.error("💥 Error fetching houses from Firestore:", error);
			Alert.alert("Error", "Failed to fetch houses from Firestore");
		} finally {
			setLoading(false);
		}
	}, []);

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

		try {
			const assignedRealtor = await Functions.fetchAssignedRealtor(userId);
			const assignedRealtorId = typeof assignedRealtor === 'string'
				? assignedRealtor
				: (assignedRealtor as any)?.id || '';

			if (!assignedRealtorId) {
				Alert.alert(
					'No Assigned Agent',
					'Please select an agent from your dashboard before requesting help.',
				);
				return;
			}

			await addDoc(collection(db, 'helpRequests'), {
				clientId: userId,
				realtorId: assignedRealtorId,
				status: 'Pending',
				source: 'map_request_help',
				searchRegion: currentRegion
					? {
						latitude: currentRegion.latitude,
						longitude: currentRegion.longitude,
						latitudeDelta: currentRegion.latitudeDelta,
						longitudeDelta: currentRegion.longitudeDelta,
					}
					: null,
				createdAt: new Date(),
			});

			Alert.alert(
				'Help Requested',
				'Your assigned agent has been notified and will follow up shortly.',
			);
		} catch (error) {
			console.error('[RequestHelp] Failed creating help request:', error);
			Alert.alert('Error', 'Failed to submit help request. Please try again.');
		}
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
			const targetRegion = {
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				//if zoomerToUser is true, use .001, else use .07
				latitudeDelta: zoomToUser ? 0.001 : 0.07,  
				longitudeDelta: zoomToUser ? 0.001 : 0.07,
			};
			mapRef.current.animateToRegion(targetRegion, 500);
			setCurrentRegion(targetRegion);
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
					if (role === 'Agent') {
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

					if (role !== 'Agent') {
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
											await Functions.toggleFavorite(selectedClientId, selectedHouse, {
												assignedByAgentId: user?.uid || undefined,
											});
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
				   onRegionChangeComplete={(region) => {
					   setCurrentRegion(region);
					   if (zoomToUser) return;
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
				fetchHouses(
					location.coords.latitude,
					location.coords.longitude,
					undefined,
					currentRegion
						? {
							latitudeDelta: currentRegion.latitudeDelta,
							longitudeDelta: currentRegion.longitudeDelta,
						}
						: undefined,
				);
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