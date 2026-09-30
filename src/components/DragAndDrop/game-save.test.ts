import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Drawing, Stroke } from 'components/Canvas/lib/render-drawing';
import { unpackGame } from './game-file';
import { buildSaveFileName, collectGame, importGame } from './game-save';
import {
  loadBackgroundFromLocalStorage,
  loadDrawing,
  loadFilesFromLocalStorage,
  loadViewportFromLocalStorage,
  putImageBlob,
  saveBackgroundToLocalStorage,
  saveDrawing,
  saveFilesToLocalStorage,
  saveViewportToLocalStorage,
} from './storage';
import { DropzoneFile } from './types';

/**
 * fake-indexeddb не умеет клонировать jsdom-Blob и возвращает вместо картинки
 * пустой объект, поэтому IndexedDB здесь подменена на карту в памяти — иначе
 * содержимое картинок в тестах не проверить. Жизненный цикл ключей самой
 * IndexedDB сторожит `storage.test.ts`.
 */
const store = vi.hoisted(() => ({
  blobs: new Map<string, Blob>(),
  drawings: new Map<string, Drawing>(),
}));

vi.mock('./storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./storage')>();

  return {
    ...actual,
    putImageBlob: async (key: string, blob: Blob) => {
      store.blobs.set(key, blob);
    },
    getImageBlob: async (key: string) => store.blobs.get(key) ?? null,
    saveDrawing: async (drawing: Drawing, layerId: string) => {
      store.drawings.set(actual.getDrawingKey(layerId), drawing);
    },
    loadDrawing: async (layerId: string) =>
      store.drawings.get(actual.getDrawingKey(layerId)) ?? null,
  };
});

const stroke: Stroke = {
  tool: 'brush',
  color: '#ffffff',
  size: 0.01,
  opacity: 100,
  points: [{ x: 0.1, y: 0.1 }],
};

const makeFile = (id: string): DropzoneFile => ({
  id,
  preview: 'blob:просрочено',
  name: 'token.png',
  position: { x: 0.1, y: 0.2 },
  dimensions: { width: 0.2, height: 0.1 },
  imageType: 'normal',
});

/** Локация с картинкой, фоном и видом — как после работы мастера. */
const seedLayer = async (layerId: string) => {
  saveFilesToLocalStorage([makeFile(`${layerId}-file`)], layerId);
  saveBackgroundToLocalStorage({ id: `${layerId}-bg`, aspect: 16 / 9 }, layerId);
  saveViewportToLocalStorage({ scale: 2, x: -10, y: -20 }, layerId);

  await putImageBlob(`${layerId}-file`, new Blob([`файл ${layerId}`], { type: 'image/png' }));
  await putImageBlob(`${layerId}-bg`, new Blob([`фон ${layerId}`], { type: 'image/jpeg' }));
};

const tavern = { id: 'tavern', name: 'Таверна' };
const dungeon = { id: 'dungeon', name: 'Подземелье' };

beforeEach(() => {
  localStorage.clear();
  store.blobs.clear();
  store.drawings.clear();
});

describe('выгрузка', () => {
  it('складывает в файл все указанные локации', async () => {
    await seedLayer('tavern');
    await seedLayer('dungeon');

    const { manifest, getBlob } = await unpackGame(await collectGame([tavern, dungeon]));

    expect(manifest.layers.map((layer) => layer.name)).toEqual(['Таверна', 'Подземелье']);
    expect(await getBlob('tavern-file')?.text()).toBe('файл tavern');
    expect(await getBlob('dungeon-bg')?.text()).toBe('фон dungeon');
  });

  it('выгружает одну локацию, не приплетая соседнюю', async () => {
    await seedLayer('tavern');
    await seedLayer('dungeon');

    const { manifest, getBlob } = await unpackGame(await collectGame([tavern]));

    expect(manifest.layers.map((layer) => layer.id)).toEqual(['tavern']);
    expect(getBlob('dungeon-file')).toBeNull();
  });

  it('не тащит в файл просроченные превью', async () => {
    await seedLayer('tavern');

    const { manifest } = await unpackGame(await collectGame([tavern]));

    expect(manifest.layers[0].files.files[0].preview).toBe('');
  });

  it('переживает потерянную картинку', async () => {
    saveFilesToLocalStorage([makeFile('ghost')], 'tavern');

    const { manifest, getBlob } = await unpackGame(await collectGame([tavern]));

    expect(manifest.layers[0].files.files).toHaveLength(1);
    expect(getBlob('ghost')).toBeNull();
  });
});

