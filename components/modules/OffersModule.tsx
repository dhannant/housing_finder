import { fetchUserOffers , getFavorites } from '@/utils/functions';

import { OfferData } from '@/utils/interfaces';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View , Image } from 'react-native';


interface Offer {
  id: string;
  propertyId: string;
  status: string;
  [key: string]: any;
}

interface OffersModuleProps {
  userId: string;
  styles: any;
}

export const OffersModule: React.FC<OffersModuleProps> = ({ userId, styles }) => {
  const [offers, setOffers] = useState<OfferData[] | null>(null);
  const [favorites, setFavorites] = useState<FavoriteProperty[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOffersAndFavorites() {
      setLoading(true);
      const [allOffers, favs] = await Promise.all([
        fetchUserOffers(userId),
        getFavorites(userId)
      ]);
      const activeOffers = allOffers.filter(
        (offer: OfferData) => offer.status !== 'withdrawn' && offer.status !== 'offer declined'
      );
      setOffers(activeOffers);
      setFavorites(favs);
      setLoading(false);
    }
    if (userId) loadOffersAndFavorites();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color="#2C5F2D" />
        <Text style={styles.loadingText}>Loading your offers...</Text>
      </View>
    );
  }

  if (!offers || offers.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Active Offer</Text>
      {offers.map((offer) => {
        const favorite = favorites?.find(fav => fav.propertyId === offer.propertyId);
        const photoUrl = favorite?.primaryPhoto || (favorite?.photos && Array.isArray(favorite.photos) && favorite.photos[0]) || null;
        // Debug output
        console.log('Offer:', offer);
        console.log('Favorite:', favorite);
        console.log('Photo URL:', photoUrl);
        return (
          <View key={offer.id} style={{ marginBottom: 12 }}>
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
            {/* Show debug info */}
            <Text style={{ fontSize: 10, color: '#888' }}>Photo URL: {photoUrl || 'none'}</Text>
          </View>
        );
      })}
    </View>
  );
};