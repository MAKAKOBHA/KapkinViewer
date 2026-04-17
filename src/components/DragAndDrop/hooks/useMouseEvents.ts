import { useCallback, useEffect, useRef } from 'react';
import { useRefs } from 'hooks/useRefs';
import { UseMouseEvents } from '../types';
import { updateImageDimensions } from '../helpers';

const ZOOM_DELTA = 20;

export const useMouseEvents: UseMouseEvents = ({ files, setFiles, setActiveFileId }) => {
  const movingRef = useRef<{
    id: string;
    isMoving: boolean;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const wheelHandlerRefs = useRef(new Map());

  const { refsByKey, setRef } = useRefs();

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!movingRef.current?.isMoving) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      setFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id === movingRef.current?.id) {
            const newX = Math.min(
              Math.max(e.clientX - movingRef.current.offsetX, 0),
              viewportWidth - file.dimensions.width,
            );
            const newY = Math.min(
              Math.max(e.clientY - movingRef.current.offsetY, 0),
              viewportHeight - file.dimensions.height,
            );

            return {
              ...file,
              position: { x: newX, y: newY },
            };
          }
          return file;
        }),
      );
    },
    [setFiles],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, id: string) => {
      e.stopPropagation();
      e.preventDefault();

      const img = files.find((file) => file.id === id);
      if (!img) return;

      setActiveFileId(id);
      const offsetX = e.clientX - img.position.x;
      const offsetY = e.clientY - img.position.y;

      movingRef.current = { id, isMoving: true, offsetX, offsetY };
      document.addEventListener('mousemove', onMouseMove);
    },
    [files, onMouseMove, setActiveFileId],
  );

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    movingRef.current = null;
  };

  const handleZoom = useCallback(
    (e: WheelEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -ZOOM_DELTA : ZOOM_DELTA;
      const target = files.find((f) => f.id === id);

      if (target) {
        const newWidth = target.dimensions.width + delta;
        const newHeight = newWidth * (target.dimensions.height / target.dimensions.width);

        if (newWidth > 20 && newWidth <= window.innerWidth && newHeight <= window.innerHeight) {
          updateImageDimensions({
            id,
            dimensions: { height: newHeight, width: newWidth },
            setFunc: setFiles,
          });
        }
      }
    },
    [files, setFiles],
  );

  useEffect(() => {
    const currentHandlerRefs = wheelHandlerRefs.current;

    Object.entries(refsByKey).forEach(([id, imgContainerRef]) => {
      if (imgContainerRef) {
        const wrappedHandler = (e: WheelEvent) => handleZoom(e, id);
        currentHandlerRefs.set(id, wrappedHandler);

        imgContainerRef.addEventListener('wheel', wrappedHandler, { passive: false });
      }
    });

    return () => {
      Object.entries(refsByKey).forEach(([id, imgContainerRef]) => {
        if (imgContainerRef) {
          const wrappedHandler = currentHandlerRefs.get(id);
          if (wrappedHandler) {
            imgContainerRef.removeEventListener('wheel', wrappedHandler);
            currentHandlerRefs.delete(id);
          }
        }
      });
    };
  }, [files.length, refsByKey, handleZoom]);

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    onMouseMove,
    onMouseDown,
    onMouseUp,
    handleZoom,
    setRef,
  };
};
