import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function FavoritesRedirect() {
	const router = useRouter();

	useEffect(() => {
		// Immediately redirect to the shared favorites screen
		router.replace('/(shared_screens)/client_favorites_list');
	}, []);

	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
			<ActivityIndicator size="large" />
		</View>
	);
}
