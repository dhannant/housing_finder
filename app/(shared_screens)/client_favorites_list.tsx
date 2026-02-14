import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getFavorites } from '@/utils/functions';
import { FavoriteProperty } from '@/utils/interfaces';


export default function ClientFavoritesList() {
	const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
	const [loading, setLoading] = useState(false);
	const params = useLocalSearchParams();  // this gets all parameters that were passed from the router to the page, including clientId
	const { user } = useAuth();  //get current logged-in user
	
	//get the clientId
	// -for the agent side we can get this from parameters
	// -for the client side we can use the current user

	// useEffect fires every render, or when a dependancy is updated (these are tracked in an array and the end of this declaration)
	useEffect(() => {
		
		//first we need a function to load the favorites
		const loadFavorites = async () => {
			setLoading(true) //we immediately set loading to true because we should be loading data immediately
			try {
				// set the userId to either the client id (from parameters that were passed to the page) or the logged in user id, whichever is not null
				// params.clientId can be string or string[], so we ensure it's a string
				const clientIdParam = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
				const userId = clientIdParam ? clientIdParam : user?.uid;

				if(!userId) return; //if the userId is null here, that means that both the clientId and the userId were null... meaning, no agent is searching this page and no user is logged in.  This shouldn't happen BUT we test for it

				const data = await getFavorites(userId); //NOW we call getFavorites using the userId we built
				setFavorites(data); // set the favorites array with the data above
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		}
		loadFavorites();
	}, [params.clientId, user?.uid]) // [] is the array of variables that will trigger this useEffect to update again



	if (loading){
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center'}}>
				<ActivityIndicator size = "large"/>
				<Text style = {{ marginTop: 10}}>Loading...</Text>
	  		</View>
		);
	}
	// If no favorites exist, show empty state message
	if (favorites.length === 0) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text style={{ marginTop: 20 }}>No favorites saved yet.</Text>
			</View>
		);
	}

	// Render the list of favorite properties
	return (
		<FlatList
			data={favorites}  // Array of FavoriteProperty objects to display
			keyExtractor={(item) => item.id}  // Use Firestore doc ID as unique key for each card
			renderItem={({ item }) => (  // Function that renders each card - 'item' is one FavoriteProperty
				// Card container - this is the outer box for each favorite
				<View style={{
					backgroundColor: '#fff',       // White background for the card
					borderRadius: 8,               // Rounded corners (8px radius)
					padding: 12,                   // Space inside the card (12px all around)
					marginVertical: 8,             // Space between cards (8px top and bottom)
					marginHorizontal: 16,          // Space from screen edges (16px left and right)
					borderWidth: 1,                // 1px border around the card
					borderColor: '#ddd',           // Light gray border color
					shadowColor: '#000',           // Shadow color (iOS)
					shadowOpacity: 0.1,            // Shadow transparency (iOS)
					shadowRadius: 4,               // Shadow blur radius (iOS)
					shadowOffset: { width: 0, height: 2 },  // Shadow position (iOS)
					elevation: 2,                  // Shadow (Android) - simulates depth
				}}>
					{/* Property address - displayed as the main title */}
					<Text style={{
						fontSize: 16,               // Larger text for emphasis
						fontWeight: 'bold',         // Bold to make it stand out
						marginBottom: 6,            // Space below the address
						color: '#333',              // Dark gray for readability
					}}>
						{item.address}
					</Text>

					{/* Price - formatted with dollar sign and commas */}
					<Text style={{
						fontSize: 18,               // Large text for price
						fontWeight: '600',          // Semi-bold
						color: '#2e7d32',           // Green color (represents money/value)
						marginBottom: 4,            // Small space below
					}}>
						{/* If price exists, format it with commas. Otherwise show 'Price N/A' */}
						{item.price ? `$${item.price.toLocaleString()}` : 'Price N/A'}
					</Text>

					{/* Beds and Baths - displayed on one line */}
					<Text style={{
						fontSize: 14,               // Medium-small text
						color: '#666',              // Medium gray
						marginBottom: 4,            // Small space below
					}}>
						{/* Format: "3 bd | 2 ba" or show N/A if data is missing */}
						{item.beds !== null ? `${item.beds} bd` : 'N/A'} | {item.baths !== null ? `${item.baths} ba` : 'N/A'}
					</Text>

					{/* Status - like "For Sale", "Active", etc. */}
					{item.status && (  // Only show if status exists (conditional rendering)
						<Text style={{
							fontSize: 12,            // Smaller text for status
							color: '#999',           // Light gray
							fontStyle: 'italic',     // Italicized for subtle emphasis
						}}>
							{item.status}
						</Text>
					)}
				</View>
			)}
			contentContainerStyle={{ paddingVertical: 8 }}  // Add padding at top and bottom of the entire list
		/>
	);
}