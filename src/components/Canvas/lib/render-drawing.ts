import { Point, Viewport, World } from 'components/DragAndDrop/viewport';

export type DrawingTool = 'brush' | 'eraser';

/**
 * Штрих кистью. Хранится не картинкой, а точками — поэтому его можно
 * перерисовать под любой зум и любое разрешение экрана, и он всегда остаётся
 * чётким. Все размеры — доли ширины карты, как и у токенов: пометка принадлежит
 * месту на карте, а не месту на экране.
 */
export type Stroke = {
  tool: DrawingTool;
  color: string;
  /** Толщина в долях ширины карты: кисть растёт и уменьшается вместе с картой. */
  size: number;
  /** 0–100, как в панели кисти. */
  opacity: number;
  points: Point[];
};

export type Drawing = { version: number; strokes: Stroke[] };

export const DRAWING_VERSION = 1;

export const isStroke = (value: unknown): value is Stroke => {
  if (typeof value !== 'object' || value === null) return false;

  const { tool, color, size, opacity, points } = value as Partial<Stroke>;

  return (
    (tool === 'brush' || tool === 'eraser') &&
    typeof color === 'string' &&
    Number.isFinite(size) &&
    Number.isFinite(opacity) &&
    Array.isArray(points) &&
    points.every((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
  );
};

/**
 * Переводит контекст в координаты карты: единица — доля её ширины, начало
 * координат — левый верхний угол. После этого и точки штриха, и его толщина
 * рисуются прямо в тех числах, в которых хранятся.
 */
const applyWorldTransform = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  world: World,
  pixelRatio: number,
) => {
  const unit = world.width * viewport.scale;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(unit, unit);
};

const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
  const [first, ...rest] = stroke.points;
  if (!first) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size;

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.globalAlpha = 1;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity / 100;
  }

  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  // Один клик без движения — это точка, круглый торец её и нарисует.
  if (rest.length === 0) ctx.lineTo(first.x, first.y);
  rest.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
};

/**
 * Перерисовывает весь рисунок заново. Холст растянут на экран и не
 * трансформируется — карту к нему приводит трансформация контекста, поэтому
 * штрихи остаются чёткими на любом приближении.
 *
 * Порядок важен: сначала старый рисунок-картинка (если локация досталась от
 * версии, где рисунок хранился снимком), потом штрихи по очереди — иначе ластик
 * не смог бы стереть то, что нарисовано до него.
 */
export const renderDrawing = ({
  ctx,
  strokes,
  legacy,
  viewport,
  world,
  pixelRatio,
}: {
  ctx: CanvasRenderingContext2D;
  strokes: Stroke[];
  legacy?: CanvasImageSource | null;
  viewport: Viewport;
  world: World;
  pixelRatio: number;
}) => {
  const { canvas } = ctx;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  applyWorldTransform(ctx, viewport, world, pixelRatio);

  if (legacy) {
    ctx.drawImage(legacy, 0, 0, 1, 1 / world.aspect);
  }

  strokes.forEach((stroke) => drawStroke(ctx, stroke));

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
};
