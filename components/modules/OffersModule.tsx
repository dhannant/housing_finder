import { fetchFavoriteByID, fetchOfferDatabyID } from '@/utils/functions';
import { FavoriteProperty, OfferData } from '@/utils/interfaces';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

interface OffersModuleProps {
    userId: string;
    styles: any;
    activeOfferId: string | null;
    favoriteIds: string[];
}

export const OffersModule: React.FC<OffersModuleProps> = ({ userId, styles, activeOfferId, favoriteIds }) => {
	const router = useRouter();
	const [offer, setOffer] = useState<OfferData | null>(null);
	const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadOfferAndFavorites() {
			setLoading(true);
			try {
				let offerResult: OfferData | null = null;
				if (activeOfferId) {
					const fetchedOffer = await fetchOfferDatabyID(activeOfferId);
					offerResult = fetchedOffer || null;
				}
				const favoriteResults = await Promise.all(favoriteIds.map(id => fetchFavoriteByID(id)));
				if (!cancelled) {
					setOffer(offerResult);
					setFavorites(favoriteResults.filter(Boolean) as FavoriteProperty[]);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}
		if (activeOfferId || favoriteIds.length > 0) {
			loadOfferAndFavorites();
		} else {
			setOffer(null);
			setFavorites([]);
			setLoading(false);
		}

		return () => {
			cancelled = true;
		};
	}, [activeOfferId, favoriteIds]);

	if (loading) {
		return (
			<View style={styles.section}>
				<ActivityIndicator size="small" color="#2C5F2D" />
				<Text style={styles.loadingText}>Loading your offer...</Text>
			</View>
		);
	}

	if (!offer) return null;

	const favorite = favorites.find(fav => fav.propertyId === offer.propertyId);
	const photoUrl = favorite?.primaryPhoto || (favorite?.photos && Array.isArray(favorite.photos) && favorite.photos[0]) || null;

	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Active Offer</Text>
			<View
				key={offer.propertyId}
				style={{
					marginBottom: 12,
					backgroundColor: '#fff',
					borderRadius: 8,
					padding: 12,
					shadowColor: '#000',
					shadowOpacity: 0.08,
					shadowRadius: 4,
					shadowOffset: { width: 0, height: 2 },
					elevation: 2
				}}
			>
				<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
					{photoUrl ? (
						<Image
							source={{ uri: photoUrl }}
							style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
							resizeMode="cover"
						/>
					) : (
						<Text style={{ color: 'red', marginRight: 12 }}>No photo</Text>
					)}
					<Text style={styles.realtorName}>{favorite?.address || 'Address not available'}</Text>
				</View>
				<Text>Status: {offer.status}</Text>
			</View>
		</View>
	);
};