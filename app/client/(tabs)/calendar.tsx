import { auth } from '@/components/firebaseConfig';
import CalendarModule from '@/components/modules/calendarModule';
import { clientDashboard_styles } from '@/constants/styles';
import { fetchActiveOfferForClient } from '@/utils/functions';
import { useEffect, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function ClientCalendarTab() {
  const user = auth.currentUser;
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  useEffect(() => {
    async function loadActiveOffer() {
      if (!user?.uid) {
        setActiveOfferId(null);
        return;
      }

      try {
        const activeOffer = await fetchActiveOfferForClient(user.uid);
        setActiveOfferId(activeOffer?.offerId || null);
      } catch (error) {
        console.error('Error loading active offer for calendar:', error);
        setActiveOfferId(null);
      }
    }

    loadActiveOffer();
  }, [user?.uid]);

  return (
    <SafeAreaView style={clientDashboard_styles.container}>
      <View style={{ padding: 16 }}>
        {activeOfferId ? (
          <CalendarModule role="client" activeOfferId={activeOfferId} />
        ) : (
          <Text style={{ color: '#666' }}>No active offer calendar events yet.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
