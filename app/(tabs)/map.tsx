import * as Location from "expo-location";
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from "react-native-maps";

import { mapStyles } from '@/constants/styles';

interface House {
  id: string;
  price: number;
  address: string;
  beds: number;
  baths: number;
  latitude: number;
  longitude: number;
  status: string;
  type: string;
  primaryPhoto?: string;
  photos?: { href: string }[];
}

// Mock data for testing
const MOCK_HOUSES = [
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
  },
];



export default function HomeScreen() {
  const params = useLocalSearchParams();
  const userType = params.userType || 'buyer';
  
  console.log('User type:', userType);

  const [location, setLocation] = useState<Location.LocationObject | null>(null,);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [useMockData, setUseMockData] = useState(true); // Set to true to use fake data

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation);

      // Fetch houses near user location
      fetchHouses(userLocation.coords.latitude, userLocation.coords.longitude);
    })();
  }, []);

  const fetchHouses = async (lat: number, lon: number) => {
    setLoading(true);

    // Use mock data if toggle is on
    if (useMockData) {
      setTimeout(() => {
        // Only show for_sale and pending properties
        const filteredHouses = MOCK_HOUSES.filter(h => h.status === 'for_sale' || h.status === 'pending');
        
        setHouses(filteredHouses);
        setLoading(false);
        console.log(`Loaded ${filteredHouses.length} mock houses`);
      }, 500);
      return;
    }
    try {
      const response = await fetch(
        `https://realtor.p.rapidapi.com/search/forsale/coordinates?latitude=${lat}&longitude=${lon}&radius=10&limit=50`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key":
              "93c0958df4msh56736edc202a76fp1e073cjsn1d1cbbeb3239",
            "X-RapidAPI-Host": "realtor16.p.rapidapi.com",
          },
        },
      );

      const data = await response.json();
      console.log("API Response:", data);

      // Parse the response based on the actual structure
      if (data.properties && data.properties.length > 0) {
        const properties = data.properties
          .filter((property: any) => property.location?.address?.coordinate)
          .map((property: any) => ({
            id: property.property_id,
            price: property.list_price,
            address: property.location?.address?.line || 'Address not available',
            beds: property.description?.beds,
            baths: property.description?.baths,
            latitude: property.location.address.coordinate.lat,
            longitude: property.location.address.coordinate.lon,
            status: property.status,
            type: property.description?.type,
            photos: property.photos || [], // Add this line
            primaryPhoto: property.primary_photo?.href || null, // Add this line
          }));
        setHouses(properties);
        console.log(`Loaded ${properties.length} houses`);
      }
    } catch (error) {
      console.error("Error fetching houses:", error);
      Alert.alert("Error", "Failed to fetch houses from API");
    } finally {
      setLoading(false);
    }
  };

  const getPinColor = (status: string) => {
    switch (status) {
      case "for_sale":
        return "#FF0000"; // Red for sale
      case "for_rent":
        return "#0000FF"; // Blue for rent
      case "sold":
        return "#808080"; // Gray for sold
      case "pending":
        return "#FFA500"; // Orange for pending
      case "off_market":
        return "#A9A9A9"; // Dark gray for off market
      default:
        return "#FF0000"; // Default to red
    }
  };

  const initialRegion = {
    latitude: location?.coords.latitude || 34.0522,
    longitude: location?.coords.longitude || -118.2437,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };
  // userLocation.coords.latitude, userLocation.coords.longitude

