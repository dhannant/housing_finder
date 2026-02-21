
import { fetchUserData } from '@/utils/functions';
import { UserData } from '@/utils/interfaces';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface YourAgentModuleProps {
  realtorId: string;
  styles: any;
}

export const YourAgentModule: React.FC<YourAgentModuleProps> = ({ realtorId, styles }) => {
  const [realtor, setRealtor] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRealtor() {
      setLoading(true);
      const data = await fetchUserData(realtorId);
      setRealtor(data);
      setLoading(false);
    }
    if (realtorId) loadRealtor();
  }, [realtorId]);

  if (loading) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color="#2C5F2D" />
        <Text style={styles.loadingText}>Loading your agent...</Text>
      </View>
    );
  }

  if (!realtor) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Agent</Text>
      <View style={styles.realtorCard}>
        <View style={styles.realtorInfo}>
          <View style={styles.realtorAvatar}>
            <Text style={styles.realtorInitials}>
              {realtor.firstName?.[0]}{realtor.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.realtorDetails}>
            <Text style={styles.realtorName}>{realtor.firstName} {realtor.lastName}</Text>
            <Text style={styles.realtorEmail}>{realtor.email}</Text>
            {realtor.phoneNumber && <Text style={styles.realtorPhone}>{realtor.phoneNumber}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
};
