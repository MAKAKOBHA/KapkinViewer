import { getCanvasBlobKey, getImageBlob, putImageBlob } from 'components/DragAndDrop/storage';
import { useDrawContext, useLayerContext } from 'components/providers';
import { useCallback, useEffect } from 'react';

export const useSyncCanvas = () => {
  const { canvasRef, handleClearCanvas } = useDrawContext();
  const { activeId } = useLayerContext();

  const saveCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      void putImageBlob(getCanvasBlobKey(activeId), blob);
    }, 'image/png');
  }, [activeId, canvasRef]);

  useEffect(() => {
    const hydrateFromStorage = async () => {
      handleClearCanvas();
      const blob = await getImageBlob(getCanvasBlobKey(activeId));
      if (!blob) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.src = url;

      img.onload = () => {
        // Снимок сохранён в аппаратных пикселях, а у контекста уже стоит
        // масштаб devicePixelRatio — рисуем 1:1, сбросив трансформацию,
        // иначе на экранах с масштабом рисунок раздувается.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        URL.revokeObjectURL(url);
      };
    };

    void hydrateFromStorage();
  }, [activeId, canvasRef, handleClearCanvas]);

  return {
    saveCanvas,
  };
};
