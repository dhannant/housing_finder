import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

export default function RoleRedirect() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if(loading) {
            //Do Nothing
        } else {
            if (!user) {
                router.replace('/login');  // Send user to home screen
            } else if (userData?.role === 'Client') {
                router.replace('/client/(tabs)'); // Send user to the Client Dashboard
            } else if (userData?.role === 'Agent') {
                router.replace('/agent/(tabs)'); // Send user to the Agent Dashboard
            }
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

