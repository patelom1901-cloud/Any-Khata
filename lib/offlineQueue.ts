import * as SQLite from 'expo-sqlite';

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export interface PendingEntry {
  id: string; // uuid
  customer_id: string;
  business_id: string;
  user_id: string; // owner_id
  amount: number;
  type: 'gave' | 'got';
  note: string;
  date: string; // YYYY-MM-DD
  created_at: string; // ISO string for sorting
  sync_status: SyncStatus;
  retry_count: number;
  error_message: string | null;
}

let db: SQLite.SQLiteDatabase | null = null;

export const initOfflineDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync('anykhata_offline.db');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_entries (
        id TEXT PRIMARY KEY NOT NULL,
        customer_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        note TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT
      );
    `);
    console.log('Offline DB initialized');
  } catch (error) {
    console.error('Failed to initialize offline DB:', error);
  }
};

export const addPendingEntry = async (entry: Omit<PendingEntry, 'sync_status' | 'retry_count' | 'error_message'>) => {
  console.log('[SQLITE] addPendingEntry called, db is:', db === null ? 'NULL' : 'OK');
  if (!db) await initOfflineDB();
  if (!db) throw new Error('DB not initialized');

  try {
    await db.runAsync(
      `INSERT INTO pending_entries (id, customer_id, business_id, user_id, amount, type, note, date, created_at, sync_status, retry_count, error_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.customer_id,
        entry.business_id,
        entry.user_id,
        entry.amount,
        entry.type,
        entry.note,
        entry.date,
        entry.created_at,
        'pending',
        0,
        null
      ]
    );
  } catch (error) {
    console.error('Failed to add pending entry:', error);
    throw error;
  }
};

export const getPendingEntries = async (): Promise<PendingEntry[]> => {
  if (!db) await initOfflineDB();
  if (!db) return [];

  try {
    const result = await db.getAllAsync<PendingEntry>(
      `SELECT * FROM pending_entries WHERE sync_status IN ('pending', 'failed') AND retry_count < 3 ORDER BY created_at ASC`
    );
    return result;
  } catch (error) {
    console.error('Failed to get pending entries:', error);
    return [];
  }
};

export const getFailedEntries = async (): Promise<PendingEntry[]> => {
  if (!db) await initOfflineDB();
  if (!db) return [];

  try {
    const result = await db.getAllAsync<PendingEntry>(
      `SELECT * FROM pending_entries WHERE retry_count >= 3 ORDER BY created_at DESC`
    );
    return result;
  } catch (error) {
    console.error('Failed to get failed entries:', error);
    return [];
  }
};

export const markEntrySyncing = async (id: string) => {
  if (!db) return;
  try {
    await db.runAsync(
      `UPDATE pending_entries SET sync_status = 'syncing' WHERE id = ?`,
      [id]
    );
  } catch (error) {
    console.error('Failed to mark entry syncing:', error);
  }
};

export const markEntrySynced = async (id: string) => {
  if (!db) return;
  try {
    // Hard delete local-only pending entry since it's now in Appwrite
    await db.runAsync(
      `DELETE FROM pending_entries WHERE id = ?`,
      [id]
    );
  } catch (error) {
    console.error('Failed to delete synced entry:', error);
  }
};

export const markEntryFailed = async (id: string, errorMessage: string) => {
  if (!db) return;
  try {
    await db.runAsync(
      `UPDATE pending_entries SET sync_status = 'failed', retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
      [errorMessage, id]
    );
  } catch (error) {
    console.error('Failed to mark entry failed:', error);
  }
};

export const resetEntryForRetry = async (id: string) => {
  if (!db) return;
  try {
    await db.runAsync(
      `UPDATE pending_entries SET sync_status = 'pending', retry_count = 0, error_message = NULL WHERE id = ?`,
      [id]
    );
  } catch (error) {
    console.error('Failed to reset entry for retry:', error);
  }
};

export const discardFailedEntry = async (id: string) => {
  if (!db) return;
  try {
    await db.runAsync(
      `DELETE FROM pending_entries WHERE id = ?`,
      [id]
    );
  } catch (error) {
    console.error('Failed to discard entry:', error);
  }
};

export const getPendingCount = async (): Promise<number> => {
  if (!db) await initOfflineDB();
  if (!db) return 0;

  try {
    const result = await db.getFirstAsync<{count: number}>(
      `SELECT COUNT(*) as count FROM pending_entries WHERE retry_count < 3`
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Failed to get pending count:', error);
    return 0;
  }
};
