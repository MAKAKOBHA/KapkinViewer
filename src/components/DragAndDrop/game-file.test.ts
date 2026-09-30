import { describe, expect, it } from 'vitest';
import { Stroke } from 'components/Canvas/lib/render-drawing';
import {
  HEADER_SIZE,
  packGame,
  SAVE_FORMAT,
  SAVE_MAGIC,
  SAVE_VERSION,
  SavedLayer,
  SaveFileError,
  unpackGame,
} from './game-file';
import { FILES_VERSION } from './storage';
import { StoredBackground } from './types';

const stroke: Stroke = {
  tool: 'brush',
  color: '#ffffff',
  size: 0.01,
  opacity: 100,
  points: [
    { x: 0.1, y: 0.1 },
    { x: 0.2, y: 0.2 },
  ],
};

const makeLayer = (overrides: Partial<SavedLayer> = {}): SavedLayer => ({
  id: 'tavern',
  name: 'Таверна',
  files: { version: FILES_VERSION, files: [] },
  background: null,
  viewport: null,
  drawing: null,
  ...overrides,
});

const image = (text: string, type = 'image/png') => new Blob([text], { type });

const readText = (blob: Blob | null) => (blob ? blob.text() : Promise.resolve(null));

/**
 * Файл с заданным манифестом и правильным заголовком. Смещения версии и длины
 * прописаны числами намеренно: тест сторожит сам формат, а не его константы.
 */
const withManifest = (text: string, manifestLength?: number): Blob => {
  const manifest = new TextEncoder().encode(text);
  const header = new Uint8Array(HEADER_SIZE);
  header.set(new TextEncoder().encode(SAVE_MAGIC));

  const view = new DataView(header.buffer);
  view.setUint16(6, SAVE_VERSION, true);
  view.setUint32(8, manifestLength ?? manifest.byteLength, true);

  return new Blob([header, manifest]);
};

describe('метаданные локаций', () => {
  it('переживает сборку и разбор файла', async () => {
    const file = packGame(
      [
        makeLayer({ id: 'tavern', name: 'Таверна', viewport: { scale: 2, x: -10, y: -20 } }),
        makeLayer({ id: 'dungeon', name: 'Подземелье', background: { id: 'bg', aspect: 16 / 9 } }),
      ],
      [],
    );

    const { manifest } = await unpackGame(file);

    expect(manifest.format).toBe(SAVE_FORMAT);
    expect(manifest.layers.map((layer) => layer.name)).toEqual(['Таверна', 'Подземелье']);
    expect(manifest.layers[0].viewport).toEqual({ scale: 2, x: -10, y: -20 });
    expect(manifest.layers[1].background).toEqual({ id: 'bg', aspect: 16 / 9 });
  });

  it('сохраняет версию сцены, а не подменяет её текущей', async () => {
    const file = packGame([makeLayer({ files: { version: 1, files: [] } })], []);

    const { manifest } = await unpackGame(file);

    expect(manifest.layers[0].files.version).toBe(1);
  });

  it('понимает фон старого формата — голый id', async () => {
    const file = packGame([makeLayer({ background: 'old-bg' as unknown as StoredBackground })], []);

    const { manifest } = await unpackGame(file);

    expect(manifest.layers[0].background).toEqual({ id: 'old-bg', aspect: null });
  });

  it('выбрасывает битый штрих, а не роняет разбор', async () => {
    const drawing = { version: 1, strokes: [stroke, { tool: 'brush' } as unknown as Stroke] };
    const file = packGame([makeLayer({ drawing })], []);

    const { manifest } = await unpackGame(file);

    expect(manifest.layers[0].drawing?.strokes).toEqual([stroke]);
  });
});

describe('картинки внутри файла', () => {
  it('отдаёт содержимое байт в байт и с тем же типом', async () => {
    const file = packGame([makeLayer()], [{ id: 'img-1', blob: image('карта') }]);

    const { getBlob } = await unpackGame(file);
    const restored = getBlob('img-1');

    expect(restored?.type).toBe('image/png');
    expect(await readText(restored)).toBe('карта');
  });

  it('не путает картинки между собой', async () => {
    const file = packGame(
      [makeLayer()],
      [
        { id: 'a', blob: image('первая') },
        { id: 'b', blob: image('вторая-подольше', 'image/jpeg') },
        { id: 'c', blob: image('третья') },
      ],
    );

    const { getBlob } = await unpackGame(file);

    expect(await readText(getBlob('a'))).toBe('первая');
    expect(await readText(getBlob('b'))).toBe('вторая-подольше');
    expect(await readText(getBlob('c'))).toBe('третья');
    expect(getBlob('b')?.type).toBe('image/jpeg');
  });

  it('возвращает null для картинки, которой в файле нет', async () => {
    const file = packGame([makeLayer()], []);

    const { getBlob } = await unpackGame(file);

    expect(getBlob('нет такой')).toBeNull();
  });
});

describe('негодные файлы', () => {
  it('отвергает чужой файл', async () => {
    await expect(unpackGame(new Blob(['просто картинка, а не сейв']))).rejects.toThrow(
      SaveFileError,
    );
  });

  it('отвергает файл короче заголовка', async () => {
    await expect(unpackGame(new Blob(['KV']))).rejects.toThrow('Это не файл сохранённой игры');
  });

  it('отвергает сейв более новой версии', async () => {
    const source = new Uint8Array(await packGame([makeLayer()], []).arrayBuffer());
    new DataView(source.buffer).setUint16(6, SAVE_VERSION + 1, true);

    await expect(unpackGame(new Blob([source]))).rejects.toThrow(
      'Сохранение сделано более новой версией приложения',
    );
  });

  it('отвергает манифест, который не разбирается', async () => {
    await expect(unpackGame(withManifest('{сломано'))).rejects.toThrow('Файл сохранения повреждён');
  });

  it('отвергает манифест, объявленный длиннее файла', async () => {
    await expect(unpackGame(withManifest('{}', 9999))).rejects.toThrow('Файл сохранения повреждён');
  });

  it('отвергает файл без локаций', async () => {
    await expect(unpackGame(packGame([], []))).rejects.toThrow('В файле нет ни одной локации');
  });

  it('отвергает локацию без id', async () => {
    const manifest = JSON.stringify({ format: SAVE_FORMAT, layers: [{ name: 'Без id' }] });

    await expect(unpackGame(withManifest(manifest))).rejects.toThrow(
      'В файле нет ни одной локации',
    );
  });

  it('пропускает картинку, чьи границы выходят за файл', async () => {
    const blobs = [{ id: 'врун', type: '', offset: 0, length: 1000 }];
    const manifest = JSON.stringify({
      format: SAVE_FORMAT,
      layers: [makeLayer()],
      blobs,
    });

    const { getBlob } = await unpackGame(withManifest(manifest));

    expect(getBlob('врун')).toBeNull();
  });
});
