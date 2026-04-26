import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  const hasRole = useAuthStore((state) => state.hasRole);

  const isOwner = hasRole('owner');
  const isCustomer = hasRole('customer');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
        },
      }}
    >
      {/* Home — always visible */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Khata — placeholder tab, visible always (not role-locked yet) */}
      <Tabs.Screen
        name="khata"
        options={{
          title: 'Khata',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-page-variant" size={size} color={color} />
          ),
        }}
      />

      {/* Ads — public */}
      <Tabs.Screen
        name="ads"
        options={{
          title: 'Ads',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bullhorn" size={size} color={color} />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />

      {/* Hide deeper route groups from the tab bar */}
      <Tabs.Screen name="business" options={{ href: null }} />
      <Tabs.Screen name="my-khata" options={{ href: null }} />
    </Tabs>
  );
}
