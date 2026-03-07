import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type PushRegistrationResult = {
	token: string | null;
	reason:
		| 'success'
		| 'web'
		| 'expo_go'
		| 'permission_denied'
		| 'missing_project_id'
		| 'token_error';
	appOwnership?: string;
	details?: string;
};

export async function registerForPushNotificationsDetailedAsync(): Promise<PushRegistrationResult> {
	if (Platform.OS === 'web') {
		return { token: null, reason: 'web' };
	}

	if (Constants.appOwnership === 'expo') {
		console.warn('[Push] Skipping remote push token registration in Expo Go. Use a development build for push notifications.');
		return {
			token: null,
			reason: 'expo_go',
			appOwnership: String(Constants.appOwnership),
		};
	}

	const Notifications = await import('expo-notifications');

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== 'granted') {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== 'granted') {
		return { token: null, reason: 'permission_denied' };
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
		return { token: null, reason: 'missing_project_id' };
	}

	try {
		const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
		return {
			token: tokenResponse.data || null,
			reason: tokenResponse.data ? 'success' : 'token_error',
		};
	} catch (error) {
		console.warn('[Push] Failed to get Expo push token:', error);
		return {
			token: null,
			reason: 'token_error',
			details: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
	const result = await registerForPushNotificationsDetailedAsync();
	return result.token;
}