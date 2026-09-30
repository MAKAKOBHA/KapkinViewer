import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Stroke } from 'components/Canvas/lib/render-drawing';

export type BrushTool = 'brush' | 'eraser' | null;
export type BrushColor = 'green' | 'red' | 'blue';

export type DrawContext = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  isDrawingRef: MutableRefObject<boolean>;
  /** Рисунок локации: штрихи в долях ширины карты. */
  strokesRef: MutableRefObject<Stroke[]>;
  /** Рисунок из старых версий — картинка, которая лежит под штрихами. */
  legacyDrawingRef: MutableRefObject<HTMLImageElement | null>;
  /**
   * Растёт при каждом изменении рисунка. По нему холст перерисовывается, а
   * `useSyncCanvas` понимает, что пора сохранять.
   */
  drawingVersion: number;
  bumpDrawing(): void;
  activeTool: BrushTool;
  setActiveTool: Dispatch<SetStateAction<BrushTool>>;
  brushSize: number;
  setBrushSize: Dispatch<SetStateAction<number>>;
  brushOpacity: number;
  setBrushOpacity: Dispatch<SetStateAction<number>>;
  isBrushModalOpen: boolean;
  setIsBrushModalOpen: Dispatch<SetStateAction<boolean>>;
  brushColor: BrushColor;
  setBrushColor: Dispatch<SetStateAction<BrushColor>>;
  handleToolToggle: (tool: BrushTool) => void;
  handleClearCanvas: () => void;
};
