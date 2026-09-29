import { describe, expect, it } from 'vitest';
import {
  clampToWorld,
  clampViewport,
  DEFAULT_VIEWPORT,
  isViewport,
  MAX_SCALE,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './viewport';

const WORLD = { width: 1000, height: 800 };

describe('screenToWorld / worldToScreen', () => {
  it('переводит туда и обратно без потерь', () => {
    const viewport = { scale: 2.5, x: -300, y: -120 };
    const point = { x: 640, y: 480 };

    expect(worldToScreen(screenToWorld(point, viewport), viewport)).toEqual(point);
  });

  it('при единичном масштабе мир совпадает с экраном', () => {
    expect(screenToWorld({ x: 42, y: 17 }, DEFAULT_VIEWPORT)).toEqual({ x: 42, y: 17 });
  });
});

describe('zoomAt', () => {
  it('оставляет точку под курсором на месте', () => {
    const cursor = { x: 720, y: 240 };
    const before = { scale: 1.5, x: -200, y: -80 };
    const worldPoint = screenToWorld(cursor, before);

    const after = zoomAt(before, cursor, 'in', WORLD);

    const screenPoint = worldToScreen(worldPoint, after);
    expect(screenPoint.x).toBeCloseTo(cursor.x);
    expect(screenPoint.y).toBeCloseTo(cursor.y);
  });

  it('приближает и отдаляет', () => {
    const zoomedIn = zoomAt(DEFAULT_VIEWPORT, { x: 500, y: 400 }, 'in', WORLD);
    expect(zoomedIn.scale).toBeGreaterThan(1);

    expect(zoomAt(zoomedIn, { x: 500, y: 400 }, 'out', WORLD).scale).toBeCloseTo(1);
  });

  it('не отъезжает мельче единицы — фон должен накрывать экран', () => {
    const viewport = zoomAt(DEFAULT_VIEWPORT, { x: 100, y: 100 }, 'out', WORLD);

    expect(viewport).toBe(DEFAULT_VIEWPORT);
  });

  it('не приближает дальше предела', () => {
    let viewport = DEFAULT_VIEWPORT;
    for (let step = 0; step < 100; step += 1) {
      viewport = zoomAt(viewport, { x: 500, y: 400 }, 'in', WORLD);
    }

    expect(viewport.scale).toBe(MAX_SCALE);
  });
});

describe('clampViewport', () => {
  it('на единичном масштабе не даёт сдвинуть сцену', () => {
    expect(clampViewport({ scale: 1, x: -300, y: 200 }, WORLD)).toEqual(DEFAULT_VIEWPORT);
  });

  it('не открывает пустоту за левым и верхним краем', () => {
    expect(clampViewport({ scale: 2, x: 150, y: 90 }, WORLD)).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it('не открывает пустоту за правым и нижним краем', () => {
    expect(clampViewport({ scale: 2, x: -5000, y: -5000 }, WORLD)).toEqual({
      scale: 2,
      x: -1000,
      y: -800,
    });
  });
});

describe('panBy', () => {
  it('сдвигает сцену на дельту мыши', () => {
    expect(panBy({ scale: 3, x: -500, y: -400 }, { x: 40, y: -30 }, WORLD)).toEqual({
      scale: 3,
      x: -460,
      y: -430,
    });
  });

  it('упирается в край карты', () => {
    expect(panBy({ scale: 2, x: -20, y: 0 }, { x: 100, y: 100 }, WORLD)).toEqual({
      scale: 2,
      x: 0,
      y: 0,
    });
  });
});

describe('clampToWorld', () => {
  const size = { width: 100, height: 100 };

  it('пускает токен за видимый экран, но не за границы мира', () => {
    expect(clampToWorld({ x: 1500, y: -200 }, size, WORLD)).toEqual({ x: 900, y: 0 });
  });

  it('не трогает токен внутри мира', () => {
    expect(clampToWorld({ x: 640, y: 480 }, size, WORLD)).toEqual({ x: 640, y: 480 });
  });

  it('прижимает к началу координат картинку больше мира', () => {
    expect(clampToWorld({ x: 300, y: 300 }, { width: 4000, height: 4000 }, WORLD)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('isViewport', () => {
  it('принимает нормальное значение', () => {
    expect(isViewport({ scale: 2, x: -10, y: 0 })).toBe(true);
  });

  it.each([null, 'кубик', {}, { scale: 2, x: 0 }, { scale: NaN, x: 0, y: 0 }])(
    'отвергает мусор %s',
    (value) => {
      expect(isViewport(value)).toBe(false);
    },
  );
});
