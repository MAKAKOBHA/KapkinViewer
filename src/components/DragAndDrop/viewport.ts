/**
 * Зум и панорама сцены живут здесь — одной чистой математикой, без DOM.
 *
 * Есть два пространства координат. **Мир** — координаты карты: в них лежат
 * `position` и `dimensions` картинок, а фон занимает прямоугольник от (0, 0) до
 * (`world.width`, `world.height`). **Экран** — то, что даёт мышь. Связь между
 * ними — `Viewport`:
 *
 *     screen = world * scale + offset
 *
 * Пока `scale === 1` и сдвига нет, мир совпадает с экраном — поэтому сцены,
 * сохранённые до появления зума, читаются без миграции.
 */

export type Viewport = { scale: number; x: number; y: number };
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export const DEFAULT_VIEWPORT: Viewport = { scale: 1, x: 0, y: 0 };

/** Меньше единицы нельзя: фон обязан накрывать экран целиком. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
/** Шаг зума — множитель, а не слагаемое: иначе у краёв диапазона колесо ведёт себя неровно. */
export const ZOOM_STEP = 1.15;

/**
 * Размер мира. Сейчас мир равен окну: фон растянут на всю сцену, а координаты
 * картинок — пиксели того окна, в котором их положили. Отсюда же растёт
 * зависимость от разрешения экрана — когда мир поедет на доли от пропорций
 * фона, менять придётся только эту функцию.
 */
export const getWorldSize = (): Size => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const screenToWorld = (point: Point, { scale, x, y }: Viewport): Point => ({
  x: (point.x - x) / scale,
  y: (point.y - y) / scale,
});

export const worldToScreen = (point: Point, { scale, x, y }: Viewport): Point => ({
  x: point.x * scale + x,
  y: point.y * scale + y,
});

/**
 * Держит фон накрывающим экран: масштаб не меньше единицы, а сдвиг не открывает
 * пустоту за краем карты. При `scale === 1` сдвиг всегда нулевой — двигать
 * нечего. Экран здесь равен миру (см. `getWorldSize`).
 */
export const clampViewport = (viewport: Viewport, world: Size): Viewport => {
  const scale = clamp(viewport.scale, MIN_SCALE, MAX_SCALE);

  return {
    scale,
    x: clamp(viewport.x, world.width * (1 - scale), 0),
    y: clamp(viewport.y, world.height * (1 - scale), 0),
  };
};

/** Зум в точку курсора: мировая точка под курсором обязана остаться под ним. */
export const zoomAt = (
  viewport: Viewport,
  cursor: Point,
  direction: 'in' | 'out',
  world: Size,
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
  );
};

export const panBy = (viewport: Viewport, delta: Point, world: Size): Viewport =>
  clampViewport({ ...viewport, x: viewport.x + delta.x, y: viewport.y + delta.y }, world);

/**
 * Токен свободно уходит за видимый край экрана, но не за границы мира: иначе при
 * сильном зуме его нельзя было бы ни найти, ни удалить. Картинку, которая больше
 * мира, прижимаем к началу координат.
 */
export const clampToWorld = (position: Point, size: Size, world: Size): Point => ({
  x: clamp(position.x, 0, Math.max(world.width - size.width, 0)),
  y: clamp(position.y, 0, Math.max(world.height - size.height, 0)),
});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Страховка от мусора в localStorage: NaN в масштабе увёл бы сцену в никуда. */
export const isViewport = (value: unknown): value is Viewport => {
  if (typeof value !== 'object' || value === null) return false;

  const { scale, x, y } = value as Partial<Viewport>;

  return isFiniteNumber(scale) && isFiniteNumber(x) && isFiniteNumber(y);
};
