import { Drawing, DRAWING_VERSION, isStroke } from 'components/Canvas/lib/render-drawing';
import { FILES_VERSION, StoredFiles } from './storage';
import { DropzoneFile, StoredBackground } from './types';
import { isValidAspect, isViewport, Viewport } from './viewport';

/**
 * Файл сохранённой игры: манифест с метаданными локаций и подряд лежащие за ним
 * картинки.
 *
 *     [6]  "KVSAVE"    магия
 *     [2]  uint16 LE   версия контейнера
 *     [4]  uint32 LE   длина манифеста в байтах
 *     [N]  манифест    JSON в UTF-8
 *     [..] блобы       в порядке таблицы `blobs` манифеста
 *
 * Картинки лежат бинарём, а не в base64: игра мастера — это сотни мегабайт карт,
 * и ни при записи, ни при чтении они не должны попадать в память целиком. `Blob`
 * — ссылка на данные, поэтому и сборка файла, и нарезка его обратно бесплатны:
 * байты копирует браузер, минуя JS.
 */
export const SAVE_MAGIC = 'KVSAVE';
export const SAVE_VERSION = 1;
export const SAVE_FORMAT = 'kapkin-viewer-save';
export const SAVE_EXTENSION = 'kvgame';

const MAGIC_SIZE = 6;
const VERSION_OFFSET = 6;
const LENGTH_OFFSET = 8;
export const HEADER_SIZE = 12;

/** Где лежит содержимое картинки внутри файла. */
export type SavedBlob = { id: string; type: string; offset: number; length: number };

/** Локация целиком: всё, что о ней знает хранилище, кроме самих картинок. */
export type SavedLayer = {
  id: string;
  name: string;
  files: StoredFiles;
  background: StoredBackground | null;
  viewport: Viewport | null;
  drawing: Drawing | null;
};

export type SaveManifest = {
  format: string;
  savedAt: string;
  layers: SavedLayer[];
  blobs: SavedBlob[];
};

export type UnpackedGame = {
  manifest: SaveManifest;
  /** Кусок файла с картинкой. Байты не читаются до записи в хранилище. */
  getBlob(id: string): Blob | null;
};

/** Ошибка, текст которой не стыдно показать мастеру. */
export class SaveFileError extends Error {}

const BROKEN = 'Файл сохранения повреждён';
const NOT_A_SAVE = 'Это не файл сохранённой игры';

const toStoredFiles = (value: unknown): StoredFiles => {
  const empty: StoredFiles = { version: FILES_VERSION, files: [] };
  if (typeof value !== 'object' || value === null) return empty;

  const { version, files } = value as Partial<StoredFiles>;
  if (typeof version !== 'number' || !Array.isArray(files)) return empty;

  return { version, files: files.filter((file) => typeof file?.id === 'string') };
};

const toStoredBackground = (value: unknown): StoredBackground | null => {
  if (!value) return null;
  // Тот же формат, что в localStorage: у старых сцен фон — один голый id.
  if (typeof value === 'string') return { id: value, aspect: null };
  if (typeof value !== 'object') return null;

  const { id, aspect } = value as Partial<StoredBackground>;
  if (typeof id !== 'string') return null;

  return { id, aspect: isValidAspect(aspect) ? aspect : null };
};

const toDrawing = (value: unknown): Drawing | null => {
  if (typeof value !== 'object' || value === null) return null;

  const { strokes } = value as Partial<Drawing>;
  if (!Array.isArray(strokes)) return null;

  // Битый штрих роняет отрисовку — такие выбрасываем, как и при чтении из IndexedDB.
  return { version: DRAWING_VERSION, strokes: strokes.filter(isStroke) };
};

const toSavedLayer = (value: unknown): SavedLayer | null => {
  if (typeof value !== 'object' || value === null) return null;

  const { id, name, files, background, viewport, drawing } = value as Record<string, unknown>;
  if (typeof id !== 'string' || !id) return null;

  return {
    id,
    name: typeof name === 'string' && name.trim() ? name : 'No name',
    files: toStoredFiles(files),
    background: toStoredBackground(background),
    viewport: isViewport(viewport) ? viewport : null,
    drawing: toDrawing(drawing),
  };
};

