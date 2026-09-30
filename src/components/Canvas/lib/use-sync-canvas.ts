import {
  deleteImageBlob,
  getCanvasBlobKey,
  getImageBlob,
  loadDrawing,
  saveDrawing,
} from 'components/DragAndDrop/storage';
import { useDrawContext, useLayerContext } from 'components/providers';
import { useEffect, useRef } from 'react';
import { DRAWING_VERSION } from './render-drawing';

const SAVE_DEBOUNCE_MS = 200;

/** Картинка из блоба — старый рисунок-снимок, который ляжет под штрихи. */
const loadLegacyImage = (blob: Blob): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });

/**
 * Держит рисунок локации в согласии с хранилищем. Тот же инвариант, что у
 * сцены: писать можно только в ту локацию, из которой рисунок загружен, — иначе
 * при переключении локации её штрихи лягут поверх соседней.
 */
export const useSyncCanvas = () => {
  const { strokesRef, legacyDrawingRef, drawingVersion, bumpDrawing } = useDrawContext();
  const { activeId } = useLayerContext();
  const hydratedIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let isActive = true;
    hydratedIdRef.current = null;
    strokesRef.current = [];
    legacyDrawingRef.current = null;
    bumpDrawing();

    const hydrateFromStorage = async () => {
      const drawing = await loadDrawing(activeId);
      // Рисунок из старых версий: он хранился снимком холста. Новых таких не
      // появляется, но нарисованное мастером пропасть не должно.
      const legacyBlob = await getImageBlob(getCanvasBlobKey(activeId));
      const legacy = legacyBlob ? await loadLegacyImage(legacyBlob) : null;

      if (!isActive) return;

      strokesRef.current = drawing?.strokes ?? [];
      legacyDrawingRef.current = legacy;
      hydratedIdRef.current = activeId;
      bumpDrawing();
    };

    void hydrateFromStorage();

    return () => {
      isActive = false;
    };
  }, [activeId, bumpDrawing, legacyDrawingRef, strokesRef]);

  useEffect(() => {
    if (hydratedIdRef.current !== activeId) return undefined;

    window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      void saveDrawing({ version: DRAWING_VERSION, strokes: strokesRef.current }, activeId);

      // Штрихи — это весь рисунок. Раз старого снимка под ними уже нет (мастер
      // очистил холст), он не должен воскреснуть при следующей загрузке.
      if (!legacyDrawingRef.current) void deleteImageBlob(getCanvasBlobKey(activeId));
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(saveTimeoutRef.current);
  }, [activeId, drawingVersion, legacyDrawingRef, strokesRef]);
};
