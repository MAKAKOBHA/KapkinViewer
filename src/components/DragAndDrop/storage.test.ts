import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteImageBlob,
  deleteLayerDataFromStorage,
  FILES_VERSION,
  getCanvasBlobKey,
  getImageBlob,
  loadBackgroundFromLocalStorage,
  loadFilesFromLocalStorage,
  loadViewportFromLocalStorage,
  putImageBlob,
  saveBackgroundToLocalStorage,
  saveFilesToLocalStorage,
  saveViewportToLocalStorage,
} from './storage';
import { DropzoneFile } from './types';

const makeFile = (id: string): DropzoneFile => ({
  id,
  preview: 'blob:preview',
  name: `${id}.png`,
  position: { x: 0.1, y: 0.2 },
  dimensions: { width: 0.2, height: 0.1 },
  imageType: 'normal',
});

beforeEach(() => {
  localStorage.clear();
});

describe('файлы локации', () => {
  it('хранит файлы отдельно для каждой локации', () => {
    saveFilesToLocalStorage([makeFile('a')], 'tavern');
    saveFilesToLocalStorage([makeFile('b'), makeFile('c')], 'dungeon');

    expect(loadFilesFromLocalStorage('tavern').files.map((f) => f.id)).toEqual(['a']);
    expect(loadFilesFromLocalStorage('dungeon').files.map((f) => f.id)).toEqual(['b', 'c']);
  });

  it('возвращает пустой список для незнакомой локации', () => {
    expect(loadFilesFromLocalStorage('unknown').files).toEqual([]);
  });

  it('переживает испорченные данные', () => {
    localStorage.setItem('files-tavern', '{сломано');
    expect(loadFilesFromLocalStorage('tavern').files).toEqual([]);
  });
});

describe('версии сцены', () => {
  it('сохраняет сцену новой версии и читает её без перевода', () => {
    saveFilesToLocalStorage([makeFile('a')], 'tavern');

    expect(loadFilesFromLocalStorage('tavern').version).toBe(FILES_VERSION);
  });

  it('узнаёт сцену первой версии по голому массиву', () => {
    localStorage.setItem('files-tavern', JSON.stringify([makeFile('a')]));

    const stored = loadFilesFromLocalStorage('tavern');

    expect(stored.version).toBe(1);
    expect(stored.files.map((f) => f.id)).toEqual(['a']);
  });

  it('не принимает запись без списка файлов', () => {
    localStorage.setItem('files-tavern', JSON.stringify({ version: 2 }));

    expect(loadFilesFromLocalStorage('tavern').files).toEqual([]);
  });
});

describe('фон локации', () => {
  it('хранит фон и пропорции карты отдельно для каждой локации', () => {
    saveBackgroundToLocalStorage({ id: 'bg-tavern', aspect: 16 / 9 }, 'tavern');
    saveBackgroundToLocalStorage({ id: 'bg-dungeon', aspect: 4 / 3 }, 'dungeon');

    expect(loadBackgroundFromLocalStorage('tavern')).toEqual({ id: 'bg-tavern', aspect: 16 / 9 });
    expect(loadBackgroundFromLocalStorage('dungeon')).toEqual({ id: 'bg-dungeon', aspect: 4 / 3 });
  });

  it('читает старый формат, где лежал один id', () => {
    localStorage.setItem('background-tavern', JSON.stringify('bg-tavern'));

    expect(loadBackgroundFromLocalStorage('tavern')).toEqual({ id: 'bg-tavern', aspect: null });
  });

  it('не доверяет негодным пропорциям', () => {
    localStorage.setItem('background-tavern', JSON.stringify({ id: 'bg', aspect: 0 }));

    expect(loadBackgroundFromLocalStorage('tavern')).toEqual({ id: 'bg', aspect: null });
  });

  it('сбрасывается при сохранении null', () => {
    saveBackgroundToLocalStorage({ id: 'bg-tavern', aspect: 1 }, 'tavern');
    saveBackgroundToLocalStorage(null, 'tavern');

    expect(loadBackgroundFromLocalStorage('tavern')).toBeNull();
  });
});

