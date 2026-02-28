import {useAuth} from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View, Text} from 'react-native';

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
    
    //Not sure how to do the loading spinner thing... 
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size = "large"/>
            <Text style = {{ marginTop: 10}}>Loading...</Text>
        </View>
    )
}

