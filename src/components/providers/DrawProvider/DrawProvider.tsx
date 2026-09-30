import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { clearCanvas } from 'components/Canvas';
import { Stroke } from 'components/Canvas/lib/render-drawing';
import { BrushColor, BrushTool, DrawContext as DrawContextType } from './types';

const DrawContext = createContext<DrawContextType | null>(null);

export const useDrawContext = () => {
  const context = useContext(DrawContext);

  if (!context) {
    throw new Error('useDrawContext must be used within DrawProvider');
  }

  return context;
};

export const DrawProvider: FC<PropsWithChildren> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<Stroke[]>([]);
  const legacyDrawingRef = useRef<HTMLImageElement | null>(null);
  const [drawingVersion, setDrawingVersion] = useState(0);
  const [activeTool, setActiveTool] = useState<BrushTool>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushColor, setBrushColor] = useState<BrushColor>('green');
  const [isBrushModalOpen, setIsBrushModalOpen] = useState(false);

  const handleToolToggle = useCallback((tool: BrushTool) => {
    setActiveTool((current) => (current === tool ? null : tool));
  }, []);

  const bumpDrawing = useCallback(() => setDrawingVersion((version) => version + 1), []);

  const handleClearCanvas = useCallback(() => {
    strokesRef.current = [];
    legacyDrawingRef.current = null;
    clearCanvas({ canvasRef, isDrawingRef });
    bumpDrawing();
  }, [bumpDrawing]);

  const contextValue = useMemo(
    () => ({
      canvasRef,
      isDrawingRef,
      strokesRef,
      legacyDrawingRef,
      drawingVersion,
      bumpDrawing,
      activeTool,
      setActiveTool,
      brushSize,
      setBrushSize,
      brushOpacity,
      setBrushOpacity,
      brushColor,
      setBrushColor,
      isBrushModalOpen,
      setIsBrushModalOpen,
      handleClearCanvas,
      handleToolToggle,
    }),
    [
      activeTool,
      bumpDrawing,
      drawingVersion,
      brushSize,
      brushOpacity,
      brushColor,
      handleToolToggle,
      handleClearCanvas,
      isBrushModalOpen,
    ],
  );

  return <DrawContext.Provider value={contextValue}>{children}</DrawContext.Provider>;
};
