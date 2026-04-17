import { Dispatch, SetStateAction } from 'react';
import { useRefsData } from 'hooks/useRefs';

export type ImageType = 'background' | 'battle' | 'normal';

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
};

type UseMouseEventsParams = {
  files: DropzoneFile[];
  setFiles: Dispatch<SetStateAction<DropzoneFile[]>>;
  setActiveFileId: Dispatch<SetStateAction<string>>;
};

export type UseMouseEventsData = {
  onMouseMove(e: MouseEvent): void;
  onMouseDown(e: React.MouseEvent<HTMLDivElement>, id: string): void;
  handleZoom(e: WheelEvent, id: string): void;
  onMouseUp(): void;
  setRef: useRefsData['setRef'];
};

export type UseMouseEvents = (params: UseMouseEventsParams) => UseMouseEventsData;
