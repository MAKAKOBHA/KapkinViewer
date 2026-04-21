import { DropzoneFile } from './types';

export const IDB_DB_NAME = 'kapkin-viewer';
export const IDB_DB_VERSION = 1;
export const IDB_STORE_NAME = 'images';

export const LS_FILES_KEY = 'files';
export const LS_BACKGROUND_KEY = 'background';

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

export const saveFilesToLocalStorage = (files: DropzoneFile[], layerId: string) => {
  localStorage.setItem(`${LS_FILES_KEY}-${layerId}`, JSON.stringify(files));
};

export const loadFilesFromLocalStorage = (layerId: string): DropzoneFile[] => {
  const raw = localStorage.getItem(`${LS_FILES_KEY}-${layerId}`);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as DropzoneFile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveBackgroundToLocalStorage = (backgroundId: string | null, layerId: string) => {
  if (!backgroundId) {
    localStorage.removeItem(`${LS_BACKGROUND_KEY}-${layerId}`);
    return;
  }

  localStorage.setItem(`${LS_BACKGROUND_KEY}-${layerId}`, JSON.stringify(backgroundId));
};

export const loadBackgroundFromLocalStorage = (layerId: string): string | null => {
  const raw = localStorage.getItem(`${LS_BACKGROUND_KEY}-${layerId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const deleteLayerDataFromStorage = (layerId: string) => {
  const savedFiles = loadFilesFromLocalStorage(layerId);
  const savedBackground = loadBackgroundFromLocalStorage(layerId);

  savedFiles.forEach(({ id }) => deleteImageBlob(id));
  if (savedBackground) {
    deleteImageBlob(savedBackground);
  }

  localStorage.removeItem(`${LS_FILES_KEY}-${layerId}`);
  localStorage.removeItem(`${LS_BACKGROUND_KEY}-${layerId}`);
  deleteImageBlob(`${layerId}-canvas`);
};
