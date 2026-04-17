import { DropzoneFile } from "./types";

export const IDB_DB_NAME = 'kapkin-viewer';
export const IDB_DB_VERSION = 1;
export const IDB_STORE_NAME = 'images';

export const LS_FILES_KEY = 'kapkin.files';
export const LS_BACKGROUND_KEY = 'kapkin.background';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

export const putImageBlob = async (key: string, blob: Blob): Promise<void> => {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IDB_STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    store.put(blob, key);
  });
};

export const getImageBlob = async (key: string): Promise<Blob | null> => {
  const db = await openDatabase();

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
    const store = transaction.objectStore(IDB_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve((request.result as Blob) ?? null);
    request.onerror = () => reject(request.error);
  });
};

export const deleteImageBlob = async (key: string): Promise<void> => {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IDB_STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    store.delete(key);
  });
};

export const saveFilesToLocalStorage = (files: DropzoneFile[]) => {
  localStorage.setItem(LS_FILES_KEY, JSON.stringify(files));
};

export const loadFilesFromLocalStorage = (): DropzoneFile[] => {
  const raw = localStorage.getItem(LS_FILES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as DropzoneFile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveBackgroundToLocalStorage = (backgroundId: string | null) => {
  if (!backgroundId) {
    localStorage.removeItem(LS_BACKGROUND_KEY);
    return;
  }

  localStorage.setItem(LS_BACKGROUND_KEY, JSON.stringify(backgroundId));
};

export const loadBackgroundFromLocalStorage = (): string | null => {
  const raw = localStorage.getItem(LS_BACKGROUND_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    return parsed;
  } catch {
    return null;
  }
};
