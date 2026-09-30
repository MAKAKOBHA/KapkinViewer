import { useDrawContext } from 'components/providers';
import { FC, MutableRefObject, useCallback, useLayoutEffect } from 'react';
import { Viewport, World } from 'components/DragAndDrop/viewport';
import './Canvas.scss';
import { useSyncCanvas } from './lib/use-sync-canvas';

/**
 * Холст едет и масштабируется вместе с картой, поэтому ему нужен зум сцены:
 * пометка кистью принадлежит месту на карте, а не месту на экране.
 */
type Props = { viewportRef: MutableRefObject<Viewport>; world: World };

export const Canvas: FC<Props> = ({ viewportRef, world }) => {
  const {
    isBrushModalOpen,
    activeTool,
    brushColor,
    brushSize,
    brushOpacity,
    canvasRef,
    isDrawingRef,
    lastPointRef,
  } = useDrawContext();

  const { saveCanvas } = useSyncCanvas();
  const isCanvasEnabled = Boolean(activeTool && isBrushModalOpen);

  const getCanvasPoint = useCallback(
    (event: MouseEvent | React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      // rect уже посчитан с зумом сцены, а рисуем мы в координатах холста —
      // отсюда деление на масштаб.
      const rect = canvas.getBoundingClientRect();
      const { scale } = viewportRef.current;

      return {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale,
      };
    },
    [canvasRef, viewportRef],
  );

  const drawLine = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;

      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = brushColor;
        ctx.globalAlpha = brushOpacity / 100;
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [activeTool, brushColor, brushSize, brushOpacity, canvasRef],
  );

  const startDrawing = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      // Shift + ЛКМ возит сцену — даже когда кисть в руках.
      if (!isCanvasEnabled || event.shiftKey) return;
      event.preventDefault();
      const point = getCanvasPoint(event);
      if (!point) return;
      isDrawingRef.current = true;
      lastPointRef.current = point;
    },
    [getCanvasPoint, isCanvasEnabled, isDrawingRef, lastPointRef],
  );

  const drawMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const point = getCanvasPoint(event);
      if (!point || !lastPointRef.current) return;
      drawLine(lastPointRef.current, point);
      lastPointRef.current = point;
    },
    [drawLine, getCanvasPoint, isDrawingRef, lastPointRef],
  );

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    saveCanvas();
  }, [saveCanvas, isDrawingRef, lastPointRef]);

  /**
   * Холст — это карта, поэтому его битмап меряется картой, а не окном. Размер
   * выставляется в layout-эффекте: он гарантированно отрабатывает раньше
   * гидрации из useSyncCanvas, иначе загруженный рисунок стёрся бы сразу после
   * появления — присвоение canvas.width очищает битмап.
   */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const nextWidth = Math.round(world.width * ratio);
    const nextHeight = Math.round(world.height * ratio);
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;

    const ctx = canvas.getContext('2d');
    // Карта поменяла размер на экране — вместе с ней тянется и рисунок, иначе
    // на мониторе другого разрешения пометки разъехались бы с картой.
    const snapshot = document.createElement('canvas');
    const hasSnapshot = canvas.width > 0 && canvas.height > 0;

    if (hasSnapshot) {
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
    }

    canvas.width = nextWidth;
    canvas.height = nextHeight;

    if (!ctx) return;
    if (hasSnapshot) {
      ctx.drawImage(snapshot, 0, 0, nextWidth, nextHeight);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }, [canvasRef, world]);

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