const renderPhotoModal = () => {
  if (!selectedHouse) return null;
  
  const photos = selectedHouse.photos && selectedHouse.photos.length > 0 
    ? selectedHouse.photos 
    : selectedHouse.primaryPhoto 
    ? [{ href: selectedHouse.primaryPhoto }] 
    : [];
  
  return (
    <Modal
      visible={selectedHouse !== null}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        setSelectedHouse(null);
        setCurrentPhotoIndex(0);
      }}
    >
      <View style={mapStyles.modalContainer}>
        {/* Header */}
        <View style={mapStyles.modalHeader}>
          <TouchableOpacity 
            onPress={() => {
              setSelectedHouse(null);
              setCurrentPhotoIndex(0);
            }}
            style={mapStyles.closeButton}
          >
            <Text style={mapStyles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={mapStyles.modalTitle}>{selectedHouse.address}</Text>
        </View>
        
        {/* Photo viewer */}
        {photos.length > 0 ? (
          <View style={mapStyles.photoContainer}>
            <Image 
              source={{ uri: photos[currentPhotoIndex].href }}
              style={mapStyles.photo}
              resizeMode="cover"
            />
            
            {/* Photo navigation */}
            {photos.length > 1 && (
              <View style={mapStyles.photoNavigation}>
                <TouchableOpacity 
                  onPress={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                  disabled={currentPhotoIndex === 0}
                  style={[mapStyles.navButton, currentPhotoIndex === 0 && mapStyles.navButtonDisabled]}
                >
                  <Text style={mapStyles.navButtonText}>←</Text>
                </TouchableOpacity>
                
                <Text style={mapStyles.photoCounter}>
                  {currentPhotoIndex + 1} / {photos.length}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => setCurrentPhotoIndex(Math.min(photos.length - 1, currentPhotoIndex + 1))}
                  disabled={currentPhotoIndex === photos.length - 1}
                  style={[mapStyles.navButton, currentPhotoIndex === photos.length - 1 && mapStyles.navButtonDisabled]}
                >
                  <Text style={mapStyles.navButtonText}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={mapStyles.noPhotoContainer}>
            <Text style={mapStyles.noPhotoText}>No photos available</Text>
          </View>
        )}
        
        {/* Property details */}
        <View style={mapStyles.detailsContainer}>
          <Text style={mapStyles.price}>${selectedHouse.price?.toLocaleString() || 'N/A'}</Text>
          <Text style={mapStyles.details}>
            {selectedHouse.beds || '?'} beds • {selectedHouse.baths || '?'} baths
          </Text>
          <Text style={mapStyles.status}>Status: {selectedHouse.status?.replace('_', ' ')}</Text>
        </View>
      </View>
    </Modal>
  );
};


  return (
    <View style={mapStyles.container}>
      {renderPhotoModal()}
      {loading && (
        <View style={mapStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Loading houses...</Text>
        </View>
      )}
      {Platform.OS === 'web' ? (
        <View style={mapStyles.map}>
          <Text style={mapStyles.webMessage}>Map view is not available on web. Please use the mobile app to view the map.</Text>
        </View>
      ) : (
        <MapView
          style={mapStyles.map}
          initialRegion={initialRegion}
          showsUserLocation={true}
          onRegionChangeComplete={(region) => {
            // Save the current map region when user moves the map
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
          {houses.map((house) => (
            <Marker
              key={house.id}
              coordinate={{
                latitude: house.latitude,
                longitude: house.longitude,
              }}
              pinColor={getPinColor(house.status)}
              onPress={() => {
                setSelectedHouse(house);
                setCurrentPhotoIndex(0);
              }}
            />
          ))}
        </MapView>
      )}

      <TouchableOpacity 
        style={mapStyles.searchButton}
        onPress={() => {
          if (location) {
            fetchHouses(location.coords.latitude, location.coords.longitude);
          }
        }}
      >
        <Text style={mapStyles.searchButtonText}>Search This Area</Text>
      </TouchableOpacity>
    </View>
  );
}




// STYLE STUFF
// Define constants at the top of your file (after imports)
const COLORS = {
  primary: '#007AFF',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#f0f0f0',
  border: '#ddd',
  text: '#333',
};

const SPACING = {
  xs: 5,
  sm: 10,
  md: 15,
  lg: 20,
  xl: 30,
};

const BORDER_RADIUS = {
  sm: 8,
  md: 10,
  lg: 20,
  round: 25,
};

const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
};

// Then use them in styles:
// const styles = StyleSheet.create({
//   filterButton: {
//     flex: 1,
//     backgroundColor: COLORS.white,
//     padding: SPACING.md,
//     marginHorizontal: SPACING.xs,
//     borderRadius: BORDER_RADIUS.sm,
//     alignItems: 'center',
//     ...SHADOWS.small,
//   },
//   filterButtonActive: {
//     backgroundColor: COLORS.primary,
//   },
  // ... etc
// });
const styles = StyleSheet.create({
  // Container & Layout
  container: {
    flex: 1,
  },
  
  // Map
  map: {
    width: '100%',
    height: '100%',
  },
  webMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 18,
    color: '#666',
  },
  
  // Loading
  loadingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 50,
  },
  
  // Filters
  filterContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  filterButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#333',
    fontWeight: '600',
  },
  filterTextActive: {
    color: 'white',
  },
  
  // Search Button
  searchButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal - Container
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  
  // Modal - Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  
  // Modal - Photos
  photoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoNavigation: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  navButtonText: {
    fontSize: 24,
    color: '#000',
  },
  photoCounter: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  noPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noPhotoText: {
    fontSize: 18,
    color: '#666',
  },
  
  // Modal - Details
  detailsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  details: {
    fontSize: 18,
    color: '#333',
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
});