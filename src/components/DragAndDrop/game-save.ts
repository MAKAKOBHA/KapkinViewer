import { v4 as uuidv4 } from 'uuid';
import {
  deleteLayerDataFromStorage,
  getCanvasBlobKey,
  getImageBlob,
  loadBackgroundFromLocalStorage,
  loadDrawing,
  loadFilesFromLocalStorage,
  loadViewportFromLocalStorage,
  putImageBlob,
  saveBackgroundToLocalStorage,
  saveDrawing,
  saveStoredFilesToLocalStorage,
  saveViewportToLocalStorage,
} from './storage';
import {
  packGame,
  SAVE_EXTENSION,
  SavedLayer,
  stripPreviews,
  UnpackedGame,
  unpackGame,
} from './game-file';
import { DropzoneFile } from './types';

/** Локация с точки зрения сохранения: только id и имя, остальное в хранилище. */
export type GameLayer = { id: string; name: string };

/**
 * `replace` — загрузить игру начисто: текущие локации удаляются вместе с их
 * картинками. `append` — подмешать локации из файла к уже имеющимся.
 */
export type ImportMode = 'replace' | 'append';

type CollectedLayer = { saved: SavedLayer; contents: { id: string; blob: Blob }[] };

/** Время, за которое браузер успевает забрать файл из blob:-URL в загрузки. */
const REVOKE_DELAY_MS = 10_000;

const collectLayer = async (layer: GameLayer): Promise<CollectedLayer> => {
  const stored = loadFilesFromLocalStorage(layer.id);
  const background = loadBackgroundFromLocalStorage(layer.id);
  const viewport = loadViewportFromLocalStorage(layer.id);
  const drawing = await loadDrawing(layer.id);

  const imageIds = [
    ...stored.files.map((file) => file.id),
    ...(background ? [background.id] : []),
    // Снимок холста из старых версий: он всё ещё лежит под штрихами.
    getCanvasBlobKey(layer.id),
  ];

  const blobs = await Promise.all(
    imageIds.map(async (id) => ({ id, blob: await getImageBlob(id) })),
  );

  return {
    saved: {
      id: layer.id,
      name: layer.name,
      // Версию сцены не трогаем: сцена первой версии уедет первой версией, а
      // перевод в доли сделает гидрация, как и для сцен в хранилище.
      files: { version: stored.version, files: stripPreviews(stored.files) },
      background,
      viewport,
      drawing,
    },
    // Картинку могли потерять при чистке хранилища — сцена это переживает, файл тоже.
    contents: blobs.filter((item): item is { id: string; blob: Blob } => item.blob !== null),
  };
};

/**
 * Собирает указанные локации в файл игры. Одна локация или все — разницы в
 * формате нет, отличается только список.
 */
export const collectGame = async (layers: GameLayer[]): Promise<Blob> => {
  const collected = await Promise.all(layers.map(collectLayer));

  const packed = new Set<string>();
  const contents: { id: string; blob: Blob }[] = [];

  collected.forEach((layer) =>
    layer.contents.forEach((item) => {
      // У дубликата токена свой id и своя копия блоба, но если id всё же
      // повторился, второй раз те же байты в файл не поедут.
      if (packed.has(item.id)) return;

      packed.add(item.id);
      contents.push(item);
    }),
  );

  return packGame(
    collected.map((layer) => layer.saved),
    contents,
  );
};

/**
 * Раскладывает одну локацию из файла в хранилище под свежими id.
 *
 * Перенумерация обязательна: id из файла могут совпасть с теми, что уже лежат
 * в хранилище (а при импорте файла в ту же игру совпадут наверняка), и тогда
 * импорт затрёт чужие картинки.
 */
