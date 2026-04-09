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
import { BrushColor, BrushTool, DrawContext as DrawContextType } from './types';
import { clearCanvas } from 'components/Canvas';

const DrawContext = createContext<DrawContextType | null>(null);

export const useDrawContext = () => {
  const context = useContext(DrawContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};

export const DrawProvider: FC<PropsWithChildren> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [activeTool, setActiveTool] = useState<BrushTool>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushColor, setBrushColor] = useState<BrushColor>('green');

  const handleToolToggle = useCallback((tool: BrushTool) => {
    setActiveTool((current) => (current === tool ? null : tool));
  }, []);

  const handleClearCanvas = useCallback(
    () => clearCanvas({ canvasRef, isDrawingRef, lastPointRef }),
    [],
  );

  const contextValue = useMemo(
    () => ({
      canvasRef,
      isDrawingRef,
      lastPointRef,
      activeTool,
      setActiveTool,
      brushSize,
      setBrushSize,
      brushOpacity,
      setBrushOpacity,
      brushColor,
      setBrushColor,
      handleClearCanvas,
      handleToolToggle,
    }),
    [activeTool, brushSize, brushOpacity, brushColor, handleToolToggle],
  );

  return <DrawContext.Provider value={contextValue}>{children}</DrawContext.Provider>;
};
