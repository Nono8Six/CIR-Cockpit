import { create } from 'zustand';

import type { AppError } from '@/services/errors/AppError';

type ErrorState = {
  errors: AppError[];
  lastError: AppError | null;
  addError: (error: AppError) => void;
  removeError: (fingerprintOrCode: string) => void;
  clearErrors: () => void;
};

const matchKey = (error: AppError, key: string): boolean => {
  return (error.fingerprint ?? error.code) === key;
};

export const useErrorStore = create<ErrorState>((set) => ({
  errors: [],
  lastError: null,
  addError: (error) =>
    set((state) => {
      const key = error.fingerprint ?? error.code;
      const filtered = state.errors.filter((entry) => !matchKey(entry, key));
      return {
        errors: [...filtered, error],
        lastError: error
      };
    }),
  removeError: (fingerprintOrCode) =>
    set((state) => {
      const filtered = state.errors.filter((entry) => !matchKey(entry, fingerprintOrCode));
      const nextLast = state.lastError && matchKey(state.lastError, fingerprintOrCode)
        ? filtered[filtered.length - 1] ?? null
        : state.lastError;
      return {
        errors: filtered,
        lastError: nextLast
      };
    }),
  clearErrors: () =>
    set({
      errors: [],
      lastError: null
    })
}));

export const useErrors = () => useErrorStore((state) => state.errors);
export const useLastError = () => useErrorStore((state) => state.lastError);
export const useHasErrors = () => useErrorStore((state) => state.errors.length > 0);
export const useErrorByKey = (key: string) =>
  useErrorStore((state) => state.errors.find((entry) => matchKey(entry, key)) ?? null);