describe('импорт добавлением', () => {
  it('оставляет старые локации и выдаёт новым свои id', async () => {
    await seedLayer('tavern');
    const file = await collectGame([tavern]);

    const next = await importGame(file, 'append', [tavern]);
    const imported = next.layers[1];

    expect(next.layers).toHaveLength(2);
    expect(imported.name).toBe('Таверна');
    expect(imported.id).not.toBe('tavern');
    // Мастер попадает в загруженную игру.
    expect(next.activeId).toBe(imported.id);
    // Старая локация цела.
    expect(loadFilesFromLocalStorage('tavern').files.map((f) => f.id)).toEqual(['tavern-file']);
  });

  it('перекладывает картинки под новые id, сохраняя содержимое', async () => {
    await seedLayer('tavern');
    const file = await collectGame([tavern]);

    const next = await importGame(file, 'append', [tavern]);
    const { id } = next.layers[1];
    const { files } = loadFilesFromLocalStorage(id);
    const background = loadBackgroundFromLocalStorage(id);

    expect(files).toHaveLength(1);
    expect(files[0].id).not.toBe('tavern-file');
    expect(await store.blobs.get(files[0].id)?.text()).toBe('файл tavern');
    expect(background?.id).not.toBe('tavern-bg');
    expect(await store.blobs.get(`${background?.id}`)?.text()).toBe('фон tavern');
    expect(background?.aspect).toBe(16 / 9);
    expect(loadViewportFromLocalStorage(id)).toEqual({ scale: 2, x: -10, y: -20 });
  });

  it('переносит рисунок в новую локацию', async () => {
    await seedLayer('tavern');
    await saveDrawing({ version: 1, strokes: [stroke] }, 'tavern');
    const file = await collectGame([tavern]);

    const next = await importGame(file, 'append', [tavern]);

    expect((await loadDrawing(next.layers[1].id))?.strokes).toEqual([stroke]);
  });

  it('сохраняет версию сцены: пиксели не объявляются долями', async () => {
    localStorage.setItem('files-tavern', JSON.stringify([makeFile('tavern-file')]));
    await putImageBlob('tavern-file', new Blob(['старый файл']));
    const file = await collectGame([tavern]);

    const next = await importGame(file, 'append', [tavern]);

    expect(loadFilesFromLocalStorage(next.layers[1].id).version).toBe(1);
  });

  it('один файл можно импортировать дважды — копии независимы', async () => {
    await seedLayer('tavern');
    const file = await collectGame([tavern]);

    const first = await importGame(file, 'append', [tavern]);
    const second = await importGame(file, 'append', first.layers);

    const [firstCopy, secondCopy] = [first.layers[1].id, second.layers[2].id];

    expect(firstCopy).not.toBe(secondCopy);
    expect(loadFilesFromLocalStorage(firstCopy).files[0].id).not.toBe(
      loadFilesFromLocalStorage(secondCopy).files[0].id,
    );
  });

  it('пропускает токен, картинки которого в файле не оказалось', async () => {
    saveFilesToLocalStorage([makeFile('ghost')], 'tavern');
    const file = await collectGame([tavern]);

    const next = await importGame(file, 'append', [tavern]);

    expect(loadFilesFromLocalStorage(next.layers[1].id).files).toEqual([]);
  });
});

describe('чистый импорт', () => {
  it('оставляет только локации из файла и уносит метаданные прежних', async () => {
    await seedLayer('tavern');
    await seedLayer('dungeon');
    const file = await collectGame([tavern]);

    const next = await importGame(file, 'replace', [tavern, dungeon]);

    expect(next.layers).toHaveLength(1);
    expect(next.layers[0].id).not.toBe('tavern');
    expect(next.activeId).toBe(next.layers[0].id);

    expect(localStorage.getItem('files-tavern')).toBeNull();
    expect(localStorage.getItem('background-dungeon')).toBeNull();
    expect(loadViewportFromLocalStorage('dungeon')).toBeNull();

    // Данные импортированной локации записаны после удаления, а не до.
    expect(loadFilesFromLocalStorage(next.layers[0].id).files).toHaveLength(1);
  });
});

describe('имя файла', () => {
  it('начинается с даты и заканчивается расширением', () => {
    expect(buildSaveFileName('Таверна', new Date('2026-09-30T12:00:00Z'))).toBe(
      '2026-09-30 Таверна.kvgame',
    );
  });

  it('выкидывает символы, недопустимые в имени файла', () => {
    expect(buildSaveFileName('Шахты: вход/выход', new Date('2026-09-30T12:00:00Z'))).toBe(
      '2026-09-30 Шахты входвыход.kvgame',
    );
  });

  it('не оставляет имя пустым', () => {
    expect(buildSaveFileName('///', new Date('2026-09-30T12:00:00Z'))).toBe(
      '2026-09-30 Игра.kvgame',
    );
  });
});
