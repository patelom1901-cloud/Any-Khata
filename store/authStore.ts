import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppUser } from '../types';
import type { Locale } from '../constants/i18n/index';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasRole: (role: 'owner' | 'customer') => boolean;
  isSubscribed: boolean;
  setIsSubscribed: (val: boolean) => void;
  hasBusiness: boolean;
  setHasBusiness: (val: boolean) => void;
  selectedLanguage: Locale;
  setSelectedLanguage: (lang: Locale) => void;
  pendingCount: number;
  isSyncing: boolean;
  setPendingCount: (count: number) => void;
  setIsSyncing: (isSyncing: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      hasBusiness: false,
      isSubscribed: false,
      selectedLanguage: 'en',
      pendingCount: 0,
      isSyncing: false,

      setIsSubscribed: (isSubscribed) => set({ isSubscribed }),
      setHasBusiness: (hasBusiness) => set({ hasBusiness }),

      setUser: (user) => set({
        user,
        isLoading: false,
        isAuthenticated: !!user,
        hasBusiness: user?.hasBusiness || false,
      }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () => set({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        hasBusiness: false,
        isSubscribed: false,
      }),

      hasRole: (role) => {
        // roles field no longer exists in schema — derive from hasBusiness
        const hasBiz = get().hasBusiness;
        if (role === 'owner') return hasBiz;
        if (role === 'customer') return !hasBiz;
        return false;
      },

      setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
      setPendingCount: (pendingCount) => set({ pendingCount }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist non-sensitive state
        selectedLanguage: state.selectedLanguage,
        user: state.user ? {
          $id: state.user.$id,
          userId: state.user.userId,
          name: state.user.name,
          email: state.user.email,
          // strictly only userId, name, email, language preference
        } as AppUser : null,
        // isAuthenticated is derived from user, but we can persist it or let it hydrate
        // actually, let's persist what we need
        isAuthenticated: state.isAuthenticated,
        // We do NOT persist hasBusiness, isSubscribed
      }),
    }
  )
);