const importLayer = async (saved: SavedLayer, save: UnpackedGame): Promise<GameLayer> => {
  const layerId = uuidv4();

  // Параллельно: `getBlob` отдаёт кусок файла ссылкой, а байты копирует
  // IndexedDB у себя, минуя JS.
  const files = await Promise.all(
    saved.files.files.map(async (file) => {
      const blob = save.getBlob(file.id);
      // Токен без картинки показать нечем — пропускаем, как и при гидрации.
      if (!blob) return null;

      const id = `${file.name}-${uuidv4()}`;
      await putImageBlob(id, blob);

      return { ...file, id, preview: '' } as DropzoneFile;
    }),
  );

  saveStoredFilesToLocalStorage(
    { version: saved.files.version, files: files.filter(Boolean) as DropzoneFile[] },
    layerId,
  );

  const backgroundBlob = saved.background ? save.getBlob(saved.background.id) : null;
  if (saved.background && backgroundBlob) {
    const id = `background-${uuidv4()}`;
    await putImageBlob(id, backgroundBlob);
    saveBackgroundToLocalStorage({ id, aspect: saved.background.aspect }, layerId);
  }

  if (saved.viewport) saveViewportToLocalStorage(saved.viewport, layerId);
  if (saved.drawing) await saveDrawing(saved.drawing, layerId);

  const legacyCanvas = save.getBlob(getCanvasBlobKey(saved.id));
  if (legacyCanvas) await putImageBlob(getCanvasBlobKey(layerId), legacyCanvas);

  return { id: layerId, name: saved.name };
};

/**
 * Загружает игру из файла и возвращает новый список локаций с активной.
 *
 * Список локаций пишет не эта функция: она отдаёт его вызывающему, а тот
 * записывает и перезагружает страницу. Писать в хранилище на живой сцене
 * нельзя — в состоянии ещё лежит прошлая локация, и её автосохранение затрёт
 * только что импортированные данные.
 */
export const importGame = async (
  file: Blob,
  mode: ImportMode,
  existing: GameLayer[],
): Promise<{ layers: GameLayer[]; activeId: string }> => {
  const save = await unpackGame(file);

  // Чистый импорт убирает старые локации вместе с картинками: иначе блобы
  // останутся в IndexedDB навсегда, а ссылаться на них будет уже нечему.
  if (mode === 'replace') {
    await Promise.all(existing.map((layer) => deleteLayerDataFromStorage(layer.id)));
  }

  const imported = await Promise.all(save.manifest.layers.map((layer) => importLayer(layer, save)));
  const layers = mode === 'replace' ? imported : [...existing, ...imported];

  // Мастер попадает в только что загруженную игру, а не остаётся в прошлой.
  return { layers, activeId: imported[0].id };
};

/** Имя единственной локации нового мира — такое же, как у самой первой. */
const NEW_GAME_LAYER_NAME = 'Default';

/**
 * Новый мир: удаляет данные всех локаций и возвращает одну пустую взамен.
 *
 * Список локаций, как и при импорте, пишет не эта функция, а вызывающий — и по
 * той же причине: на живой сцене автосохранение затрёт свежую запись.
 */
export const resetGame = async (
  existing: GameLayer[],
): Promise<{ layers: GameLayer[]; activeId: string }> => {
  await Promise.all(existing.map((layer) => deleteLayerDataFromStorage(layer.id)));

  // Свежий id, а не прежний: иначе новая локация подняла бы остатки удалённой.
  const layer = { id: uuidv4(), name: NEW_GAME_LAYER_NAME };

  return { layers: [layer], activeId: layer.id };
};

/** Имя файла: дата и название, чтобы сейвы различались в папке загрузок. */
export const buildSaveFileName = (title: string, savedAt: Date = new Date()): string => {
  const date = savedAt.toISOString().slice(0, 10);
  const safe = title.replace(/[\\/:*?"<>|]/g, '').trim();

  return `${date} ${safe || 'Игра'}.${SAVE_EXTENSION}`;
};

export const downloadGame = (file: Blob, fileName: string) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  // blob:-URL держит файл целиком, поэтому его надо отозвать — но не сразу:
  // браузеру нужно время забрать сотни мегабайт в загрузки.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};
