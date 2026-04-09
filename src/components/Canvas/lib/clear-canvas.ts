import { MutableRefObject } from 'react';

export const clearCanvas = ({
  canvasRef,
  isDrawingRef,
  lastPointRef,
}: {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  isDrawingRef: MutableRefObject<boolean>;
  lastPointRef: MutableRefObject<{ x: number; y: number } | null>;
}) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  isDrawingRef.current = false;
  lastPointRef.current = null;
};
