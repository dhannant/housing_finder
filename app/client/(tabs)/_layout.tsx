import { HapticTab } from '@/components/haptic-tab';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ProtectedRoute requiredRole = "Client">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
					headerBackVisible: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="client-dashboard"
          options={{ title: 'Dashboard',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{ 
            title: 'Favorites',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="star.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}