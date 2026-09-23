import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

interface ToastState {
  id: number;
  message: string | null;
  kind: ToastKind;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
}

export const useToast = create<ToastState>()((set) => ({
  id: 0,
  message: null,
  kind: 'info',
  show: (message, kind = 'info') => set((state) => ({ id: state.id + 1, message, kind })),
  hide: () => set({ message: null }),
}));

export function showToast(message: string, kind: ToastKind = 'info'): void {
  useToast.getState().show(message, kind);
}
