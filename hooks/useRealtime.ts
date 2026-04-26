import { useEffect, useRef } from 'react';
import { subscribeToDayLog, subscribeToCustomers } from '../lib/realtime';
import type { DayLog } from '../types';

/**
 * Generic realtime hook for day_log updates
 * Auto-subscribes and cleans up on unmount
 */
export const useDayLogRealtime = (
  dayLogId: string | null,
  onUpdate: (log: DayLog) => void
) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!dayLogId) return;

    const unsubscribe = subscribeToDayLog(dayLogId, onUpdate);
    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [dayLogId, onUpdate]);
};

/**
 * Generic realtime hook for customer list updates
 * Re-fetches the customer list on any create/update/delete event
 */
export const useCustomerRealtime = (
  businessId: string | null,
  onEvent: () => void
) => {
  useEffect(() => {
    if (!businessId) return;

    const unsubscribe = subscribeToCustomers(businessId, onEvent);
    return () => unsubscribe();
  }, [businessId, onEvent]);
};
