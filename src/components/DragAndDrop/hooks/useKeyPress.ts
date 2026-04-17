import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { ImageType } from '../types';
import { useDrawContext, useLayerContext } from 'components/providers';

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
  const { isLayerModalOpen, setIsLayerModalOpen } = useLayerContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'pagedown') {
        setIsLayerModalOpen((p) => !p);
      }
      if (isLayerModalOpen) return;

      if (key === 'b' || key === 'и') {
        setImageType((p) => (p === 'background' ? 'normal' : 'background'));
      }
      if (key === 'l' || key === 'д') {
        setImageType((p) => (p === 'battle' ? 'normal' : 'battle'));
      }
      if (key === 'm' || key === 'ь') {
        setIsGridEnabled((p) => !p);
      }
      if (key === "'" || key === 'э') {
        setIsEidosEnabled((p) => !p);
      }
      if (key === 'd' || key === 'в') {
        setIsBrushModalOpen((p) => !p);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLayerModalOpen]);

  return {
    imageType,
    isGridEnabled,
    isEidosEnabled,
    setImageType,
  };
};
