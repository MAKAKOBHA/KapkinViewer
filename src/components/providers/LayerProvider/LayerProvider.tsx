import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LayerContextType, LayerItem } from './types';

const INITIAL_LAYERS: LayerItem[] = [{ id: 'layer-1', name: 'Default' }];

const LayerContext = createContext<LayerContextType | null>(null);

const STORAGE_LAYERS_KEY = 'LayersList';
const STORAGE_ACTIVE_LAYER_KEY = 'ActiveLayer';

const getInitialLayers = (): LayerItem[] => {
  const rawLayers = localStorage.getItem(STORAGE_LAYERS_KEY);
  if (!rawLayers) return INITIAL_LAYERS;

  try {
    const parsed = JSON.parse(rawLayers) as LayerItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return INITIAL_LAYERS;
  }
};

const getInitalActiveId = () => {
  const raw = localStorage.getItem(STORAGE_ACTIVE_LAYER_KEY);
  if (!raw) return INITIAL_LAYERS[0].id;

  try {
    const parsed = JSON.parse(raw) as string;
    return parsed ?? INITIAL_LAYERS[0].id;
  } catch {
    return INITIAL_LAYERS[0].id;
  }
};

export const LayerProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  const [layers, setLayers] = useState<LayerItem[]>(() => getInitialLayers());
  const [activeId, setActiveId] = useState<string>(() => getInitalActiveId());
  const [isInputActive, setIsInputActive] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_LAYERS_KEY, JSON.stringify(layers));
    if (activeId) {
      localStorage.setItem(STORAGE_ACTIVE_LAYER_KEY, JSON.stringify(activeId));
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_LAYER_KEY);
    }
  }, [activeId, layers]);

  const contextValue = useMemo(
    () => ({
      isLayerModalOpen,
      setIsLayerModalOpen,
      layers,
      setLayers,
      activeId,
      setActiveId,
      isInputActive,
      setIsInputActive,
    }),
    [isLayerModalOpen, layers, activeId, isInputActive],
  );

  return <LayerContext.Provider value={contextValue}>{children}</LayerContext.Provider>;
};

export const useLayerContext = () => {
  const context = useContext(LayerContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
