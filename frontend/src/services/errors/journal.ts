import type { AppError } from './AppError';

type ErrorJournalEntry = { id: string; created_at: string; error: AppError; context?: Record<string, unknown> };

const DB_NAME = 'cir-error-journal';
const STORE_NAME = 'errors';
const DB_VERSION = 1;

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = async <T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => IDBRequest<T> | null): Promise<T | undefined> => {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, mode);
  const store = tx.objectStore(STORE_NAME);
  const request = handler(store);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(request?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
};

export const appendErrorToJournal = async (error: AppError, context?: Record<string, unknown>): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  const entry: ErrorJournalEntry = { id: crypto.randomUUID(), created_at: new Date().toISOString(), error, context };
  await runTransaction('readwrite', store => store.add(entry));
};

export const listErrorJournalEntries = async (): Promise<ErrorJournalEntry[]> => {
  if (typeof indexedDB === 'undefined') return [];
  const result = await runTransaction('readonly', store => store.getAll());
  if (!Array.isArray(result)) return [];
  return result.filter((entry): entry is ErrorJournalEntry => Boolean(entry) && typeof entry === 'object');
};

export const clearErrorJournal = async (): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  await runTransaction('readwrite', store => store.clear());
};

export const exportErrorJournal = async (): Promise<string> => {
  const entries = await listErrorJournalEntries();
  return JSON.stringify(entries, null, 2);
};
