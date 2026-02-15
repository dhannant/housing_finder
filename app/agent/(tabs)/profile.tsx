import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function ProfileRedirect() {
	const router = useRouter();

	useEffect(() => {
		// Just redirect users to the shared profile screen
		router.replace('/(shared_screens)/profile');
	}, [router]);

	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
			<ActivityIndicator size="large" />
		</View>
	);
}
