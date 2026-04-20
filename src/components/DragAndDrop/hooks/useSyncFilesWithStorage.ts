import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  getImageBlob,
  loadBackgroundFromLocalStorage,
  loadFilesFromLocalStorage,
  saveBackgroundToLocalStorage,
  saveFilesToLocalStorage,
} from '../storage';
import { Background, DropzoneFile } from '../types';
import { DEFAULT_BACKGROUND } from '../constants/background';
import { useLayerContext } from 'components/providers';

export const useSyncFilesWithStorage = ({
  files,
  setFiles,
  background,
  setBackground,
}: {
  files: DropzoneFile[];
  setFiles: Dispatch<SetStateAction<DropzoneFile[]>>;
  background: Background;
  setBackground: Dispatch<SetStateAction<Background>>;
}) => {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { activeId } = useLayerContext();

  useEffect(() => {
    setHasHydrated(false);
  }, [activeId]);

  useEffect(() => {
    if (hasHydrated) return;
    let isActive = true;

    const hydrateFromStorage = async () => {
      const persistedFiles = loadFilesFromLocalStorage(activeId);
      const hydratedFiles = await Promise.all(
        persistedFiles.map(async (file) => {
          if (!file.id) return null;
          const blob = await getImageBlob(file.id);
          if (!blob) return null;
          const preview = URL.createObjectURL(blob);
          return {
            ...file,
            preview,
          } as DropzoneFile;
        }),
      );

      if (!isActive) return;

      setFiles(hydratedFiles.filter(Boolean) as DropzoneFile[]);

      const persistedBackgroundId = loadBackgroundFromLocalStorage(activeId);
      if (persistedBackgroundId) {
        const blob = await getImageBlob(persistedBackgroundId);
        if (!isActive) return;

        if (blob) {
          const preview = URL.createObjectURL(blob);
          setBackground({ id: persistedBackgroundId, image: preview });
        } else {
          setBackground(DEFAULT_BACKGROUND);
          saveBackgroundToLocalStorage(null, activeId);
        }
      } else {
        setBackground(DEFAULT_BACKGROUND);
        saveBackgroundToLocalStorage(null, activeId);
      }

      setHasHydrated(true);
    };

    void hydrateFromStorage();

    return () => {
      isActive = false;
    };
  }, [hasHydrated, activeId]);

  useEffect(() => {
    if (!hasHydrated) return;

    const timeout = setTimeout(() => {
      saveFilesToLocalStorage(files, activeId);
    }, 100);

    return () => clearTimeout(timeout);
  }, [files, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (background.id) {
      saveBackgroundToLocalStorage(background.id, activeId);
      return;
    }

    saveBackgroundToLocalStorage(null, activeId);
  }, [background.id, hasHydrated]);
};
