import { useState, useCallback, useEffect } from 'react';
import { getActiveAds } from '../lib/database';
import type { Ad } from '../types';

/**
 * Hook for fetching and managing ads
 */
export const useAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeAds = await getActiveAds();
      setAds(activeAds);
    } catch (err: any) {
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
