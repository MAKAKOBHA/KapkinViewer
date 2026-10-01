import { useDrawContext } from 'components/providers';
import { FC, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { getScreenSize, screenToWorld, toFraction } from 'components/DragAndDrop/viewport';
import { SceneViewport } from 'components/DragAndDrop/hooks/useSceneViewport';
import './Canvas.scss';
import { useSyncCanvas } from './lib/use-sync-canvas';
import { renderDrawing, Stroke } from './lib/render-drawing';
import { useFrameSchedule } from './lib/use-frame-schedule';

/**
 * Насколько должна уехать мышь, чтобы в штрих легла новая точка, — в долях
 * ширины карты. Делится на приближение: разглядывая комнату, мастер ведёт кистью
 * тоньше, и ломаная не должна огрубляться.
 */
const MIN_POINT_DISTANCE = 0.001;

type Props = { scene: SceneViewport };

/**
 * Рисунок поверх сцены.
 *
 * Холст растянут на экран и сам не масштабируется — карту к нему приводит
 * трансформация контекста при отрисовке. Поэтому штрихи едут и растут вместе с
 * картой, но остаются чёткими на любом приближении: каждый кадр они рисуются
 * заново из точек, а не растягиваются картинкой.
 */
export const Canvas: FC<Props> = ({ scene }) => {
  const { viewportRef, world, subscribeViewport } = scene;
  const {
    isBrushModalOpen,
    activeTool,
    brushColor,
    brushSize,
    brushOpacity,
    canvasRef,
    isDrawingRef,
    strokesRef,
    legacyDrawingRef,
    drawingVersion,
    bumpDrawing,
  } = useDrawContext();

  useSyncCanvas();
  const isCanvasEnabled = Boolean(activeTool && isBrushModalOpen);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { current } = currentStrokeRef;

    renderDrawing({
      ctx,
      strokes: current ? [...strokesRef.current, current] : strokesRef.current,
      legacy: legacyDrawingRef.current,
      viewport: viewportRef.current,
      world,
      pixelRatio: window.devicePixelRatio || 1,
    });
  }, [canvasRef, legacyDrawingRef, strokesRef, viewportRef, world]);

  const scheduleRedraw = useFrameSchedule(redraw);

  const getPoint = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) =>
      toFraction(screenToWorld({ x: event.clientX, y: event.clientY }, viewportRef.current), world),
    [viewportRef, world],
  );

  const startDrawing = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      // Ctrl + ЛКМ возит сцену — даже когда кисть в руках.
      if (!isCanvasEnabled || event.ctrlKey || !activeTool) return;
      event.preventDefault();

      isDrawingRef.current = true;
      currentStrokeRef.current = {
        tool: activeTool,
        color: brushColor,
        // Толщина тоже в долях карты: кисть растёт вместе с ней.
        size: brushSize / world.width,
        opacity: brushOpacity,
        points: [getPoint(event)],
      };
      scheduleRedraw();
    },
    [
      activeTool,
      brushColor,
      brushOpacity,
      brushSize,
      getPoint,
      isCanvasEnabled,
      isDrawingRef,
      scheduleRedraw,
      world.width,
    ],
  );

  const drawMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const stroke = currentStrokeRef.current;
      if (!isDrawingRef.current || !stroke) return;

      const point = getPoint(event);
      const last = stroke.points[stroke.points.length - 1];
      const minDistance = MIN_POINT_DISTANCE / viewportRef.current.scale;

      if (last && Math.hypot(point.x - last.x, point.y - last.y) < minDistance) return;

      stroke.points.push(point);
      scheduleRedraw();
    },
    [getPoint, isDrawingRef, scheduleRedraw, viewportRef],
  );

  const stopDrawing = useCallback(() => {
    const stroke = currentStrokeRef.current;

    isDrawingRef.current = false;
    currentStrokeRef.current = null;

    if (!stroke) return;

    strokesRef.current = [...strokesRef.current, stroke];
    // Отсюда же рисунок уходит в хранилище: за версией следит useSyncCanvas.
    bumpDrawing();
  }, [bumpDrawing, isDrawingRef, strokesRef]);

  /**
   * Битмап меряется экраном, а не картой: холст экранный. Эффект вешается на
   * размер мира, потому что тот пересчитывается ровно тогда же, когда меняется
   * окно.
   */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const screen = getScreenSize();
    const nextWidth = Math.round(screen.width * ratio);
    const nextHeight = Math.round(screen.height * ratio);

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    // Присвоение размера обнуляет битмап, но терять нечего: рисунок собирается
    // из штрихов заново.
    redraw();
  }, [canvasRef, redraw, world]);

  useEffect(() => subscribeViewport(scheduleRedraw), [scheduleRedraw, subscribeViewport]);

  useEffect(() => {
    scheduleRedraw();
  }, [drawingVersion, scheduleRedraw]);

  return (
    <canvas
      ref={canvasRef}
      className={`draw-canvas ${isCanvasEnabled ? 'is-active' : ''}`}
      onMouseDown={startDrawing}
      onMouseMove={drawMove}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
};
