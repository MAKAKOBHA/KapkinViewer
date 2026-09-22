import { useDrawContext } from 'components/providers';
import { FC, useCallback, useLayoutEffect } from 'react';
import './Canvas.scss';
import { useSyncCanvas } from './lib/use-sync-canvas';

export const Canvas: FC = () => {
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
      const rect = canvas.getBoundingClientRect();

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    [canvasRef],
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
      if (!isCanvasEnabled) return;
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
   * Размер выставляется в layout-эффекте: он гарантированно отрабатывает раньше
   * гидрации из useSyncCanvas, иначе загруженный рисунок стёрся бы сразу после
   * появления — присвоение canvas.width очищает битмап.
   */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resizeCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      const nextWidth = Math.round(window.innerWidth * ratio);
      const nextHeight = Math.round(window.innerHeight * ratio);
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;

      const ctx = canvas.getContext('2d');
      // Снимок в аппаратных пикселях: ресайз обнуляет битмап, рисунок мастера
      // при этом терять нельзя.
      const snapshot =
        ctx && canvas.width > 0 && canvas.height > 0
          ? ctx.getImageData(0, 0, canvas.width, canvas.height)
          : null;

      canvas.width = nextWidth;
      canvas.height = nextHeight;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      if (!ctx) return;
      if (snapshot) {
        ctx.putImageData(snapshot, 0, 0);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [canvasRef]);

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
