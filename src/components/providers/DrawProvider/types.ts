import { Dispatch, SetStateAction } from 'react';

export type BrushTool = 'brush' | 'eraser' | null;
export type BrushColor = 'green' | 'red' | 'blue';

export type DrawContext = {
  activeTool: BrushTool;
  setActiveTool: Dispatch<SetStateAction<BrushTool>>;
  brushSize: number;
  setBrushSize: Dispatch<SetStateAction<number>>;
  brushOpacity: number;
  setBrushOpacity: Dispatch<SetStateAction<number>>;
  brushColor: BrushColor;
  setBrushColor: Dispatch<SetStateAction<BrushColor>>;
  handleToolToggle: (tool: BrushTool) => void;
};
