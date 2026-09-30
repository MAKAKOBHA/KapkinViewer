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
import { getInitialActiveId, getInitialLayers, saveLayersToStorage } from './lib';

const LayerContext = createContext<LayerContextType | null>(null);

export const LayerProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  const [layers, setLayers] = useState(getInitialLayers);
  const [activeId, setActiveId] = useState(() => getInitialActiveId(layers));
  const [isInputActive, setIsInputActive] = useState<boolean>(false);

  useEffect(() => {
    saveLayersToStorage(layers, activeId);
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
