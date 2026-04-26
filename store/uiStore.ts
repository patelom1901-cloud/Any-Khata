import { create } from 'zustand';

interface UIState {
  toastMessage: string | null;
  toastVisible: boolean;
  showToast: (message: string) => void;
  hideToast: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toastMessage: null,
  toastVisible: false,
  showToast: (message) => set({ toastMessage: message, toastVisible: true }),
  hideToast: () => set({ toastMessage: null, toastVisible: false }),
  error: null,
  setError: (error) => set({ error }),
}));
