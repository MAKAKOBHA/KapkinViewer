import { DropzoneFile, StoredBackground } from './types';
import { isValidAspect, isViewport, Viewport } from './viewport';

export const IDB_DB_NAME = 'kapkin-viewer';
export const IDB_DB_VERSION = 1;
export const IDB_STORE_NAME = 'images';

export const LS_FILES_KEY = 'files';
export const LS_BACKGROUND_KEY = 'background';
export const LS_VIEWPORT_KEY = 'viewport';

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

/**
 * Версия формата сцены. 1 — координаты в пикселях окна, 2 — в долях ширины
 * мира. Читатель обязан различать их: доли и пиксели с виду одинаковы, но
 * 0.25 вместо 320 поставит токен в угол.
 */
export const FILES_VERSION = 2;

export type StoredFiles = { version: number; files: DropzoneFile[] };

export const saveFilesToLocalStorage = (files: DropzoneFile[], layerId: string) => {
  localStorage.setItem(
    `${LS_FILES_KEY}-${layerId}`,
    JSON.stringify({ version: FILES_VERSION, files }),
  );
};

export const loadFilesFromLocalStorage = (layerId: string): StoredFiles => {
  const empty: StoredFiles = { version: FILES_VERSION, files: [] };
  const raw = localStorage.getItem(`${LS_FILES_KEY}-${layerId}`);
  if (!raw) return empty;

  try {
    const parsed = JSON.parse(raw);
    // Голый массив — это первая версия: сцена, расставленная в пикселях.
    if (Array.isArray(parsed)) return { version: 1, files: parsed as DropzoneFile[] };

    const { version, files } = parsed as Partial<StoredFiles>;
    if (typeof version !== 'number' || !Array.isArray(files)) return empty;

    return { version, files };
  } catch {
    return empty;
  }
};

export const saveBackgroundToLocalStorage = (
  background: StoredBackground | null,
  layerId: string,
) => {
  if (!background) {
    localStorage.removeItem(`${LS_BACKGROUND_KEY}-${layerId}`);
    return;
  }

  localStorage.setItem(`${LS_BACKGROUND_KEY}-${layerId}`, JSON.stringify(background));
};

export const loadBackgroundFromLocalStorage = (layerId: string): StoredBackground | null => {
  const raw = localStorage.getItem(`${LS_BACKGROUND_KEY}-${layerId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    // Раньше хранился один id: пропорции карты тогда не спрашивали, их измерят
    // по самой картинке.
    if (typeof parsed === 'string') return { id: parsed, aspect: null };

    const { id, aspect } = parsed as Partial<StoredBackground>;
    if (typeof id !== 'string') return null;

    return { id, aspect: isValidAspect(aspect) ? aspect : null };
  } catch {
    return null;
  }
};

export const saveViewportToLocalStorage = (viewport: Viewport, layerId: string) => {
  localStorage.setItem(`${LS_VIEWPORT_KEY}-${layerId}`, JSON.stringify(viewport));
};

export const loadViewportFromLocalStorage = (layerId: string): Viewport | null => {
  const raw = localStorage.getItem(`${LS_VIEWPORT_KEY}-${layerId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isViewport(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const getCanvasBlobKey = (layerId: string) => `${layerId}-canvas`;

/**
 * Удаляет всё, что принадлежит локации: метаданные из localStorage и блобы
 * картинок с рисунком из IndexedDB. Любой новый вид данных, привязанный к
 * локации, обязан попасть сюда — иначе он останется в хранилище навсегда.
 */
export const deleteLayerDataFromStorage = async (layerId: string): Promise<void> => {
  const { files: savedFiles } = loadFilesFromLocalStorage(layerId);
  const savedBackground = loadBackgroundFromLocalStorage(layerId);

  localStorage.removeItem(`${LS_FILES_KEY}-${layerId}`);
  localStorage.removeItem(`${LS_BACKGROUND_KEY}-${layerId}`);
  localStorage.removeItem(`${LS_VIEWPORT_KEY}-${layerId}`);

  await Promise.all([
    ...savedFiles.map(({ id }) => deleteImageBlob(id)),
    ...(savedBackground ? [deleteImageBlob(savedBackground.id)] : []),
    deleteImageBlob(getCanvasBlobKey(layerId)),
  ]);
};
