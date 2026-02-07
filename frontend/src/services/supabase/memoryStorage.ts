type StorageValue = string | null;

type StorageLike = {
  getItem: (key: string) => StorageValue;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const store = new Map<string, string>();

export const memoryStorage: StorageLike = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => {
    store.set(key, value);
  },
  removeItem: (key) => {
    store.delete(key);
  }
};
