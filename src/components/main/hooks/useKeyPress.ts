import { Dispatch, SetStateAction, useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'и') {
        setImageType((p) => (p === 'background' ? 'normal' : 'background'));
      }
      if (e.key === 'l' || e.key === 'д') {
        setImageType((p) => (p === 'battle' ? 'normal' : 'battle'));
      }
      if (e.key === 'm' || e.key === 'ь') {
        setIsGridEnabled((p) => !p);
      }
      if (e.key === "'" || e.key === 'э') {
        setIsEidosEnabled((p) => !p);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    imageType,
    isGridEnabled,
    isEidosEnabled,
    setImageType,
  };
};
