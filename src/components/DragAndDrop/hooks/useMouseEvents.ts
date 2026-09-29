import { useCallback, useEffect, useRef } from 'react';
import { useRefs } from 'hooks/useRefs';
import { UseMouseEvents } from '../types';
import { updateImageDimensions } from '../helpers';
import { clampToWorld, getWorldSize, screenToWorld } from '../viewport';

const ZOOM_DELTA = 20;

export const useMouseEvents: UseMouseEvents = ({
  files,
  setFiles,
  setActiveFileId,
  viewportRef,
}) => {
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
      const moving = movingRef.current;
      if (!moving?.isMoving) return;

      // Позиции токенов живут в координатах мира, мышь — в координатах экрана.
      const point = screenToWorld({ x: e.clientX, y: e.clientY }, viewportRef.current);
      const world = getWorldSize();

      setFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id !== moving.id) return file;

          return {
            ...file,
            position: clampToWorld(
              { x: point.x - moving.offsetX, y: point.y - moving.offsetY },
              file.dimensions,
              world,
            ),
          };
        }),
      );
    },
    [setFiles, viewportRef],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, id: string) => {
      // Shift + ЛКМ возит сцену целиком — токен в этом жесте не участвует.
      if (e.shiftKey) return;

      e.stopPropagation();
      e.preventDefault();

      const img = files.find((file) => file.id === id);
      if (!img) return;

      setActiveFileId(id);
      const point = screenToWorld({ x: e.clientX, y: e.clientY }, viewportRef.current);
      const offsetX = point.x - img.position.x;
      const offsetY = point.y - img.position.y;

      movingRef.current = { id, isMoving: true, offsetX, offsetY };
      document.addEventListener('mousemove', onMouseMove);
    },
    [files, onMouseMove, setActiveFileId, viewportRef],
  );

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    movingRef.current = null;
  };

  const handleZoom = useCallback(
    (e: WheelEvent, id: string) => {
      // С Shift колесо масштабирует сцену: не глотаем событие, пусть всплывёт
      // к корню, где его ждёт useSceneViewport.
      if (e.shiftKey) return;

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -ZOOM_DELTA : ZOOM_DELTA;
      const target = files.find((f) => f.id === id);

      if (target) {
        const newWidth = target.dimensions.width + delta;
        const newHeight = newWidth * (target.dimensions.height / target.dimensions.width);
        const world = getWorldSize();

        if (newWidth > 20 && newWidth <= world.width && newHeight <= world.height) {
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
