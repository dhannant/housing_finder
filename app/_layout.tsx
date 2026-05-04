import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { AuthProvider } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
	const colorScheme = useColorScheme();

	useEffect(() => {
		if (Constants.appOwnership === "expo") {
			return;
		}

		void (async () => {
			const Notifications = await import("expo-notifications");
			Notifications.setNotificationHandler({
				handleNotification: async () => ({
					shouldShowBanner: true,
					shouldShowList: true,
					shouldPlaySound: true,
					shouldSetBadge: false,
				}),
			});
		})();
	}, []);

	return (
		<AuthProvider>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<Stack>
					<Stack.Screen
						name="index"
						options={{ title: "Home" }}
					/>
					<Stack.Screen
						name="login"
						options={{ title: "Login" }}
					/>
					<Stack.Screen
						name="register"
						options={{ title: "Register" }}
					/>
					{/* <Stack.Screen
						name="client-dashboard"
						options={{ title: "Client Dashboard", headerShown: false, headerBackVisible: false }}
					/>
					<Stack.Screen
						name="agent-dashboard"
						options={{ title: "Agent Dashboard", headerShown: false, headerBackVisible: false }}
					/> */}
					<Stack.Screen
						name="(tabs)"
						options={{ headerShown: false, headerBackVisible: false }}
					/>
					<Stack.Screen
						name="client"
						options={{ headerShown: false, headerBackVisible: false }}
					/>
					<Stack.Screen
						name="agent"
						options={{ headerShown: false, headerBackVisible: false }}
					/>
					{/* <Stack.Screen
						name="admin"
						options={{ headerShown: false, headerBackVisible: false }}
					/> */}
					<Stack.Screen
						name="(shared_screens)"
						options={{ headerShown: false, headerBackVisible: false }}
					/>
					<Stack.Screen
						name="role-redirect"
						options={{ headerShown: false, headerBackVisible: false }}
					/>
					{/* <Stack.Screen
						name="modal"
						options={{ presentation: "modal", title: "Modal" }}
					/> */}
				</Stack>
				<StatusBar style="auto" />
			</ThemeProvider>
		</AuthProvider>
	);
}
