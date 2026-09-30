import { describe, expect, it, vi } from 'vitest';
import { getWorldBox } from 'components/DragAndDrop/viewport';
import { isStroke, renderDrawing, Stroke } from './render-drawing';

const WORLD = getWorldBox(2, { width: 1000, height: 800 });

const makeStroke = (overrides: Partial<Stroke> = {}): Stroke => ({
  tool: 'brush',
  color: '#00ff00',
  size: 0.02,
  opacity: 100,
  points: [
    { x: 0.25, y: 0.1 },
    { x: 0.75, y: 0.1 },
  ],
  ...overrides,
});

/**
 * Поддельный контекст: запоминает трансформацию и переводит точки штриха в
 * экранные координаты ровно так же, как это сделал бы браузер. По ним и
 * проверяем, что пометка легла на нужное место карты.
 */
const makeContext = () => {
  const matrix = { scale: 1, x: 0, y: 0 };
  const points: { x: number; y: number }[] = [];
  const state: Record<string, unknown> = {};
  // режим композиции меняется по ходу отрисовки — храним всю историю
  const composites: string[] = [];

  const toScreen = (x: number, y: number) => ({
    x: x * matrix.scale + matrix.x,
    y: y * matrix.scale + matrix.y,
  });

  const ctx = {
    canvas: { width: 1000, height: 800 },
    setTransform: (a: number, _b: number, _c: number, _d: number, e: number, f: number) => {
      matrix.scale = a;
      matrix.x = e;
      matrix.y = f;
    },
    translate: (x: number, y: number) => {
      matrix.x += x * matrix.scale;
      matrix.y += y * matrix.scale;
    },
    scale: (k: number) => {
      matrix.scale *= k;
    },
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    stroke: vi.fn(),
    moveTo: (x: number, y: number) => points.push(toScreen(x, y)),
    lineTo: (x: number, y: number) => points.push(toScreen(x, y)),
    drawImage: vi.fn(),
    set lineWidth(value: number) {
      state.lineWidth = value * matrix.scale;
    },
    set strokeStyle(value: string) {
      state.strokeStyle = value;
    },
    set globalAlpha(value: number) {
      state.globalAlpha = value;
    },
    set globalCompositeOperation(value: string) {
      composites.push(value);
    },
    set lineCap(value: string) {
      state.lineCap = value;
    },
    set lineJoin(value: string) {
      state.lineJoin = value;
    },
  } as unknown as CanvasRenderingContext2D;

  return { ctx, points, state, composites };
};

describe('renderDrawing', () => {
  it('кладёт штрих на то же место карты при любом приближении', () => {
    const стоя = makeContext();
    renderDrawing({
      ctx: стоя.ctx,
      strokes: [makeStroke()],
      viewport: { scale: 1, x: 0, y: 0 },
      world: WORLD,
      pixelRatio: 1,
    });

    // четверть и три четверти ширины карты (1000 пикселей)
    expect(стоя.points).toEqual([
      { x: 250, y: 100 },
      { x: 750, y: 100 },
    ]);

    // то же самое, но карта приближена вдвое и сдвинута
    const приближённо = makeContext();
    renderDrawing({
      ctx: приближённо.ctx,
      strokes: [makeStroke()],
      viewport: { scale: 2, x: -200, y: -50 },
      world: WORLD,
      pixelRatio: 1,
    });

    expect(приближённо.points).toEqual([
      { x: 250 * 2 - 200, y: 100 * 2 - 50 },
      { x: 750 * 2 - 200, y: 100 * 2 - 50 },
    ]);
  });

  it('учитывает плотность пикселей экрана', () => {
    const { ctx, points } = makeContext();

    renderDrawing({
      ctx,
      strokes: [makeStroke({ points: [{ x: 0.5, y: 0.25 }] })],
      viewport: { scale: 1, x: 0, y: 0 },
      world: WORLD,
      pixelRatio: 2,
    });

    expect(points[0]).toEqual({ x: 1000, y: 500 });
  });

  it('растит толщину кисти вместе с картой', () => {
    const { ctx, state } = makeContext();

    renderDrawing({
      ctx,
      strokes: [makeStroke({ size: 0.02 })],
      viewport: { scale: 3, x: 0, y: 0 },
      world: WORLD,
      pixelRatio: 1,
    });

    // 0.02 ширины карты при тройном приближении — это 60 экранных пикселей
    expect(state.lineWidth).toBeCloseTo(60);
  });

  it('стирает ластиком, а не рисует им', () => {
    const { ctx, composites } = makeContext();

    renderDrawing({
      ctx,
      strokes: [makeStroke({ tool: 'eraser' })],
      viewport: { scale: 1, x: 0, y: 0 },
      world: WORLD,
      pixelRatio: 1,
    });

    expect(composites).toContain('destination-out');
    // а после отрисовки контекст остаётся чистым для следующего кадра
    expect(composites.at(-1)).toBe('source-over');
  });

  it('кистью рисует поверх, не стирая', () => {
    const { ctx, composites } = makeContext();

    renderDrawing({
      ctx,
      strokes: [makeStroke()],
      viewport: { scale: 1, x: 0, y: 0 },
      world: WORLD,
      pixelRatio: 1,
    });

    expect(composites).not.toContain('destination-out');
  });

  it('старый рисунок-снимок растягивает на всю карту под штрихами', () => {
    const { ctx } = makeContext();
    const legacy = {} as CanvasImageSource;

    renderDrawing({
      ctx,
      strokes: [],
      legacy,
      viewport: { scale: 1, x: 0, y: 0 },
      world: WORLD,
      pixelRatio: 1,
    });

    // в координатах карты она занимает всю ширину и свою высоту
    expect(ctx.drawImage).toHaveBeenCalledWith(legacy, 0, 0, 1, 0.5);
  });

  it('переживает пустой штрих', () => {
    const { ctx, points } = makeContext();

    expect(() =>
      renderDrawing({
        ctx,
        strokes: [makeStroke({ points: [] })],
        viewport: { scale: 1, x: 0, y: 0 },
        world: WORLD,
        pixelRatio: 1,
      }),
    ).not.toThrow();
    expect(points).toEqual([]);
  });
});

describe('isStroke', () => {
  it('принимает нормальный штрих', () => {
    expect(isStroke(makeStroke())).toBe(true);
  });

  it.each([
    null,
    'штрих',
    { ...makeStroke(), tool: 'палец' },
    { ...makeStroke(), size: NaN },
    { ...makeStroke(), points: [{ x: 0.1 }] },
  ])('отвергает мусор %s', (value) => {
    expect(isStroke(value)).toBe(false);
  });
});