const toSavedBlob = (value: unknown, dataSize: number): SavedBlob | null => {
  if (typeof value !== 'object' || value === null) return null;

  const { id, type, offset, length } = value as Partial<SavedBlob>;
  if (typeof id !== 'string' || !id) return null;
  if (!Number.isInteger(offset) || !Number.isInteger(length)) return null;

  const start = offset as number;
  const size = length as number;
  if (start < 0 || size < 0 || start + size > dataSize) return null;

  return { id, type: typeof type === 'string' ? type : '', offset: start, length: size };
};

/**
 * Собирает файл игры. Блобы не читаются: `Blob` из нескольких частей хранит
 * ссылки на них, и триста мегабайт карт стоят столько же, сколько три.
 */
export const packGame = (
  layers: SavedLayer[],
  contents: { id: string; blob: Blob }[],
  savedAt: string = new Date().toISOString(),
): Blob => {
  const blobs: SavedBlob[] = [];
  const parts: BlobPart[] = [];
  let offset = 0;

  contents.forEach(({ id, blob }) => {
    blobs.push({ id, type: blob.type, offset, length: blob.size });
    parts.push(blob);
    offset += blob.size;
  });

  const manifest: SaveManifest = { format: SAVE_FORMAT, savedAt, layers, blobs };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));

  const header = new Uint8Array(HEADER_SIZE);
  header.set(new TextEncoder().encode(SAVE_MAGIC));
  const view = new DataView(header.buffer);
  view.setUint16(VERSION_OFFSET, SAVE_VERSION, true);
  view.setUint32(LENGTH_OFFSET, manifestBytes.byteLength, true);

  return new Blob([header, manifestBytes, ...parts], { type: 'application/octet-stream' });
};

/**
 * Разбирает файл игры. Читает только заголовок и манифест: картинки остаются
 * ссылками на куски файла, пока их не попросят.
 */
export const unpackGame = async (file: Blob): Promise<UnpackedGame> => {
  if (file.size < HEADER_SIZE) throw new SaveFileError(NOT_A_SAVE);

  const header = new DataView(await file.slice(0, HEADER_SIZE).arrayBuffer());
  const magic = String.fromCharCode(...new Uint8Array(header.buffer, 0, MAGIC_SIZE));
  if (magic !== SAVE_MAGIC) throw new SaveFileError(NOT_A_SAVE);

  if (header.getUint16(VERSION_OFFSET, true) > SAVE_VERSION) {
    throw new SaveFileError('Сохранение сделано более новой версией приложения');
  }

  const manifestLength = header.getUint32(LENGTH_OFFSET, true);
  const dataStart = HEADER_SIZE + manifestLength;
  if (!manifestLength || dataStart > file.size) throw new SaveFileError(BROKEN);

  let raw: unknown;
  try {
    raw = JSON.parse(await file.slice(HEADER_SIZE, dataStart).text());
  } catch {
    throw new SaveFileError(BROKEN);
  }

  if (typeof raw !== 'object' || raw === null) throw new SaveFileError(BROKEN);

  const { format, savedAt, layers, blobs } = raw as Record<string, unknown>;
  if (format !== SAVE_FORMAT) throw new SaveFileError(NOT_A_SAVE);

  const savedLayers = (Array.isArray(layers) ? layers : [])
    .map(toSavedLayer)
    .filter((layer): layer is SavedLayer => layer !== null);

  // Локация без картинок — ещё локация, а вот файл без локаций грузить некуда.
  if (!savedLayers.length) throw new SaveFileError('В файле нет ни одной локации');

  const dataSize = file.size - dataStart;
  const table = new Map<string, SavedBlob>();
  (Array.isArray(blobs) ? blobs : []).forEach((value) => {
    const entry = toSavedBlob(value, dataSize);
    if (entry) table.set(entry.id, entry);
  });

  const manifest: SaveManifest = {
    format: SAVE_FORMAT,
    savedAt: typeof savedAt === 'string' ? savedAt : '',
    layers: savedLayers,
    blobs: [...table.values()],
  };

  return {
    manifest,
    getBlob: (id) => {
      const entry = table.get(id);
      if (!entry) return null;

      const start = dataStart + entry.offset;
      // Третий аргумент возвращает MIME-тип: без него картинка потеряет image/png.
      return file.slice(start, start + entry.length, entry.type);
    },
  };
};

/** Превью — просроченный blob:-URL, в файле ему делать нечего. */
export const stripPreviews = (files: DropzoneFile[]): DropzoneFile[] =>
  files.map((file) => ({ ...file, preview: '' }));
