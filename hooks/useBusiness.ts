import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { getBusinessByOwner, getCustomersByBusiness } from '../lib/database';
import { useUIStore } from '../store/uiStore';

/**
 * Hook for business data fetching and management
 */
export const useBusiness = () => {
  const user = useAuthStore((state) => state.user);
  const { setBusiness, setCustomers } = useBusinessStore();
  const { setError } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

  const fetchBusiness = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      setError(null);
      const business = await getBusinessByOwner(user.userId);
      setBusiness(business);

      if (business) {
        const customers = await getCustomersByBusiness(business.businessId);
        setCustomers(customers);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch business');
    } finally {
      setIsLoading(false);
    }
  }, [user, setBusiness, setCustomers, setError]);

  const refreshCustomers = useCallback(async () => {
    const business = useBusinessStore.getState().business;
    if (!business) return;

    try {
      const customers = await getCustomersByBusiness(business.businessId);
      setCustomers(customers);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh customers');
    }
  }, [setCustomers, setError]);

  useEffect(() => {
    if (user) {
      fetchBusiness();
    }
  }, [user, fetchBusiness]);

  return { isLoading, fetchBusiness, refreshCustomers };
};
