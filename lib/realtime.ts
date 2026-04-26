/**
 * Appwrite Realtime subscription helpers
 * Always unsubscribe on cleanup to prevent memory leaks.
 */
import { client } from './appwrite';
import { DB_ID, COL_DAY_LOGS, COL_CUSTOMERS } from '../constants/appwrite';
import { parseEntries } from '../utils/entryUtils';
import type { DayLog } from '../types';

/**
 * Subscribe to a single day_log document updates
 */
export const subscribeToDayLog = (
  dayLogId: string,
  onUpdate: (updated: DayLog) => void
) => {
  const channel = `databases.${DB_ID}.collections.${COL_DAY_LOGS}.documents.${dayLogId}`;

  const unsubscribe = client.subscribe(channel, (response: any) => {
    const isUpdate = response.events.some((e: string) => e.includes('.update'));
    if (isUpdate) {
      const raw = response.payload as any;
      onUpdate({
        ...raw,
        entries: parseEntries(raw.entries),
      } as DayLog);
    }
  });

  return unsubscribe;
};

/**
 * Subscribe to customer collection events (for a specific business)
 * Triggers on create/update/delete of any customer in that business
 */
export const subscribeToCustomers = (
  businessId: string,
  onEvent: () => void
) => {
  const channel = `databases.${DB_ID}.collections.${COL_CUSTOMERS}.documents`;

  const unsubscribe = client.subscribe(channel, (response: any) => {
    const payload = response.payload as any;
    if (payload?.businessId === businessId) {
      onEvent();
    }
  });

  return unsubscribe;
};
