import { useDrawContext } from 'components/providers';
import { FC, useCallback, useEffect } from 'react';
import './Canvas.scss';

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

  const isCanvasEnabled = Boolean(activeTool && isBrushModalOpen);

  const getCanvasPoint = useCallback((event: MouseEvent | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

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
    [activeTool, brushColor, brushSize, brushOpacity],
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
    [getCanvasPoint, isCanvasEnabled],
  );

  const drawMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const point = getCanvasPoint(event);
      if (!point || !lastPointRef.current) return;
      drawLine(lastPointRef.current, point);
      lastPointRef.current = point;
    },
    [drawLine, getCanvasPoint],
  );

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

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
