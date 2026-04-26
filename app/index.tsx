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
      try {
        // Check if an active session exists (this also clears stale cache if session is invalid)
        const userDoc = await hydrateSession();
        
        if (userDoc) {
          // Hydrate auth store with user data
          setUser(userDoc);
          
          // Check if user has a business
          const business = await getBusinessByOwner(userDoc.userId);
          setHasBusiness(!!business);
          
          // Check subscription status
          const isSubscribed = await checkBusinessSubscriptionStatus(userDoc.userId);
          setIsSubscribed(isSubscribed);
          router.replace('/(tabs)/home');
        } else {
          // Clear all auth state when no valid session exists
          setUser(null);
          setHasBusiness(false);
          setIsSubscribed(false);
          router.replace('/(auth)/login');
        }
      } catch (error) {
        // On error, clear all auth state and redirect to login
        setUser(null);
        setHasBusiness(false);
        setIsSubscribed(false);
        router.replace('/(auth)/login');
      } finally {
        setIsHydrating(false);
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
