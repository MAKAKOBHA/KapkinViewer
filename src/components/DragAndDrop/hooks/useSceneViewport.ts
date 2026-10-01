import {
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLayerContext } from 'components/providers';
import { useHotkeys } from 'hooks/hotkeys';
import { loadViewportFromLocalStorage, saveViewportToLocalStorage } from '../storage';
import {
  clampViewport,
  DEFAULT_VIEWPORT,
  DEFAULT_WORLD_ASPECT,
  getScreenSize,
  getWorldBox,
  panBy,
  Viewport,
  World,
  zoomAt,
} from '../viewport';

const SAVE_DEBOUNCE_MS = 200;

export type SceneViewport = {
  viewportRef: MutableRefObject<Viewport>;
  /** Прямоугольник карты в пикселях — по нему верстается сцена. */
  world: World;
  worldRef: MutableRefObject<World>;
  setWorldAspect(aspect: number | null): void;
  /** Подписка на зум и панораму: они идут мимо React, а знать о них нужно. */
  subscribeViewport(listener: () => void): () => void;
};

/**
 * Зум, панорама и размер карты на экране.
 *
 * Зум лежит в ref и попадает прямо в CSS-переменные корня, а не в стейт:
 * колесо и перетаскивание сыплют событиями десятками в секунду, и React
 * перерисовывал бы на каждое из них всю сцену с токенами. Тот же приём, что у
 * ореола курсора. А вот размер мира — стейт: он меняется редко (ресайз окна,
 * новый фон), зато от него зависит вёрстка.
 */
export const useSceneViewport = (rootRef: RefObject<HTMLDivElement | null>): SceneViewport => {
  const { activeId } = useLayerContext();
  const viewportRef = useRef<Viewport>(DEFAULT_VIEWPORT);
  const [world, setWorld] = useState<World>(() =>
    getWorldBox(DEFAULT_WORLD_ASPECT, getScreenSize()),
  );
  const worldRef = useRef<World>(world);
  const aspectRef = useRef(DEFAULT_WORLD_ASPECT);
  // Локация, чей зум сейчас в ref. Гидрация синхронная, так что разъехаться они
  // почти не могут, но писать всё равно можно только в загруженную локацию.
  const hydratedIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const listenersRef = useRef(new Set<() => void>());

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

      // Холст рисования трансформ не читает — он перерисовывает штрихи сам.
      listenersRef.current.forEach((listener) => listener());
    },
    [rootRef],
  );

  /** Пересобирает карту под новые пропорции или новый размер окна. */
  const applyWorld = useCallback(
    (aspect: number) => {
      const screen = getScreenSize();
      const next = getWorldBox(aspect, screen);

      aspectRef.current = aspect;
      worldRef.current = next;
      setWorld(next);
      // Прежний сдвиг мог остаться за краем новой карты.
      apply(clampViewport(viewportRef.current, next, screen));
    },
    [apply],
  );

  const setWorldAspect = useCallback(
    (aspect: number | null) => applyWorld(aspect ?? DEFAULT_WORLD_ASPECT),
    [applyWorld],
  );

  const subscribeViewport = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);

    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

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

    apply(clampViewport(stored, worldRef.current, getScreenSize()));
    hydratedIdRef.current = activeId;
  }, [activeId, apply]);

  useHotkeys({
    resetViewport: () => {
      apply(clampViewport(DEFAULT_VIEWPORT, worldRef.current, getScreenSize()));
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
      if (!event.ctrlKey || isOnPanel(event.target)) return;
      event.preventDefault();

      // С зажатым модификатором трекпад отдаёт дельту по горизонтали — берём
      // ту ось, где её больше.
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) return;

      apply(
        zoomAt(
          viewportRef.current,
          { x: event.clientX, y: event.clientY },
          delta < 0 ? 'in' : 'out',
          worldRef.current,
          getScreenSize(),
        ),
      );
      save();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (!event.ctrlKey || event.button !== 0 || isOnPanel(event.target)) return;
      // Иначе браузер начнёт выделять текст и тащить картинку.
      event.preventDefault();

      let last = { x: event.clientX, y: event.clientY };
      root.classList.add('is-panning');

      const onMouseMove = (move: MouseEvent) => {
        apply(
          panBy(
            viewportRef.current,
            { x: move.clientX - last.x, y: move.clientY - last.y },
            worldRef.current,
            getScreenSize(),
          ),
        );
        last = { x: move.clientX, y: move.clientY };
      };

      // Ctrl мастер может отпустить раньше кнопки: жест заканчивает mouseup.
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        root.classList.remove('is-panning');
        save();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    // Карта вписана в окно, поэтому её размер на экране зависит от размера окна.
    // Доли, в которых хранится сцена, при этом не меняются — картинки остаются
    // там же относительно карты.
    const onResize = () => {
      applyWorld(aspectRef.current);
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
  }, [apply, applyWorld, rootRef, save]);

  // Ctrl + колесо — это ещё и браузерный зум страницы: он масштабирует вместе
  // со сценой панели и курсор, а сбрасывается только руками. Глушим его на
  // всём документе, а не только на сцене, — иначе жест над панелью локаций или
  // над кубиками всё равно растягивал бы страницу. Пинч на трекпаде приходит
  // тем же событием, поэтому попадает под то же правило.
  useEffect(() => {
    const blockBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };

    document.addEventListener('wheel', blockBrowserZoom, { passive: false });
    return () => document.removeEventListener('wheel', blockBrowserZoom);
  }, []);

  useEffect(() => () => window.clearTimeout(saveTimeoutRef.current), []);

  return { viewportRef, world, worldRef, setWorldAspect, subscribeViewport };
};
