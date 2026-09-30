import { describe, expect, it } from 'vitest';
import {
  adjustImageSizeToWorld,
  clampFilesToWorld,
  migrateFilesToFractions,
  updateImageDimensions,
} from './helpers';
import { DropzoneFile } from './types';
import { getWorldBox } from './viewport';

const SCREEN = { width: 1000, height: 800 };
// Карта 2:1 в экране 1000×800 — вписывается по ширине, поля сверху и снизу.
const WORLD = getWorldBox(2, SCREEN);

const makeFile = (overrides: Partial<DropzoneFile> = {}): DropzoneFile => ({
  id: 'file-1',
  preview: 'blob:preview',
  name: 'goblin.png',
  position: { x: 0, y: 0 },
  dimensions: { width: 0.1, height: 0.1 },
  imageType: 'normal',
  ...overrides,
});

/** Прогоняет обновление состояния так же, как это сделал бы React. */
const applyUpdater = (files: DropzoneFile[]) => {
  let result = files;
  const setFunc = ((updater: unknown) => {
    result =
      typeof updater === 'function'
        ? (updater as (p: DropzoneFile[]) => DropzoneFile[])(result)
        : (updater as DropzoneFile[]);
  }) as unknown as Parameters<typeof clampFilesToWorld>[0]['setFunc'];

  return { setFunc, getResult: () => result };
};

describe('adjustImageSizeToWorld', () => {
  it('вписывает картинку в 80% карты', () => {
    // 2000×1000 при ширине карты 1000 — это две карты, ужимаем до 0.8
    expect(adjustImageSizeToWorld(2000, 1000, false, WORLD)).toEqual({ width: 0.8, height: 0.4 });
  });

  it('боевую карту вписывает во всю карту', () => {
    expect(adjustImageSizeToWorld(2000, 1000, true, WORLD)).toEqual({ width: 1, height: 0.5 });
  });

  it('не раздувает картинку, которая и так помещается', () => {
    expect(adjustImageSizeToWorld(100, 50, false, WORLD)).toEqual({ width: 0.1, height: 0.05 });
  });

  it('высокую картинку ограничивает высотой карты, а не шириной', () => {
    // высота карты 2:1 — это 0.5 её ширины, 80% от неё — 0.4
    expect(adjustImageSizeToWorld(1000, 2000, false, WORLD)).toEqual({ width: 0.2, height: 0.4 });
  });

  it('даёт одинаковый результат на экране другого разрешения', () => {
    const меньший = getWorldBox(2, { width: 500, height: 400 });

    expect(adjustImageSizeToWorld(2000, 1000, false, меньший)).toEqual(
      adjustImageSizeToWorld(2000, 1000, false, WORLD),
    );
  });
});

describe('migrateFilesToFractions', () => {
  it('переводит сцену из пикселей окна в доли карты', () => {
    // картинка 100×50 стояла ровно серединой в центре окна 1000×800
    const files = [
      makeFile({ position: { x: 450, y: 375 }, dimensions: { width: 100, height: 50 } }),
    ];

    const [migrated] = migrateFilesToFractions(files, WORLD, SCREEN);

    // обе стороны поделены на ширину окна, форма картинки цела
    expect(migrated.dimensions).toEqual({ width: 0.1, height: 0.05 });
    // и середина осталась серединой карты: по горизонтали 0.5, по вертикали —
    // половина её высоты, то есть 0.25
    expect(migrated.position.x + migrated.dimensions.width / 2).toBeCloseTo(0.5);
    expect(migrated.position.y + migrated.dimensions.height / 2).toBeCloseTo(0.25);
  });

  it('сохраняет остальные поля картинки', () => {
    const [migrated] = migrateFilesToFractions([makeFile({ health: 3 })], WORLD, SCREEN);

    expect(migrated.health).toBe(3);
    expect(migrated.id).toBe('file-1');
  });
});

describe('clampFilesToWorld', () => {
  it('возвращает картинку в границы карты', () => {
    const { setFunc, getResult } = applyUpdater([
      makeFile({ position: { x: 0.95, y: 0.48 }, dimensions: { width: 0.1, height: 0.1 } }),
    ]);

    clampFilesToWorld({ setFunc, world: WORLD });

    expect(getResult()[0].position).toEqual({ x: 0.9, y: 0.4 });
  });

  it('не трогает картинку внутри карты', () => {
    const files = [makeFile({ position: { x: 0.2, y: 0.2 } })];
    const { setFunc, getResult } = applyUpdater(files);

    clampFilesToWorld({ setFunc, world: WORLD });

    expect(getResult()[0].position).toEqual({ x: 0.2, y: 0.2 });
  });
});

describe('updateImageDimensions', () => {
  it('меняет размер и заодно возвращает картинку в границы карты', () => {
    const { setFunc, getResult } = applyUpdater([makeFile({ position: { x: 0.85, y: 0.3 } })]);

    updateImageDimensions({
      setFunc,
      id: 'file-1',
      dimensions: { width: 0.3, height: 0.3 },
      world: WORLD,
    });

    expect(getResult()[0].dimensions).toEqual({ width: 0.3, height: 0.3 });
    expect(getResult()[0].position).toEqual({ x: 0.7, y: 0.2 });
  });
});
