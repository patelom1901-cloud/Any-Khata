import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { hydrateSession } from '../lib/auth';
import { getBusinessByOwner, checkBusinessSubscriptionStatus } from '../lib/database';
import { Colors } from '../constants/theme';
import StartupAnimation from '../components/ui/StartupAnimation';

/**
 * Root entry point — performs session hydration on app startup
 * Checks for active Appwrite session and redirects accordingly
 */
export default function Index() {
  const [isHydrating, setIsHydrating] = useState(true);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [nextRoute, setNextRoute] = useState<string | null>(null);
  const { setUser, setHasBusiness, setIsSubscribed } = useAuthStore();

  useEffect(() => {
    const performSessionHydration = async () => {
      console.log('[index.tsx] performSessionHydration: START');
      try {
        // Check if an active session exists
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
          setNextRoute('/(tabs)/home');
        } else {
          // Clear all auth state when no valid session exists
          console.log('[index.tsx] No userDoc — setting next route to login');
          setUser(null);
          setHasBusiness(false);
          setIsSubscribed(false);
          setNextRoute('/(auth)/login');
        }
      } catch (error) {
        // On error, clear all auth state and set next route to login
        console.log('=== CAUGHT ERROR (performSessionHydration) ===', JSON.stringify(error));
        setUser(null);
        setHasBusiness(false);
        setIsSubscribed(false);
        setNextRoute('/(auth)/login');
      } finally {
        setIsHydrating(false);
        console.log('[index.tsx] performSessionHydration: DONE');
      }
    };

    performSessionHydration();
  }, []);

  // Coordinate the transition after both hydration and animation are done
  useEffect(() => {
    if (!isHydrating && isAnimationFinished && nextRoute) {
      console.log('[index.tsx] Both hydration and animation finished. Redirecting to:', nextRoute);
      router.replace(nextRoute as any);
    }
  }, [isHydrating, isAnimationFinished, nextRoute]);

  return (
    <View style={styles.loadingContainer}>
      <StartupAnimation onFinish={() => setIsAnimationFinished(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.creamBase,
  },
});
