import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

export default function RoleRedirect() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) {
            return;
        }

        if (!user) {
            router.replace('/login');
            return;
        }

        // User is authenticated but profile data may still be resolving.
        if (!userData) {
            return;
        }

        const normalizedRole = String(userData.role ?? '').trim().toLowerCase();
        if (normalizedRole === 'admin') {
            router.replace('/admin/dashboard');
        } else if (normalizedRole === 'client') {
            router.replace('/client/(tabs)');
        } else if (normalizedRole === 'agent') {
            router.replace('/agent/(tabs)');
        } else {
            router.replace('/');
        }
    }, [user, userData, loading, router])
    
    return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                <View style={{ width: 240, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Image
                        source={require('@/assets/images/LE_logo.png')}
                        style={{ width: 220, height: 100 }}
                        resizeMode="contain"
                    />
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#2C5F2D" />
                    </View>
                </View>
                <Text style={{ marginTop: 8, color: '#1F2937', fontWeight: '600' }}>Loading your dashboard...</Text>
            </View>
    )
}

