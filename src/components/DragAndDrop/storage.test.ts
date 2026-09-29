import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteImageBlob,
  deleteLayerDataFromStorage,
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
  position: { x: 10, y: 20 },
  dimensions: { width: 100, height: 50 },
  imageType: 'normal',
});

beforeEach(() => {
  localStorage.clear();
});

describe('файлы локации', () => {
  it('хранит файлы отдельно для каждой локации', () => {
    saveFilesToLocalStorage([makeFile('a')], 'tavern');
    saveFilesToLocalStorage([makeFile('b'), makeFile('c')], 'dungeon');

    expect(loadFilesFromLocalStorage('tavern').map((f) => f.id)).toEqual(['a']);
    expect(loadFilesFromLocalStorage('dungeon').map((f) => f.id)).toEqual(['b', 'c']);
  });

  it('возвращает пустой список для незнакомой локации', () => {
    expect(loadFilesFromLocalStorage('unknown')).toEqual([]);
  });

  it('переживает испорченные данные', () => {
    localStorage.setItem('files-tavern', '{сломано');
    expect(loadFilesFromLocalStorage('tavern')).toEqual([]);
  });
});

describe('фон локации', () => {
  it('хранит фон отдельно для каждой локации', () => {
    saveBackgroundToLocalStorage('bg-tavern', 'tavern');
    saveBackgroundToLocalStorage('bg-dungeon', 'dungeon');

    expect(loadBackgroundFromLocalStorage('tavern')).toBe('bg-tavern');
    expect(loadBackgroundFromLocalStorage('dungeon')).toBe('bg-dungeon');
  });

  it('сбрасывается при сохранении null', () => {
    saveBackgroundToLocalStorage('bg-tavern', 'tavern');
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
    saveBackgroundToLocalStorage('tavern-bg', 'tavern');
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
    expect(loadFilesFromLocalStorage('dungeon').map((f) => f.id)).toEqual(['dungeon-file']);
    expect(loadViewportFromLocalStorage('dungeon')).not.toBeNull();
    expect(await getImageBlob('dungeon-file')).not.toBeNull();
    expect(await getImageBlob(getCanvasBlobKey('dungeon'))).not.toBeNull();
  });
});
