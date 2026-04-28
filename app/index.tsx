import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { hydrateSession } from '../lib/auth';
import { getBusinessByOwner, checkBusinessSubscriptionStatus } from '../lib/database';
import { Colors } from '../constants/colors';

/**
 * Root entry point — performs session hydration on app startup
 * Checks for active Appwrite session and redirects accordingly
 */
export default function Index() {
  const [isHydrating, setIsHydrating] = useState(true);
  const { setUser, setHasBusiness, setIsSubscribed } = useAuthStore();

  useEffect(() => {
    const performSessionHydration = async () => {
      console.log('[index.tsx] performSessionHydration: START');
      try {
        // Check if an active session exists (this also clears stale cache if session is invalid)
        console.log('[index.tsx] Calling hydrateSession()...');
        const userDoc = await hydrateSession();
        console.log('[index.tsx] hydrateSession() result:', JSON.stringify(userDoc));
        
        if (userDoc) {
          // Hydrate auth store with user data
          setUser(userDoc);
          
          // Check if user has a business
          console.log('[index.tsx] Fetching business for userId:', userDoc.userId);
          const business = await getBusinessByOwner(userDoc.userId);
          console.log('[index.tsx] business result:', JSON.stringify(business));
          setHasBusiness(!!business);
          
          // Check subscription status
          const isSubscribed = await checkBusinessSubscriptionStatus(userDoc.userId);
          console.log('[index.tsx] isSubscribed:', isSubscribed);
          setIsSubscribed(isSubscribed);
          console.log('[index.tsx] Navigating to /(tabs)/home');
          router.replace('/(tabs)/home');
        } else {
          // Clear all auth state when no valid session exists
          console.log('[index.tsx] No userDoc — redirecting to /(auth)/login');
          setUser(null);
          setHasBusiness(false);
          setIsSubscribed(false);
          router.replace('/(auth)/login');
        }
      } catch (error) {
        // On error, clear all auth state and redirect to login
        console.log('=== CAUGHT ERROR (performSessionHydration) ===', JSON.stringify(error));
        setUser(null);
        setHasBusiness(false);
        setIsSubscribed(false);
        router.replace('/(auth)/login');
      } finally {
        setIsHydrating(false);
        console.log('[index.tsx] performSessionHydration: DONE');
      }
    };

    performSessionHydration();
  }, []);

  // Show loading spinner while hydrating session
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
