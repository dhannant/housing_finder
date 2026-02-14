import { Stack } from 'expo-router';

export default function SharedScreensLayout() {
	return (
		<Stack>
			<Stack.Screen
				name="client_favorites_list"
				options={{
					title: 'My Favorites',
					headerShown: true,
				}}
			/>
		</Stack>
	);
}
