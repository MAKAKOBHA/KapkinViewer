import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LayerContextType } from './types';
import {
  getInitialActiveId,
  getInitialLayers,
  STORAGE_ACTIVE_LAYER_KEY,
  STORAGE_LAYERS_KEY,
} from './lib';

const LayerContext = createContext<LayerContextType | null>(null);

export const LayerProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  const [layers, setLayers] = useState(getInitialLayers);
  const [activeId, setActiveId] = useState(() => getInitialActiveId(layers));
  const [isInputActive, setIsInputActive] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_LAYERS_KEY, JSON.stringify(layers));
    localStorage.setItem(STORAGE_ACTIVE_LAYER_KEY, JSON.stringify(activeId));
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
    throw new Error('useLayerContext must be used within LayerProvider');
  }

  return context;
};
