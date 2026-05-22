/**
 * Entry and DayLog calculation utilities
 */
import { DayEntry } from '../types';
import { getCurrentTime } from './dateUtils';

// Generate unique IDs client-side
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/** Create a new DayEntry object (client-side, before saving) */
export const createEntry = (description: string, amount: number, type: 'gave' | 'got', quantity?: number): DayEntry => ({
  id: generateId(),
  description: description.trim(),
  amount: Math.round(amount * 100) / 100,
  type,
  quantity,
  time: getCurrentTime(),
  timestamp: new Date().toISOString(),
});

/** Calculate total from entries array */
export const calcDayTotal = (entries: DayEntry[]): number => {
  const total = entries
    .filter(e => !e.is_deleted && (e.type === 'gave' || e.type === 'debit'))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  return total;
};

/** Parse entries from DB (stored as JSON string) */
export const parseEntries = (raw: string | DayEntry[]): DayEntry[] => {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

/** Serialize entries for DB (to JSON string) */
export const serializeEntries = (entries: DayEntry[]): string => {
  return JSON.stringify(entries);
};
