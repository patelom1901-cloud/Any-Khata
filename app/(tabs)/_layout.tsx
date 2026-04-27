import { Tabs, useRouter, useSegments } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { DynamicIsland } from '@/components/ui/DynamicIsland';

export default function TabsLayout() {
  const hasRole = useAuthStore((state) => state.hasRole);
  const router = useRouter();
  const segments = useSegments();
  
  // The second segment in /(tabs)/home is 'home'
  const activeTab = (segments as string[])[1] || 'home';

  const isOwner = hasRole('owner');
  const isCustomer = hasRole('customer');

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="khata"
          options={{
            title: 'Khata',
          }}
        />
        <Tabs.Screen
          name="ads"
          options={{
            title: 'Ads',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
        <Tabs.Screen name="business" options={{ href: null }} />
        <Tabs.Screen name="my-khata" options={{ href: null }} />
      </Tabs>
      
      <DynamicIsland 
        activeTab={activeTab} 
        onTabPress={(tab) => router.push(`/(tabs)/${tab}`)} 
      />
    </View>
  );
}

