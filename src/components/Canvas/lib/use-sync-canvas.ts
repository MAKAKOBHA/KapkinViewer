import { getImageBlob, putImageBlob } from 'components/DragAndDrop/storage';
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

      void putImageBlob(`${activeId}-canvas`, blob);
    }, 'image/png');
  }, [activeId]);

  useEffect(() => {
    const hydrateFromStorage = async () => {
      const blob = await getImageBlob(`${activeId}-canvas`);
      if (!blob) {
        handleClearCanvas();
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.src = url;

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url); // ✅ prevent memory leaks
      };
    };

    hydrateFromStorage();
  }, [activeId]);

  return {
    saveCanvas,
  };
};
