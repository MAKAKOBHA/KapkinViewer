import { describe, expect, it } from 'vitest';
import {
  clampToWorld,
  clampViewport,
  DEFAULT_VIEWPORT,
  getWorldBox,
  isValidAspect,
  isViewport,
  MAX_SCALE,
  panBy,
  screenToWorld,
  toFraction,
  toPixels,
  worldToScreen,
  zoomAt,
} from './viewport';

const SCREEN = { width: 1000, height: 800 };
// Мир шире экрана по пропорциям — вписывается по ширине, остаются поля сверху и снизу.
const WIDE = getWorldBox(2, SCREEN);
// Мир той же формы, что экран: полей нет.
const SAME = getWorldBox(1000 / 800, SCREEN);

describe('getWorldBox', () => {
  it('вписывает широкую карту по ширине экрана', () => {
    expect(WIDE).toEqual({ aspect: 2, width: 1000, height: 500 });
  });

  it('вписывает высокую карту по высоте экрана', () => {
    expect(getWorldBox(0.5, SCREEN)).toEqual({ aspect: 0.5, width: 400, height: 800 });
  });

  it('карту в пропорциях экрана растягивает на весь экран', () => {
    expect(SAME.width).toBe(1000);
    expect(SAME.height).toBe(800);
  });

  it('на экране другого разрешения даёт ту же форму', () => {
    const меньший = getWorldBox(2, { width: 500, height: 400 });

    expect(меньший.width / меньший.height).toBeCloseTo(WIDE.width / WIDE.height);
  });
});

describe('доли и пиксели', () => {
  it('переводит туда и обратно', () => {
    expect(toFraction(toPixels({ x: 0.25, y: 0.1 }, WIDE), WIDE)).toEqual({ x: 0.25, y: 0.1 });
  });

  it('обе оси меряет шириной мира — форма картинки не зависит от пропорций карты', () => {
    expect(toPixels({ x: 0.5, y: 0.5 }, WIDE)).toEqual({ x: 500, y: 500 });
  });
});

describe('screenToWorld / worldToScreen', () => {
  it('переводит туда и обратно без потерь', () => {
    const viewport = { scale: 2.5, x: -300, y: -120 };
    const point = { x: 640, y: 480 };

    expect(worldToScreen(screenToWorld(point, viewport), viewport)).toEqual(point);
  });
});

describe('zoomAt', () => {
  it('оставляет точку под курсором на месте', () => {
    const cursor = { x: 720, y: 240 };
    const before = clampViewport({ scale: 1.5, x: -200, y: -80 }, SAME, SCREEN);
    const worldPoint = screenToWorld(cursor, before);

    const after = zoomAt(before, cursor, 'in', SAME, SCREEN);

    expect(worldToScreen(worldPoint, after).x).toBeCloseTo(cursor.x);
    expect(worldToScreen(worldPoint, after).y).toBeCloseTo(cursor.y);
  });

  it('не отъезжает мельче единицы — карта и так видна целиком', () => {
    expect(zoomAt(DEFAULT_VIEWPORT, { x: 100, y: 100 }, 'out', SAME, SCREEN)).toBe(
      DEFAULT_VIEWPORT,
    );
  });

  it('не приближает дальше предела', () => {
    let viewport = DEFAULT_VIEWPORT;
    for (let step = 0; step < 100; step += 1) {
      viewport = zoomAt(viewport, { x: 500, y: 400 }, 'in', SAME, SCREEN);
    }

    expect(viewport.scale).toBe(MAX_SCALE);
  });
});

describe('clampViewport', () => {
  it('ставит карту по центру, пока она мельче экрана', () => {
    // широкий мир: 1000×500 в экране 1000×800 — поля по 150 сверху и снизу
    expect(clampViewport({ scale: 1, x: 40, y: -200 }, WIDE, SCREEN)).toEqual({
      scale: 1,
      x: 0,
      y: 150,
    });
  });

  it('на единичном масштабе не даёт сдвинуть карту в пропорциях экрана', () => {
    expect(clampViewport({ scale: 1, x: -300, y: 200 }, SAME, SCREEN)).toEqual(DEFAULT_VIEWPORT);
  });

  it('не открывает пустоту за краем приближённой карты', () => {
    expect(clampViewport({ scale: 2, x: 150, y: 90 }, SAME, SCREEN)).toEqual({
      scale: 2,
      x: 0,
      y: 0,
    });
    expect(clampViewport({ scale: 2, x: -5000, y: -5000 }, SAME, SCREEN)).toEqual({
      scale: 2,
      x: -1000,
      y: -800,
    });
  });

  it('даёт возить приближённую карту по той оси, где она переросла экран', () => {
    // широкий мир при ×2 — это 2000×1000: по горизонтали и вертикали уже больше экрана
    expect(clampViewport({ scale: 2, x: -500, y: -100 }, WIDE, SCREEN)).toEqual({
      scale: 2,
      x: -500,
      y: -100,
    });
  });
});

describe('panBy', () => {
  it('сдвигает сцену на дельту мыши', () => {
    expect(panBy({ scale: 3, x: -500, y: -400 }, { x: 40, y: -30 }, SAME, SCREEN)).toEqual({
      scale: 3,
      x: -460,
      y: -430,
    });
  });

  it('упирается в край карты', () => {
    expect(panBy({ scale: 2, x: -20, y: 0 }, { x: 100, y: 100 }, SAME, SCREEN)).toEqual({
      scale: 2,
      x: 0,
      y: 0,
    });
  });
});

describe('clampToWorld', () => {
  const size = { width: 0.1, height: 0.1 };

  it('пускает токен за видимый экран, но не за границы карты', () => {
    expect(clampToWorld({ x: 5, y: -2 }, size, WIDE)).toEqual({ x: 0.9, y: 0 });
  });

  it('нижнюю границу берёт из высоты мира, а не из единицы', () => {
    // высота широкого мира — 0.5 его ширины
    expect(clampToWorld({ x: 0.2, y: 5 }, size, WIDE)).toEqual({ x: 0.2, y: 0.4 });
  });

  it('прижимает к началу координат картинку больше карты', () => {
    expect(clampToWorld({ x: 0.3, y: 0.3 }, { width: 4, height: 4 }, WIDE)).toEqual({ x: 0, y: 0 });
  });
});

describe('проверки данных из хранилища', () => {
  it('принимает нормальный зум', () => {
    expect(isViewport({ scale: 2, x: -10, y: 0 })).toBe(true);
  });

  it.each([null, 'кубик', {}, { scale: 2, x: 0 }, { scale: NaN, x: 0, y: 0 }])(
    'отвергает мусор %s',
    (value) => {
      expect(isViewport(value)).toBe(false);
    },
  );

  it.each([0, -2, NaN, '16/9', null])('отвергает негодные пропорции %s', (value) => {
    expect(isValidAspect(value)).toBe(false);
  });
});
