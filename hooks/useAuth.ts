import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { logout as authLogout, getOrCreateUserDoc, getAuthUser } from '../lib/auth';
import { useUIStore } from '../store/uiStore';
import { account } from '../lib/appwrite';
import { OAuthProvider } from 'react-native-appwrite';

import * as Linking from 'expo-linking';

/**
 * Hook for auth operations
 * Wraps the store and lib functions, and handles post-login navigation.
 */
export const useAuth = () => {
  const { setUser, setLoading: setStoreLoading, logout: storeLogout } = useAuthStore();
  const { setError } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const handledUrl = useRef<string | null>(null);

  // Shared handler: parse any incoming URL and finalize login if it carries userId+secret.
  // Used by both Linking.addEventListener (foreground) and Linking.getInitialURL (cold-start).
  const processOAuthUrl = useCallback(
    async (url: string | null) => {
      if (!url) return;

      if (__DEV__) {
        console.log('=== AUTH CALLBACK FIRED === url:', url);
      }

      if (handledUrl.current === url) {
        if (__DEV__) {
          console.log('[useAuth] processOAuthUrl: url already handled, skipping double-fire:', url);
        }
        return;
      }
      handledUrl.current = url;

      const parsed = Linking.parse(url);
      const secret = parsed.queryParams?.secret as string;
      const userId = parsed.queryParams?.userId as string;

      if (__DEV__) {
        console.log('[useAuth] Parsed URL params — userId:', userId, 'secret present:', !!secret);
      }

      if (!secret || !userId) {
        console.log('[useAuth] processOAuthUrl: URL has no userId+secret — not an OAuth callback. Skipping.');
        return;
      }

      try {
        if (__DEV__) {
          console.log('Step 1 - Creating session with userId:', userId);
        }
        setLoading(true);
        setStoreLoading(true);
        await account.createSession(userId, secret);
        console.log('Step 1 - createSession() succeeded');

        console.log('Step 2 - Getting auth user (account.get())...');
        const authUser = await getAuthUser();
        if (__DEV__) {
          console.log('Step 2 - Session/Account result:', JSON.stringify(authUser));
        }
        if (!authUser) {
          throw new Error('Could not retrieve authenticated user after login.');
        }

        if (__DEV__) {
          console.log('Step 3 - Fetching user document for ID:', authUser.$id);
        }
        // Delegate user doc creation to lib/auth.ts (single source of truth)
        const userDoc = await getOrCreateUserDoc(authUser);
        if (__DEV__) {
          console.log('Step 4 - User doc result:', JSON.stringify(userDoc));
        }
        setUser(userDoc);
        // setUser already sets hasBusiness in the store based on userDoc.has_business
        // Always go to home after login — no registration gate
        console.log('Step 5 - Navigating to: /(tabs)/home');
        router.replace('/(tabs)/home');
      } catch (err: any) {
        if (__DEV__) {
          console.log('=== CAUGHT ERROR (finalizeLogin) ===', JSON.stringify(err), 'message:', err?.message);
        }
        setError(err?.message || 'Login finalizing failed');
      } finally {
        setLoading(false);
        setStoreLoading(false);
      }
    },
    [setUser, setStoreLoading, setError]
  );

  // COLD-START / Android-killed relaunch: if the app was reopened by the deep link,
  // getInitialURL() returns the URL that launched it. Process it once on mount.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (__DEV__) {
        console.log('[useAuth] getInitialURL result:', url);
      }
      processOAuthUrl(url);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FOREGROUND: listen for ALL incoming URLs regardless of scheme.
  // This catches 'appwrite-callback-<projectId>://...' which useURL() misses
  // because Expo's useURL() is scoped to the first scheme in app.json.
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (__DEV__) {
        console.log('[useAuth] Linking.addEventListener fired — url:', url);
      }
      processOAuthUrl(url);
    });

    return () => {
      subscription.remove(); // cleanup on unmount — prevents memory leaks
    };
  }, [processOAuthUrl]);

  const loginWithGoogle = async () => {
    console.log('[loginWithGoogle] Login button pressed. loading:', loading);
    if (loading) return; // prevent double tap
    setLoading(true);
    setStoreLoading(true);
    setError(null);
    try {
      // Clear any existing session first
      try {
        console.log('[loginWithGoogle] Attempting to delete existing session...');
        await account.deleteSession('current');
        console.log('[loginWithGoogle] Existing session deleted.');
      } catch (_) {
        // No existing session, that's fine
        console.log('[loginWithGoogle] No existing session to delete (expected for new users).');
      }

      const redirectUri = 'appwrite-callback-69d35dc3003206488082://com.anykhata.app';
      console.log('[loginWithGoogle] redirectUri:', redirectUri);
      // createOAuth2Token returns a URL — we must open it ourselves
      const oauthUrl = await account.createOAuth2Token(
        OAuthProvider.Google,
        redirectUri,
        redirectUri
      );
      if (__DEV__) {
        console.log('[loginWithGoogle] oauthUrl received:', oauthUrl?.toString());
      }

      if (!oauthUrl) {
        throw new Error('Failed to create OAuth token URL');
      }
      console.log('[loginWithGoogle] Opening via Linking.openURL...');
      await Linking.openURL(oauthUrl.toString());

    } catch (e: any) {
      if (__DEV__) {
        console.log('=== CAUGHT ERROR (loginWithGoogle) ===', JSON.stringify(e), 'message:', e?.message);
      }
      setError(e?.message || 'OAuth error');
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
