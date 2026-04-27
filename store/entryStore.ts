import { create } from 'zustand';
import { DayEntry } from '../types';

interface EntryState {
  editingEntry: DayEntry | null;
  dayLogId: string | null;
  setEditingEntry: (entry: DayEntry | null, dayLogId?: string) => void;
  clearEditingEntry: () => void;
}

export const useEntryStore = create<EntryState>((set) => ({
  editingEntry: null,
  dayLogId: null,
  setEditingEntry: (entry, dayLogId) => set({ editingEntry: entry, dayLogId: dayLogId || null }),
  clearEditingEntry: () => set({ editingEntry: null, dayLogId: null }),
}));
