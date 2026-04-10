import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Stack } from 'expo-router';

export default function SharedScreensLayout() {
	return (
		<ProtectedRoute>
			<Stack>
				<Stack.Screen
					name="sell-home/index"
					options={{
						title: 'Sell My Home',
						headerShown: true,
					}}
				/>
				<Stack.Screen
					name="sell-home/traditional-details"
					options={{
						title: 'Property Details',
						headerShown: true,
					}}
				/>
				<Stack.Screen
					name="sell-home/traditional-availability"
					options={{
						title: 'Availability',
						headerShown: true,
					}}
				/>
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
		</ProtectedRoute>
	);
}
