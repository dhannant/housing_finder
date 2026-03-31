import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function DashboardWrapper() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (role === 'Client') {
      router.replace('/client/(tabs)/client-dashboard');
    } else if (role === 'Agent') {
      router.replace('/agent/(tabs)/agent-dashboard');
    } else {
      // Default fallback or unauthorized
      router.replace('/');
    }
  }, [user, role, loading, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
