import { Dispatch, SetStateAction, useState } from 'react';
import { useDrawContext, useLayerContext } from 'components/providers';
import { useHotkeys } from 'hooks/hotkeys';
import { ImageType } from '../types';

export const useKeyPress = (): {
  imageType: ImageType;
  isGridEnabled: boolean;
  isEidosEnabled: boolean;
  setImageType: Dispatch<SetStateAction<ImageType>>;
} => {
  const [imageType, setImageType] = useState<ImageType>('normal');
  const [isGridEnabled, setIsGridEnabled] = useState(false);
  const [isEidosEnabled, setIsEidosEnabled] = useState(false);
  const { setIsBrushModalOpen } = useDrawContext();
  const { setIsLayerModalOpen } = useLayerContext();

  const toggleImageType = (type: ImageType) =>
    setImageType((current) => (current === type ? 'normal' : type));

  useHotkeys({
    layerModal: () => setIsLayerModalOpen((isOpen) => !isOpen),
    backgroundMode: () => toggleImageType('background'),
    battleMode: () => toggleImageType('battle'),
    grid: () => setIsGridEnabled((isEnabled) => !isEnabled),
    eidos: () => setIsEidosEnabled((isEnabled) => !isEnabled),
    brushModal: () => setIsBrushModalOpen((isOpen) => !isOpen),
  });

  return {
    imageType,
    isGridEnabled,
    isEidosEnabled,
    setImageType,
  };
};
