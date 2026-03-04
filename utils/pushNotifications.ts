import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
	if (Platform.OS === 'web') {
		return null;
	}

	if (Constants.appOwnership === 'expo') {
		console.warn('[Push] Skipping remote push token registration in Expo Go. Use a development build for push notifications.');
		return null;
	}

	const Notifications = await import('expo-notifications');

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== 'granted') {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== 'granted') {
		return null;
	}

	if (Platform.OS === 'android') {
		await Notifications.setNotificationChannelAsync('default', {
			name: 'default',
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: '#FF231F7C',
		});
	}

	const projectId =
		Constants?.expoConfig?.extra?.eas?.projectId ??
		Constants?.easConfig?.projectId;

	if (!projectId) {
		console.warn('[Push] Missing EAS projectId; cannot get Expo push token.');
		return null;
	}

	try {
		const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
		return tokenResponse.data || null;
	} catch (error) {
		console.warn('[Push] Failed to get Expo push token:', error);
		return null;
	}
}