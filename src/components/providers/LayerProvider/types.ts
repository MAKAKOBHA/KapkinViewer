import { Dispatch, SetStateAction } from 'react';

export type LayerItem = {
  id: string;
  name: string;
};

export type LayerContextType = {
  isLayerModalOpen: boolean;
  setIsLayerModalOpen: Dispatch<SetStateAction<boolean>>;
  layers: LayerItem[];
  setLayers: Dispatch<SetStateAction<LayerItem[]>>;
  activeId: string;
  setActiveId: Dispatch<SetStateAction<string>>;
  isInputActive: boolean;
  setIsInputActive: Dispatch<SetStateAction<boolean>>;
};
