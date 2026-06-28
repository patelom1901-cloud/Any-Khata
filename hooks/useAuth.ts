import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { logout as authLogout, getOrCreateUserDoc, getAuthUser } from '../lib/auth';
import { useUIStore } from '../store/uiStore';
import { account } from '../lib/appwrite';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '86622171566-1rcasnc44i99icq4lug9v7q210k4cs08.apps.googleusercontent.com',
  offlineAccess: false,
});

/**
 * Hook for auth operations
 * Wraps the store and lib functions, and handles post-login navigation.
 */
export const useAuth = () => {
  const { setUser, setLoading: setStoreLoading, logout: storeLogout } = useAuthStore();
  const { setError } = useUIStore();
  
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setStoreLoading(true);
      setError(null);

      // 1. Confirm Play Services available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // 2. Native Google Sign-In popup
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        console.log('[loginWithGoogle] User cancelled');
        return;
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('[loginWithGoogle] No idToken returned from Google');
      }
      console.log('[loginWithGoogle] Got idToken, calling Cloud Function...');

      // 3. POST idToken to Cloud Function
      const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
      const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
      const functionId = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_ID;

      const execResponse = await fetch(
        `${endpoint}/functions/${functionId}/executions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': projectId!,
          },
          body: JSON.stringify({
            body: JSON.stringify({ idToken }),
            path: '/google-auth',
            async: false,
          }),
        }
      );

      if (!execResponse.ok) {
        throw new Error(`[loginWithGoogle] Cloud Function HTTP error: ${execResponse.status}`);
      }

      const execData = await execResponse.json();
      console.log('[loginWithGoogle] Cloud Function raw response:', JSON.stringify(execData));

      const responseBodyStr = execData.responseBody ?? execData.response;
      if (!responseBodyStr) {
        throw new Error('[loginWithGoogle] Empty responseBody from Cloud Function');
      }

      const { userId, secret, error: fnError } = JSON.parse(responseBodyStr);

      if (fnError) {
        throw new Error(`[loginWithGoogle] Cloud Function returned error: ${fnError}`);
      }
      if (!userId || !secret) {
        throw new Error('[loginWithGoogle] Missing userId or secret in Cloud Function response');
      }

      console.log('[loginWithGoogle] Got userId and secret, creating Appwrite session...');

      // 4. Create Appwrite session
      await account.createSession(userId, secret);
      console.log('[loginWithGoogle] account.createSession called successfully');

      // 5. Existing post-login logic — kept exactly as it was before this change
      const authUser = await getAuthUser();
      if (!authUser) {
        throw new Error('Could not retrieve authenticated user after login.');
      }
      const userDoc = await getOrCreateUserDoc(authUser);
      setUser(userDoc);
      router.replace('/(tabs)/home');

    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[loginWithGoogle] Cancelled by user (statusCode)');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        console.log('[loginWithGoogle] Sign-in already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available');
        console.error('[loginWithGoogle] Play Services not available');
      } else {
        setError(err.message || 'Google Sign-In failed');
        console.error('[loginWithGoogle] Error:', err);
      }
    } finally {
      setLoading(false);
      setStoreLoading(false);
    }
  };

  const login = useCallback(loginWithGoogle, [loading, setStoreLoading, setError]);

  const logout = useCallback(async () => {
    try {
      // Step 1: Delete server-side Appwrite session FIRST
      await authLogout();
      // Step 2: Clear Zustand store state
      storeLogout();
      // Step 3: Navigate to login screen using replace (not push)
      router.replace('/(auth)/login');
    } catch (err: any) {
      // Even if server deletion fails, ALWAYS clear local state and navigate
      storeLogout();
      router.replace('/(auth)/login');
      
      setError(err.message || 'Logout failed');
    }
  }, [storeLogout, setError]);

  return { login, logout };
};