describe('зум локации', () => {
  it('хранит зум отдельно для каждой локации', () => {
    saveViewportToLocalStorage({ scale: 3, x: -200, y: -100 }, 'tavern');
    saveViewportToLocalStorage({ scale: 1, x: 0, y: 0 }, 'dungeon');

    expect(loadViewportFromLocalStorage('tavern')).toEqual({ scale: 3, x: -200, y: -100 });
    expect(loadViewportFromLocalStorage('dungeon')).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('возвращает null для локации, которую ещё не приближали', () => {
    expect(loadViewportFromLocalStorage('unknown')).toBeNull();
  });

  it('переживает испорченные данные', () => {
    localStorage.setItem('viewport-tavern', '{сломано');
    expect(loadViewportFromLocalStorage('tavern')).toBeNull();
  });

  it('отвергает значение не той формы', () => {
    localStorage.setItem('viewport-tavern', '{"scale":"много"}');
    expect(loadViewportFromLocalStorage('tavern')).toBeNull();
  });
});

/**
 * Содержимое блоба здесь не проверяется: fake-indexeddb не умеет клонировать
 * jsdom-Blob и возвращает пустой объект. Тесты сторожат жизненный цикл ключей —
 * именно он определяет, какой локации принадлежат данные.
 */
describe('блобы картинок', () => {
  it('кладёт и достаёт запись по ключу', async () => {
    await putImageBlob('img-1', new Blob(['картинка']));

    expect(await getImageBlob('img-1')).not.toBeNull();
  });

  it('возвращает null, если блоба нет', async () => {
    expect(await getImageBlob('missing')).toBeNull();
  });

  it('удаляет блоб', async () => {
    await putImageBlob('img-2', new Blob(['x']));
    await deleteImageBlob('img-2');

    expect(await getImageBlob('img-2')).toBeNull();
  });
});

describe('удаление локации', () => {
  it('уносит метаданные, блобы файлов, фон и рисунок — и только своей локации', async () => {
    saveFilesToLocalStorage([makeFile('tavern-file')], 'tavern');
    saveBackgroundToLocalStorage({ id: 'tavern-bg', aspect: 16 / 9 }, 'tavern');
    saveViewportToLocalStorage({ scale: 4, x: -300, y: -200 }, 'tavern');
    await putImageBlob('tavern-file', new Blob(['f']));
    await putImageBlob('tavern-bg', new Blob(['b']));
    await putImageBlob(getCanvasBlobKey('tavern'), new Blob(['c']));

    saveFilesToLocalStorage([makeFile('dungeon-file')], 'dungeon');
    saveViewportToLocalStorage({ scale: 2, x: -50, y: -50 }, 'dungeon');
    await putImageBlob('dungeon-file', new Blob(['f2']));
    await putImageBlob(getCanvasBlobKey('dungeon'), new Blob(['c2']));

    await deleteLayerDataFromStorage('tavern');

    expect(localStorage.getItem('files-tavern')).toBeNull();
    expect(localStorage.getItem('background-tavern')).toBeNull();
    expect(loadViewportFromLocalStorage('tavern')).toBeNull();
    expect(await getImageBlob('tavern-file')).toBeNull();
    expect(await getImageBlob('tavern-bg')).toBeNull();
    expect(await getImageBlob(getCanvasBlobKey('tavern'))).toBeNull();

    // соседняя локация не пострадала
    expect(loadFilesFromLocalStorage('dungeon').files.map((f) => f.id)).toEqual(['dungeon-file']);
    expect(loadViewportFromLocalStorage('dungeon')).not.toBeNull();
    expect(await getImageBlob('dungeon-file')).not.toBeNull();
    expect(await getImageBlob(getCanvasBlobKey('dungeon'))).not.toBeNull();
  });
});
