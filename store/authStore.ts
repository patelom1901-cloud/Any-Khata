import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppUser } from '../types';
import type { Locale } from '../constants/i18n';

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
        selectedLanguage: 'en',
      }),

      hasRole: (role) => {
        // roles field no longer exists in schema — derive from hasBusiness
        const hasBiz = get().hasBusiness;
        if (role === 'owner') return hasBiz;
        if (role === 'customer') return !hasBiz;
        return false;
      },

      setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
