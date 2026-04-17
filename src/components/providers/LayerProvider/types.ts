import { Dispatch, MutableRefObject, SetStateAction } from 'react';

export type LayerItem = {
  id: string;
  name: string;
};

export type LayerContextType = {
  isLayerModalOpen: boolean;
  setIsLayerModalOpen: Dispatch<SetStateAction<boolean>>;
  layers: LayerItem[];
  setLayers: Dispatch<SetStateAction<LayerItem[]>>;
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  idCounterRef: MutableRefObject<number>;
};
