/** Custom function to prevent logged out users from accessing pages they 
* shouldn't as well prevent Agents / Clients from accessing each others pages.
*/
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'Client' | 'Agent';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userData, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in - redirect to login
        // [REMOVED LOG]
        router.replace('/login');
      } else if (requiredRole && role !== requiredRole) {
        // Logged in but wrong role - redirect to home
        // [REMOVED LOG]
        alert(`This page is for ${requiredRole}s only`);
        router.replace('/');
      }
    }
  }, [user, role, loading, requiredRole]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (requiredRole && role !== requiredRole) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
