import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  useFonts,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { initOfflineDB, getPendingCount } from '../lib/offlineQueue';
import { startSyncListener, runSync } from '../lib/syncWorker';
import { useAuthStore } from '../store/authStore';
import NetInfo from '@react-native-community/netinfo';
import { useInterstitialAd } from '../hooks/useInterstitialAd';

// Suppress Appwrite SDK network errors from RN's global handler.
// Our code catches these — this prevents the duplicate alert.
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
  if (error?.message?.includes('Network request failed')) {
    // Silently ignore — our try/catch handles these
    return;
  }
  originalHandler(error, isFatal);
});

// Keep the native splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const { showAd } = useInterstitialAd();

  useEffect(() => {
    const timer = setTimeout(() => {
      showAd();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Hide the native splash the instant fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    let unsubscribeSync: (() => void) | undefined;
    
    const initApp = async () => {
      await initOfflineDB();
      const count = await getPendingCount();
      useAuthStore.getState().setPendingCount(count);
      
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        setTimeout(() => {
          runSync()
            .then((res: any) => {
              if (res && res.synced > 0) {
                getPendingCount().then(count => 
                  useAuthStore.getState().setPendingCount(count)
                );
              }
            })
            .catch((e: any) => {
              console.log('[LAYOUT] initial runSync failed:', e?.message);
            });
        }, 5000);
      }
      
      unsubscribeSync = startSyncListener();
    };
    
    initApp();
    
    return () => {
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="ad-submit" options={{ headerShown: false }} />
            <Stack.Screen name="terms" options={{ headerShown: false }} />
            <Stack.Screen name="privacy" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

