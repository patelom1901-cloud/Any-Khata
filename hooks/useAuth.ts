import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { logout as authLogout, getOrCreateUserDoc, getAuthUser } from '../lib/auth';
import { useUIStore } from '../store/uiStore';
import { account } from '../lib/appwrite';
import { OAuthProvider } from 'react-native-appwrite';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/**
 * Hook for auth operations
 * Wraps the store and lib functions, and handles post-login navigation.
 */
export const useAuth = () => {
  const { setUser, setLoading: setStoreLoading, logout: storeLogout } = useAuthStore();
  const { setError } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const handledUrl = useRef<string | null>(null);
  const url = useURL();

  // Handle the deep link callback AFTER browser closes
  useEffect(() => {
    if (!url) return;
    if (handledUrl.current === url) return; // prevent double-fire
    handledUrl.current = url;

    const parsed = Linking.parse(url);
    const secret = parsed.queryParams?.secret as string;
    const userId = parsed.queryParams?.userId as string;

    if (secret && userId) {
      const finalizeLogin = async () => {
        try {
          setLoading(true);
          setStoreLoading(true);
          await account.createSession(userId, secret);
          const authUser = await getAuthUser();
          if (!authUser) {
            throw new Error('Could not retrieve authenticated user after login.');
          }

          // Delegate user doc creation to lib/auth.ts (single source of truth)
          const userDoc = await getOrCreateUserDoc(authUser);
          setUser(userDoc);
          // setUser already sets hasBusiness in the store based on userDoc.has_business
          // Always go to home after login — no registration gate
          router.replace('/(tabs)/home');
        } catch (err: any) {
          setError(err?.message || 'Login finalizing failed');
        } finally {
          setLoading(false);
          setStoreLoading(false);
        }
      };

      finalizeLogin();
    }
  }, [url, setUser, setStoreLoading, setError]);

  const loginWithGoogle = async () => {
    if (loading) return; // prevent double tap
    setLoading(true);
    setStoreLoading(true);
    setError(null);
    try {
      // Clear any existing session first
      try {
        await account.deleteSession('current');
      } catch (_) {
        // No existing session, that's fine
      }

      const redirectUri = makeRedirectUri({});
      // createOAuth2Token returns a URL — we must open it ourselves
      const oauthUrl = await account.createOAuth2Token(
        OAuthProvider.Google,
        redirectUri,
        redirectUri
      );

      if (!oauthUrl) {
        throw new Error('Failed to create OAuth token URL');
      }
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl.toString(),
        redirectUri
      );
      if (result.type !== 'success') {
        setLoading(false);
        setStoreLoading(false);
      }
      // If success → useEffect above handles session creation via useURL()

    } catch (e: any) {
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
