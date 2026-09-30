/**
 * Зум, панорама и система координат сцены — одной чистой математикой, без DOM.
 *
 * **Мир** — это карта локации: прямоугольник в пропорциях фонового изображения.
 * Положения и размеры картинок хранятся долями его ширины, поэтому сцена
 * одинаково выглядит на мониторе любого разрешения и любых пропорций: доли не
 * зависят от пикселей. По вертикали доли считаются от той же ширины — так
 * круглый токен остаётся круглым, как бы ни был вытянут мир.
 *
 * **Экран** — то, что даёт мышь. Мир вписывается в экран целиком (`contain`),
 * поэтому по одной оси могут остаться поля; связь между пространствами —
 * `Viewport`: `screen = worldPx * scale + offset`.
 */

export type Viewport = { scale: number; x: number; y: number };
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
/** Прямоугольник карты: пропорции и размер в пикселях при `scale === 1`. */
export type World = { aspect: number; width: number; height: number };

export const DEFAULT_VIEWPORT: Viewport = { scale: 1, x: 0, y: 0 };

/** Пропорции мира, пока фон не загружен: самый частый экран и телевизор. */
export const DEFAULT_WORLD_ASPECT = 16 / 9;

/** На единице карта видна целиком — дальше отъезжать некуда. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
/** Шаг зума — множитель, а не слагаемое: иначе у краёв диапазона колесо ведёт себя неровно. */
export const ZOOM_STEP = 1.15;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getScreenSize = (): Size => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

/** Размер экрана, в который вписан мир, — им же меряются поля по бокам. */
export const getWorldBox = (aspect: number, screen: Size): World => {
  const width = Math.min(screen.width, screen.height * aspect);

  return { aspect, width, height: width / aspect };
};

export const screenToWorld = (point: Point, { scale, x, y }: Viewport): Point => ({
  x: (point.x - x) / scale,
  y: (point.y - y) / scale,
});

export const worldToScreen = (point: Point, { scale, x, y }: Viewport): Point => ({
  x: point.x * scale + x,
  y: point.y * scale + y,
});

/** Пиксели мира — в доли его ширины, в которых хранится сцена. */
export const toFraction = (point: Point, world: World): Point => ({
  x: point.x / world.width,
  y: point.y / world.width,
});

export const toPixels = (point: Point, world: World): Point => ({
  x: point.x * world.width,
  y: point.y * world.width,
});

/** Высота мира в тех же единицах, что и всё остальное, — долях его ширины. */
export const getWorldHeightInFractions = (world: World) => 1 / world.aspect;

/**
 * Карта не уходит от экрана: пока она мельче экрана, стоит по центру (поля
 * поровну с двух сторон), а как только приближение сделало её больше — не
 * пускает за края, чтобы в кадре не появилась пустота.
 */
export const clampViewport = (viewport: Viewport, world: World, screen: Size): Viewport => {
  const scale = clamp(viewport.scale, MIN_SCALE, MAX_SCALE);

  const axis = (offset: number, worldSize: number, screenSize: number) => {
    const size = worldSize * scale;

    return size <= screenSize ? (screenSize - size) / 2 : clamp(offset, screenSize - size, 0);
  };

  return {
    scale,
    x: axis(viewport.x, world.width, screen.width),
    y: axis(viewport.y, world.height, screen.height),
  };
};

/** Зум в точку курсора: мировая точка под курсором обязана остаться под ним. */
export const zoomAt = (
  viewport: Viewport,
  cursor: Point,
  direction: 'in' | 'out',
  world: World,
  screen: Size,
): Viewport => {
  const scale = clamp(
    direction === 'in' ? viewport.scale * ZOOM_STEP : viewport.scale / ZOOM_STEP,
    MIN_SCALE,
    MAX_SCALE,
  );

  if (scale === viewport.scale) return viewport;

  const ratio = scale / viewport.scale;

  return clampViewport(
    {
      scale,
      x: cursor.x - (cursor.x - viewport.x) * ratio,
      y: cursor.y - (cursor.y - viewport.y) * ratio,
    },
    world,
    screen,
  );
};

export const panBy = (viewport: Viewport, delta: Point, world: World, screen: Size): Viewport =>
  clampViewport({ ...viewport, x: viewport.x + delta.x, y: viewport.y + delta.y }, world, screen);

/**
 * Токен свободно уходит за видимый край экрана, но не за границы карты: иначе
 * при сильном зуме его нельзя было бы ни найти, ни удалить. Всё в долях ширины
 * мира, поэтому нижняя граница по вертикали — не единица, а высота мира.
 */
export const clampToWorld = (position: Point, size: Size, world: World): Point => ({
  x: clamp(position.x, 0, Math.max(1 - size.width, 0)),
  y: clamp(position.y, 0, Math.max(getWorldHeightInFractions(world) - size.height, 0)),
});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Страховка от мусора в localStorage: NaN в масштабе увёл бы сцену в никуда. */
export const isViewport = (value: unknown): value is Viewport => {
  if (typeof value !== 'object' || value === null) return false;

  const { scale, x, y } = value as Partial<Viewport>;

  return isFiniteNumber(scale) && isFiniteNumber(x) && isFiniteNumber(y);
};

export const isValidAspect = (value: unknown): value is number =>
  isFiniteNumber(value) && value > 0;
