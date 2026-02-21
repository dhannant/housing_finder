import { db } from '@/components/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import { createClientOffer, getFavorites } from '@/utils/functions';
import { FavoriteProperty, OfferData } from '@/utils/interfaces';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

export default function ClientFavoritesList() {
	const [assignedClients, setAssignedClients] = useState<string[]>([]);
	const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
	const [loading, setLoading] = useState(true);
	const [offers, setOffers] = useState<{ [propertyId: string]: OfferData | null }>({});
	const [clientHasActiveOffer, setClientHasActiveOffer] = useState<{ [clientId: string]: boolean }>({});
	const [propertyHasActiveOffer, setPropertyHasActiveOffer] = useState<{ [propertyId: string]: boolean }>({});
	const params = useLocalSearchParams();  // this gets all parameters that were passed from the router to the page, including clientId
	const { user, userData } = useAuth();  //get current logged-in user
	const isAgent = userData?.role === 'Agent';
	const isClient = userData?.role === 'Client';

	// Only log errors and important debug info

	//get the clientId
	// -for the agent side we can get this from parameters
	// -for the client side we can use the current user

	// Fetch assignments (agent only)
	useEffect(() => {
		const loadAll = async () => {
			setLoading(true);
			try {
				// Fetch assignments first (if agent)
				let assigned: string[] = [];
				if (isAgent && user?.uid) {
					const { fetchAssignedClients } = await import('@/utils/functions');
					const assignedResult = await fetchAssignedClients(user.uid);
					assigned = assignedResult.map((req: any) => req.clientId);
					setAssignedClients(assigned);
				}

				// Fetch favorites
				const clientIdParam = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
				const userId = clientIdParam ? clientIdParam : user?.uid;
				if (!userId) return;
				const data = await getFavorites(userId);
				setFavorites(data);

				// Only agents query offers for assigned clients
				let clientHasActiveOffer: { [clientId: string]: boolean } = {};
				let propertyHasActiveOffer: { [propertyId: string]: boolean } = {};
				let offers: { [propertyId: string]: OfferData | null } = {};
				if (isAgent) {
					await Promise.all(data.map(async (fav) => {
						if (assigned.includes(fav.userId)) {
							// Check client active offer
							const clientOffersRef = collection(db, 'clientOffers');
							const clientOffersQ = query(clientOffersRef, where('clientId', '==', fav.userId));
							const clientOffersSnap = await getDocs(clientOffersQ);
							let foundClientActive = false;
							clientOffersSnap.docs.forEach(doc => {
								const offer = doc.data();
								if (offer.status !== 'withdrawn' && offer.status !== 'Offer Declined' && offer.status !== 'offer declined') {
									foundClientActive = true;
								}
							});
							clientHasActiveOffer[fav.userId] = foundClientActive;

							// Check property active offer and store offer status/id/clientId
							const offersRef = collection(db, 'clientOffers');
							const q = query(offersRef, where('propertyId', '==', fav.propertyId));
							const snapshot = await getDocs(q);
							let foundPropertyActive = false;
							let activeOffer: OfferData | null = null;
							snapshot.docs.forEach(doc => {
								const offer = doc.data();
								if (offer.status !== 'withdrawn' &&
									offer.status !== 'Offer Declined' &&
									offer.status !== 'offer declined') {
									foundPropertyActive = true;
									activeOffer = {
										status: offer.status,
										offerId: doc.id,
										clientId: offer.clientId,
										agentId: offer.agentId ?? '',
										propertyId: offer.propertyId ?? fav.propertyId,
										createdAt: offer.createdAt ? new Date(offer.createdAt) : new Date(),
										updatedAt: offer.updatedAt ? new Date(offer.updatedAt) : new Date(),
										dueDiligenceStart: offer.dueDiligenceStart ? new Date(offer.dueDiligenceStart) : null,
										dueDiligenceEnd: offer.dueDiligenceEnd ? new Date(offer.dueDiligenceEnd) : null,
										closingDate: offer.closingDate ? new Date(offer.closingDate) : null,
										inspectionDate: offer.inspectionDate ? new Date(offer.inspectionDate) : null,
										moveInDate: offer.moveInDate ? new Date(offer.moveInDate) : null,
										earnestMoneyDueDate: offer.earnestMoneyDueDate ? new Date(offer.earnestMoneyDueDate) : null,
										earnestMoneyAmountDue: offer.earnestMoneyAmountDue ?? null,
										notes: offer.notes ?? '',
										files: offer.files ?? '',
									};
								}
							});
							propertyHasActiveOffer[fav.propertyId] = foundPropertyActive;
							offers[fav.propertyId] = activeOffer;
						} else {
							clientHasActiveOffer[fav.userId] = false;
							propertyHasActiveOffer[fav.propertyId] = false;
							offers[fav.propertyId] = null;
						}
					}));
				}
				setClientHasActiveOffer(clientHasActiveOffer);
				setPropertyHasActiveOffer(propertyHasActiveOffer);
				setOffers(offers);
			} catch (error) {
				console.error('[FavoritesScreen] error loading favorites/offers:', error);
			} finally {
				setLoading(false);
			}
		};
		loadAll();
	}, [params.clientId, user?.uid, isAgent]);

	if (loading) {
		if (loading) {
			return (
				<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
					<ActivityIndicator size="large" />
					<Text style={{ marginTop: 10 }}>Loading...</Text>
				</View>
			);
		}
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
					borderRadius: 8,                // Rounded corners (8px radius)
					padding: 12,                    // Space inside the card (12px all around)
					marginVertical: 8,              // Space between cards (8px top and bottom)
					marginHorizontal: 16,           // Space from screen edges (16px left and right)
					borderWidth: 1,                 // 1px border around the card
					borderColor: '#ddd',           // Light gray border color
					shadowColor: '#000',           // Shadow color (iOS)
					shadowOpacity: 0.1,             // Shadow transparency (iOS)
					shadowRadius: 4,                // Shadow blur radius (iOS)
					shadowOffset: { width: 0, height: 2 },  // Shadow position (iOS)
					elevation: 2,                   // Shadow (Android) - simulates depth
				}}>
					{/* Property address - displayed as the main title */}
					<Text style={{
						fontSize: 16,               	// Larger text for emphasis
						fontWeight: 'bold',         	// Bold to make it stand out
						marginBottom: 6,            	// Space below the address
						color: '#333',              // Dark gray for readability
					}}>
						{item.address}
					</Text>

					{/* Price - formatted with dollar sign and commas */}
					<Text style={{
						fontSize: 18,               	// Large text for price
						fontWeight: '600',          	// Semi-bold
						color: '#2e7d32',           // Green color (represents money/value)
						marginBottom: 4,            	// Small space below
					}}>
						{/* If price exists, format it with commas. Otherwise show 'Price N/A' */}
						{item.price ? `$${item.price.toLocaleString()}` : 'Price N/A'}
					</Text>

					{/* Beds and Baths - displayed on one line */}
					<Text style={{
						fontSize: 14,               	// Medium-small text
						color: '#666',              // Medium gray
						marginBottom: 4,            	// Small space below
					}}>
						{/* Format: "3 bd | 2 ba" or show N/A if data is missing */}
						{item.beds !== null ? `${item.beds} bd` : 'N/A'} | {item.baths !== null ? `${item.baths} ba` : 'N/A'}
					</Text>

					{/* Offer status display: show real status to owner client and assigned agent, 'Offer Pending' to other clients */}
					{(() => {
						const offer = offers[item.propertyId];
						const clientId = user?.uid;
						const assignedToClient = assignedClients.includes(item.userId);
						if (offer) {
							// Show real status to owner client
							if (isClient && offer.clientId === clientId) {
								return (
									<Text style={{ color: '#2C5F2D', fontWeight: 'bold', marginTop: 8 }}>
										Offer Status: {offer.status}
									</Text>
								);
							}
							// Show real status to assigned agent for this client
							if (isAgent && assignedToClient && offer.clientId === item.userId) {
								return (
									<Text style={{ color: '#2C5F2D', fontWeight: 'bold', marginTop: 8 }}>
										Offer Status: {offer.status}
									</Text>
								);
							}
							// Show 'Offer Pending' to other clients
							if (isClient && offer.clientId !== clientId) {
								return (
									<Text style={{ color: '#b45309', fontWeight: 'bold', marginTop: 8 }}>Offer Pending</Text>
								);
							}
						}
						return null;
					})()}
					{/* View Offer button logic: Only the client who owns the offer and the assigned agent see the button; other clients see 'Offer Pending' */}
					{(() => {
						const assignedToClient = assignedClients.includes(item.userId);
						const offer = offers[item.propertyId];
						const clientId = user?.uid;
						if (offer) {
							// Agent: show button only if assigned to this client and this is the client's offer
							if (isAgent && assignedToClient && offer.clientId === item.userId) {
								return (
									<TouchableOpacity
										style={{
											marginTop: 10,
											backgroundColor: '#1D4ED8',
											paddingVertical: 8,
											borderRadius: 6,
											alignItems: 'center',
										}}
										onPress={() => {
											console.log('Navigating to details:', offer.offerId, offer.clientId, offer.agentId, offer.propertyId);
											router.push({
												pathname: "/(shared_screens)/client_offer_details",
												params: {
													offerId: offer.offerId,
													clientId: offer.clientId,
													agentId: offer.agentId,
													propertyId: offer.propertyId,
												},
											});
										}}
									>
										<Text style={{ color: '#fff', fontWeight: 'bold' }}>View Offer</Text>
									</TouchableOpacity>
								);
							}
							// Client: show button only if this is their offer
							if (isClient && offer.clientId === clientId) {
								return (
									<TouchableOpacity
										style={{
											marginTop: 10,
											backgroundColor: '#1D4ED8',
											paddingVertical: 8,
											borderRadius: 6,
											alignItems: 'center',
										}}
										onPress={() => {
											alert(`View Offer: ${offer.offerId}`);
										}}
									>
										<Text style={{ color: '#fff', fontWeight: 'bold' }}>View Offer</Text>
									</TouchableOpacity>
								);
							}
							// Other clients: show 'Offer Pending'
							if (offer.clientId !== clientId) {
								return (
									<Text style={{ color: '#b45309', fontWeight: 'bold', marginTop: 8 }}>Offer Pending</Text>
								);
							}
						}
						return null;
					})()}
					{/* Agent-only: Create Offer button (must be agent, assigned to client, client has no active offer, property has no active offer) */}
					{(() => {
						const assignedToClient = assignedClients.includes(item.userId);
						const showButton = isAgent && assignedToClient && !clientHasActiveOffer[item.userId] && !propertyHasActiveOffer[item.propertyId];
						console.log('[Create Offer Button]', {
							isAgent,
							assignedToClient,
							clientHasOffer: clientHasActiveOffer[item.userId],
							propertyHasOffer: propertyHasActiveOffer[item.propertyId],
							showButton,
							itemUserId: item.userId,
							itemPropertyId: item.propertyId
						});
						if (!showButton) return null;
						return (
							<TouchableOpacity
								style={{
									marginTop: 10,
									backgroundColor: '#2C5F2D',
									paddingVertical: 8,
									borderRadius: 6,
									alignItems: 'center',
								}}
								onPress={async () => {
									try {
										const offerData = {
											propertyId: item.propertyId,
											clientId: item.userId,
											agentId: user?.uid,
											status: 'Offer Made',
										};
										if (!offerData.clientId || !offerData.agentId || !offerData.propertyId) {
											alert('Missing required offer information.');
											return;
										}
										await createClientOffer(offerData.clientId, offerData.agentId, offerData.propertyId, offerData.status);
										// setOffers(prev => ({ ...prev, [`${item.userId}_${item.propertyId}`]: 'Offer Made' }));
										setOffers(prev => ({
											...prev,
											[item.propertyId]: {
												status: 'Offer Made',
												offerId: '', // set to actual offerId if available
												clientId: item.userId,
												agentId: user?.uid ?? '',
												propertyId: item.propertyId,
												createdAt: new Date(),
												updatedAt: new Date(),
												dueDiligenceStart: null,
												dueDiligenceEnd: null,
												closingDate: null,
												inspectionDate: null,
												moveInDate: null,
												earnestMoneyDueDate: null,
												earnestMoneyAmountDue: null,
												notes: '',
												files: '',
											}
										}));
									} catch {
										alert('Failed to create offer. Please ensure you meet eligibility requirements.');
									}
								}}
							>
								<Text style={{ color: '#fff', fontWeight: 'bold' }}>Create Offer</Text>
							</TouchableOpacity>
						);
					})()}
				</View>
			)}
			contentContainerStyle={{ paddingVertical: 8 }}  // Add padding at top and bottom of the entire list
		/>
	);
}