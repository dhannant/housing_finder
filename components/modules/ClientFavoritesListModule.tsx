import { db } from '@/components/firebaseConfig';
import PropertyDetailsModal from '@/components/modules/PropertyDetailsModal';
import { landingStyles } from '@/constants/styles';
import { useAuth } from '@/contexts/AuthContext';
import { createClientOffer, deleteFavoriteById, fetchClientFavorites, fetchFavoriteByID, fetchUserData } from '@/utils/functions';
import { FavoriteProperty, OfferData } from '@/utils/interfaces';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClientFavoritesList({ favoriteIds }: { favoriteIds?: string[] }) {
	const [assignedClients, setAssignedClients] = useState<string[]>([]);
	const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
	const [loading, setLoading] = useState(true);
	const [offers, setOffers] = useState<{ [propertyId: string]: OfferData | null }>({});
	const [clientHasActiveOffer, setClientHasActiveOffer] = useState<{ [clientId: string]: boolean }>({});
	const [propertyHasActiveOffer, setPropertyHasActiveOffer] = useState<{ [propertyId: string]: boolean }>({});
	const [selectedProperty, setSelectedProperty] = useState<FavoriteProperty | null>(null);
	const params = useLocalSearchParams();  // this gets all parameters that were passed from the router to the page, including clientId
	const { user, userData } = useAuth();  //get current logged-in user
	const [ clientData, setClientData ] = useState<any>(null);
	const { role } = useAuth();
	const isAgent = role === 'Agent';
	const isClient = role === 'Client';

	// Only log errors and important debug info

	//get the clientId
	// -for the agent side we can get this from parameters
	// -for the client side we can use the current user

	// Fetch assignments (agent only)
	useEffect(() => {
		const loadAll = async () => {
			setLoading(true);
			try {
				let assigned: string[] = [];
				if (isAgent && user?.uid) {
					const { fetchAssignedClients } = await import('@/utils/functions');
					const assignedResult = await fetchAssignedClients(user.uid);
					assigned = assignedResult.map((req: any) => req.clientId);
					setAssignedClients(assigned);
				}

				let data: FavoriteProperty[] = [];
				if (isClient && favoriteIds && favoriteIds.length > 0) {
					const favResults = await Promise.all(favoriteIds.map(id => fetchFavoriteByID(id)));
					data = favResults.filter(Boolean) as FavoriteProperty[];
					setFavorites(data);
				} else {
					// Agent logic: fetchClientFavorites for assigned clients
					const clientIdParam = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
					const userId = clientIdParam ? clientIdParam : user?.uid;
					if (!userId) return;
					const clientData = await fetchUserData(userId);
					setClientData(clientData);
					data = await fetchClientFavorites(userId);
					setFavorites(data);
				}

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
								if (offer.status !== 'Offer Withdrawn' && 
									offer.status !== 'Offer Declined') {
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
								if (offer.status !== 'Offer Withdrawn' &&
									offer.status !== 'Offer Declined') {
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
				// Clients can query offers for themselves only
				if (isClient) {
					await Promise.all(data.map(async (fav) => {
					  // Query offers for this client and property
					  const offersRef = collection(db, 'clientOffers');
					  const q = query(
						 offersRef,
						 where('clientId', '==', user?.uid),
						 where('propertyId', '==', fav.propertyId)
					  );
					  const snapshot = await getDocs(q);
					  let activeOffer: OfferData | null = null;
					  snapshot.docs.forEach(doc => {
						 const offer = doc.data();
						 if (
							offer.status !== 'Offer Withdrawn' &&
							offer.status !== 'Offer Declined'
						 ) {
							activeOffer = {
							  status: offer.status,
							  offerId: doc.id, // <-- Firestore document ID
							  clientId: offer.clientId,
							  agentId: offer.agentId ?? '',
							  propertyId: offer.propertyId ?? fav.propertyId,
							  createdAt: offer.createdAt ? new Date(offer.createdAt) : new Date(),
							  updatedAt: offer.updatedAt ? new Date(offer.updatedAt) : new Date(),
							  dueDiligenceStart: offer.dueDiligenceStart ? new Date(offer.dueDiligenceStart) : null,
							  dueDiligenceEnd: offer.dueDiligenceEnd ? new Date(offer.dueDiligenceEnd) : null,
							  closingDate: offer.closingDate ? new Date(offer.closingDate) : null,
							  inspectionDate: offer.inspectionDate ? new Date(offer.inspectionDate) : null,
							  earnestMoneyDueDate: offer.earnestMoneyDueDate ? new Date(offer.earnestMoneyDueDate) : null,
							  earnestMoneyAmountDue: offer.earnestMoneyAmountDue ?? null,
							  notes: offer.notes ?? '',
							  files: offer.files ?? '',
							};
						 }
					  });
					  offers[fav.propertyId] = activeOffer;
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
	}, [params.clientId, user?.uid, isAgent, isClient, favoriteIds]);


	// Unfavorite handler must be in scope
   const handleUnfavorite = async (favoriteDocId: string) => {
      try {
         await deleteFavoriteById(favoriteDocId);
         setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteDocId));
      } catch (error) {
         alert('Failed to remove favorite.');
      }
   };

	
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
		<SafeAreaView style={landingStyles.container}>
			<PropertyDetailsModal
				visible={selectedProperty !== null}
				property={selectedProperty}
				onClose={() => setSelectedProperty(null)}
			/>
			{/* Header with logo and login button */}
			<View style={landingStyles.header}>
				<Text style={landingStyles.logoTitle}>{clientData?.firstName} {clientData?.lastName}&apos;s Favorite List</Text>
			</View>
			<FlatList
				data={favorites}
				keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
				renderItem={({ item }) => (
					// Card container - this is the outer box for each favorite
					<TouchableOpacity
						onPress={() => {
							setSelectedProperty(item);
						}}
						activeOpacity={0.9}
						style={{
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
						}}
					>
						<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
							{item.primaryPhoto ? (
								<Image
									source={{ uri: item.primaryPhoto }}
									style={{ width: 64, height: 64, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' }}
									resizeMode="cover"
								/>
							) : (
								<View style={{ width: 64, height: 64, borderRadius: 8, marginRight: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
									<Text style={{ color: '#888', fontSize: 12 }}>No Photo</Text>
								</View>
							)}

							<View style={{ flex: 1 }}>
								<Text style={{
									fontSize: 16,
									fontWeight: 'bold',
									marginBottom: 6,
									color: '#333',
								}}>
									{item.address}
								</Text>

								<Text style={{
									fontSize: 18,
									fontWeight: '600',
									color: '#2e7d32',
									marginBottom: 4,
								}}>
									{item.price ? `$${item.price.toLocaleString()}` : 'Price N/A'}
								</Text>

								<Text style={{
									fontSize: 14,
									color: '#666',
									marginBottom: 4,
								}}>
									{item.beds !== null ? `${item.beds} bd` : 'N/A'} | {item.baths !== null ? `${item.baths} ba` : 'N/A'}
								</Text>

								<Text style={{
									fontSize: 13,
									color: '#555',
									marginBottom: 2,
								}}>
									Type: {item.type ? item.type.replace(/_/g, ' ') : 'N/A'}
								</Text>

								<Text style={{
									fontSize: 13,
									color: '#555',
									marginBottom: 2,
								}}>
									Sqft: {item.sqft !== null ? item.sqft.toLocaleString() : 'N/A'} | Lot: {item.lot_sqft !== null ? item.lot_sqft.toLocaleString() : 'N/A'}
								</Text>

								<Text style={{
									fontSize: 13,
									color: '#555',
								}}>
									Status: {item.status ? item.status.replace(/_/g, ' ') : 'N/A'}
								</Text>
							</View>
						</View>

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
												   // [REMOVED LOG]
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
											setClientHasActiveOffer(prev => ({
												...prev,
												[item.userId]: true
											}));
											setPropertyHasActiveOffer(prev => ({
												...prev,
												[item.propertyId]: true
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
						{/* Unfavorite button */}
						<TouchableOpacity
							onPress={() => handleUnfavorite(item.id)}
							style={{
								marginLeft: 8,
								backgroundColor: '#f8d7da',
								borderRadius: 16,
								paddingVertical: 4,
								paddingHorizontal: 10,
								alignSelf: 'flex-start',
								borderWidth: 1,
								borderColor: '#f5c2c7',
							}}
						>
							<Text style={{ color: '#a71d2a', fontWeight: 'bold', fontSize: 13 }}>Unfavorite</Text>
						</TouchableOpacity>
					</TouchableOpacity>
					
				)}
				contentContainerStyle={{ paddingVertical: 8 }}  // Add padding at top and bottom of the entire list
			/>
			{/* Footer with copyright */}
			<View style={landingStyles.footer}>
				
			</View>
		</SafeAreaView>
	)}