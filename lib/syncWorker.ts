import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { databases } from './appwrite';
import { DB_ID, COL_DAY_LOGS, COL_CUSTOMERS } from '../constants/appwrite';
import { ID, Query, Permission, Role } from 'react-native-appwrite';
import { 
  getPendingEntries, 
  markEntrySyncing, 
  markEntrySynced, 
  markEntryFailed, 
  getPendingCount 
} from './offlineQueue';
import { useAuthStore } from '../store/authStore';

let isSyncRunning = false;
let unsubscribeNetInfo: (() => void) | null = null;
let unsubscribeAppState: (() => void) | null = null;

export const runSync = async () => {
  if (isSyncRunning) return;
  
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  const pendingEntries = await getPendingEntries();
  if (pendingEntries.length === 0) {
    const count = await getPendingCount();
    useAuthStore.getState().setPendingCount(count);
    return;
  }

  isSyncRunning = true;
  useAuthStore.getState().setIsSyncing(true);

  try {
    for (const entry of pendingEntries) {
      await markEntrySyncing(entry.id);
      
      try {
        const d = new Date(entry.created_at);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        
        const newEntryObj = {
          id: entry.id, // Use pending id as entry id to avoid duplicates on retry
          description: entry.note || 'Entry',
          amount: entry.amount,
          type: entry.type,
          time: timeStr,
          note: entry.note || '',
          timestamp: entry.created_at,
        };

        let didApplyToDayLog = false;

        const existing = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
          Query.equal('customer_id', entry.customer_id),
          Query.equal('date', entry.date),
          Query.equal('is_deleted', false),
          Query.limit(1),
        ]);

        if (existing.documents.length > 0) {
          const doc = existing.documents[0] as any;
          if (doc.is_locked === true) {
            throw new Error("Cannot modify a locked day log.");
          }
          const existingEntries: any[] = JSON.parse(doc.entries || '[]');
          
          // Check if entry already exists (in case of network timeout where it actually succeeded)
          const alreadyExists = existingEntries.some(e => e.id === entry.id);
          
          if (!alreadyExists) {
            const updatedEntries = [...existingEntries, newEntryObj];
            
            let newTotal = updatedEntries
              .filter((e: any) => e.type === 'gave' && !e.is_deleted)
              .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
            newTotal = Math.round(newTotal * 100) / 100;
            if (isNaN(newTotal)) newTotal = 0;
            
            await databases.updateDocument(DB_ID, COL_DAY_LOGS, doc.$id, {
              entries: JSON.stringify(updatedEntries),
              day_total: newTotal,
            });
            didApplyToDayLog = true;
          }
        } else {
          let newTotal = 0;
          if (entry.type === 'gave') {
              newTotal = Number(entry.amount) || 0;
          }
          await databases.createDocument(
            DB_ID,
            COL_DAY_LOGS,
            ID.unique(),
            {
              customer_id: entry.customer_id,
              business_id: entry.business_id,
              owner_id: entry.user_id,
              amount: Number(entry.amount) || 0,
              type: entry.type,
              date: entry.date,
              note: entry.note || '',
              is_deleted: false,
              entries: JSON.stringify([newEntryObj]),
              day_total: newTotal,
              is_locked: false,
            },
            [
              Permission.read(Role.user(entry.user_id)),
              Permission.write(Role.user(entry.user_id)),
              Permission.update(Role.user(entry.user_id)),
              Permission.delete(Role.user(entry.user_id))
            ]
          );
          didApplyToDayLog = true;
        }

        // We should also check if the customer balance was already updated.
        // But atomic operations in Appwrite without transactions are tricky.
        // The day_log entries is the source of truth anyway, balance can be recalculated if out of sync.
        if (didApplyToDayLog) {
          const customerDoc = await databases.getDocument(DB_ID, COL_CUSTOMERS, entry.customer_id);
          const currentBalance = (customerDoc as any).balance || 0;
          const amountToApply = Number(entry.amount) || 0;
          const newBalance = entry.type === 'gave' 
            ? currentBalance + amountToApply
            : currentBalance - amountToApply;

          await databases.updateDocument(DB_ID, COL_CUSTOMERS, entry.customer_id, {
            balance: newBalance
          });
        }

        await markEntrySynced(entry.id);
      } catch (err: any) {
        console.error('Error syncing entry', entry.id, err);
        await markEntryFailed(entry.id, err?.message || 'Sync failed');
      }
    }
  } finally {
    isSyncRunning = false;
    useAuthStore.getState().setIsSyncing(false);
    const count = await getPendingCount();
    useAuthStore.getState().setPendingCount(count);
  }
};

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const startSyncListener = (onSyncComplete?: (result: any) => void) => {
  if (!unsubscribeNetInfo) {
    unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
      if (state.isConnected === true && state.isInternetReachable === true) {
        // Debounce — don't fire sync on every micro connectivity event
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(async () => {
          try {
            const result = await runSync();
            onSyncComplete?.(result);
          } catch (e: any) {
            console.log('[SYNC] runSync failed silently:', e?.message);
          }
        }, 3000);
      }
    });
  }

  if (!unsubscribeAppState) {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        try {
          const result = await runSync();
          onSyncComplete?.(result);
        } catch (e: any) {
          console.log('[SYNC] runSync failed silently:', e?.message);
        }
      }
    });
    unsubscribeAppState = () => subscription.remove();
  }

  return () => {
    if (unsubscribeNetInfo) {
      unsubscribeNetInfo();
      unsubscribeNetInfo = null;
    }
    if (unsubscribeAppState) {
      unsubscribeAppState();
      unsubscribeAppState = null;
    }
  };
};
