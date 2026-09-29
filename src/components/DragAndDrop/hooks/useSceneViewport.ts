import {
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import { useLayerContext } from 'components/providers';
import { useHotkeys } from 'hooks/hotkeys';
import { loadViewportFromLocalStorage, saveViewportToLocalStorage } from '../storage';
import {
  clampViewport,
  DEFAULT_VIEWPORT,
  getWorldSize,
  panBy,
  Viewport,
  zoomAt,
} from '../viewport';

const SAVE_DEBOUNCE_MS = 200;

/**
 * Зум и панорама сцены: Shift + колесо приближает в точку курсора, Shift + ЛКМ
 * возит карту, `Z` возвращает её целиком.
 *
 * Значение лежит в ref и попадает прямо в CSS-переменные корня, а не в стейт:
 * колесо и перетаскивание сыплют событиями десятками в секунду, и React
 * перерисовывал бы на каждое из них всю сцену с токенами. Тот же приём, что у
 * ореола курсора.
 */
export const useSceneViewport = (
  rootRef: RefObject<HTMLDivElement | null>,
): MutableRefObject<Viewport> => {
  const { activeId } = useLayerContext();
  const viewportRef = useRef<Viewport>(DEFAULT_VIEWPORT);
  // Локация, чей зум сейчас в ref. Гидрация синхронная, так что разъехаться они
  // почти не могут, но писать всё равно можно только в загруженную локацию.
  const hydratedIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | undefined>(undefined);

  const apply = useCallback(
    (viewport: Viewport) => {
      viewportRef.current = viewport;

      const root = rootRef.current;
      if (!root) return;

      // Обе трансформируемые обёртки читают эти переменные: так у фона и токенов
      // гарантированно один и тот же трансформ, без расхождения на субпиксель.
      root.style.setProperty('--scene-scale', `${viewport.scale}`);
      root.style.setProperty('--scene-x', `${viewport.x}px`);
      root.style.setProperty('--scene-y', `${viewport.y}px`);
    },
    [rootRef],
  );

  const save = useCallback(() => {
    window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      if (hydratedIdRef.current !== activeId) return;

      saveViewportToLocalStorage(viewportRef.current, activeId);
    }, SAVE_DEBOUNCE_MS);
  }, [activeId]);

  // Зум локации — часть её сцены, поэтому подменяется вместе с ней. В
  // layout-эффекте, чтобы мастер не увидел кадр с приближением прошлой локации.
  useLayoutEffect(() => {
    const stored = loadViewportFromLocalStorage(activeId) ?? DEFAULT_VIEWPORT;

    apply(clampViewport(stored, getWorldSize()));
    hydratedIdRef.current = activeId;
  }, [activeId, apply]);

  useHotkeys({
    resetViewport: () => {
      apply(DEFAULT_VIEWPORT);
      save();
    },
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    // Жест, начатый на плавающей панели, принадлежит панели.
    const isOnPanel = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('.draggable-panel'));

    const onWheel = (event: WheelEvent) => {
      if (!event.shiftKey || isOnPanel(event.target)) return;
      // Иначе Shift + колесо уйдёт в горизонтальный скролл страницы.
      event.preventDefault();

      // С зажатым Shift трекпад отдаёт дельту по горизонтали — берём ту ось,
      // где её больше.
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) return;

      apply(
        zoomAt(
          viewportRef.current,
          { x: event.clientX, y: event.clientY },
          delta < 0 ? 'in' : 'out',
          getWorldSize(),
        ),
      );
      save();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (!event.shiftKey || event.button !== 0 || isOnPanel(event.target)) return;
      // Иначе браузер начнёт выделять текст и тащить картинку.
      event.preventDefault();

      let last = { x: event.clientX, y: event.clientY };
      root.classList.add('is-panning');

      const onMouseMove = (move: MouseEvent) => {
        apply(
          panBy(
            viewportRef.current,
            { x: move.clientX - last.x, y: move.clientY - last.y },
            getWorldSize(),
          ),
        );
        last = { x: move.clientX, y: move.clientY };
      };

      // Shift мастер может отпустить раньше кнопки: жест заканчивает mouseup.
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        root.classList.remove('is-panning');
        save();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    // Размер окна задаёт размер мира: после ресайза прежний сдвиг может открыть
    // пустоту за краем карты.
    const onResize = () => {
      apply(clampViewport(viewportRef.current, getWorldSize()));
      save();
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onResize);

    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onResize);
    };
  }, [apply, rootRef, save]);

  useEffect(() => () => window.clearTimeout(saveTimeoutRef.current), []);

  return viewportRef;
};
