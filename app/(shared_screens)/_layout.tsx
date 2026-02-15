import { Stack } from 'expo-router';

export default function SharedScreensLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="client_favorites_list"
				options={{
					title: 'My Favorites',
					headerShown: true,
					headerBackVisible: false,
				}}
			/>
			<Stack.Screen
				name="profile"
				options={{
					title: 'Profile',
					headerShown: true,
					headerBackVisible: false,
				}}
			/>
		</Stack>
	);
}
