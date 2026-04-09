import { Dispatch, MutableRefObject, SetStateAction } from 'react';

export type BrushTool = 'brush' | 'eraser' | null;
export type BrushColor = 'green' | 'red' | 'blue';

export type DrawContext = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  isDrawingRef: MutableRefObject<boolean>;
  lastPointRef: MutableRefObject<{ x: number; y: number } | null>;
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
