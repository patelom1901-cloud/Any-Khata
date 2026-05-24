import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getActiveAds } from '../lib/database';
import type { Ad } from '../types';

const ADS_CACHE_KEY = '@ads_cache';

/**
 * Hook for fetching and managing ads with offline support
 */
export const useAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check network status first
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected === true && netState.isInternetReachable === true;
      
      if (!isOnline) {
        // Offline - load from cache
        const cached = await AsyncStorage.getItem(ADS_CACHE_KEY);
        if (cached) {
          setAds(JSON.parse(cached));
        } else {
          setAds([]);
        }
        return;
      }
      
      // Online - fetch from Appwrite
      const activeAds = await getActiveAds();
      setAds(activeAds);
      
      // Cache the results
      await AsyncStorage.setItem(ADS_CACHE_KEY, JSON.stringify(activeAds));
    } catch (err: any) {
      console.log('[useAds] Failed to fetch ads, falling back to cache:', err?.message);
      
      // On error, try to load from cache
      try {
        const cached = await AsyncStorage.getItem(ADS_CACHE_KEY);
        if (cached) {
          setAds(JSON.parse(cached));
        } else {
          setAds([]);
        }
      } catch {
        setAds([]);
      }
      
      setError(err.message || 'Failed to fetch ads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, []);

  return { ads, isLoading, error, fetchAds };
};
