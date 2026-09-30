import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useRefsData } from 'hooks/useRefs';
import { Viewport, World } from './viewport';

export type ImageType = 'background' | 'battle' | 'normal';

/**
 * Картинка на сцене. `position` и `dimensions` — **доли ширины мира**, обе оси
 * меряются одной и той же шириной (см. `viewport.ts`). В пикселях они
 * превращаются только при отрисовке, поэтому сцена переживает и смену
 * разрешения, и переезд на монитор с другими пропорциями.
 */
export type DropzoneFile = {
  id: string;
  preview: string;
  name: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  imageType?: ImageType;
  health?: number;
};

export type Background = {
  id: string | null;
  image: string | null;
  /** Пропорции карты: из них собирается мир. null — ещё не измерены. */
  aspect: number | null;
};

/** Что о фоне лежит в localStorage. */
export type StoredBackground = { id: string; aspect: number | null };

type UseMouseEventsParams = {
  files: DropzoneFile[];
  setFiles: Dispatch<SetStateAction<DropzoneFile[]>>;
  setActiveFileId: Dispatch<SetStateAction<string>>;
  viewportRef: MutableRefObject<Viewport>;
  worldRef: MutableRefObject<World>;
};

export type UseMouseEventsData = {
  onMouseMove(e: MouseEvent): void;
  onMouseDown(e: React.MouseEvent<HTMLDivElement>, id: string): void;
  handleZoom(e: WheelEvent, id: string): void;
  onMouseUp(): void;
  setRef: useRefsData['setRef'];
};

export type UseMouseEvents = (params: UseMouseEventsParams) => UseMouseEventsData;
