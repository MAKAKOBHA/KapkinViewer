import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useLayerContext } from 'components/providers';
import {
  getImageBlob,
  loadBackgroundFromLocalStorage,
  loadFilesFromLocalStorage,
  saveBackgroundToLocalStorage,
  saveFilesToLocalStorage,
} from '../storage';
import { Background, DropzoneFile } from '../types';
import { createPreviewUrl, revokePreviewUrlsExcept } from '../preview-urls';
import { DEFAULT_BACKGROUND } from '../constants/background';

const SAVE_DEBOUNCE_MS = 100;

/**
 * Держит сцену (файлы и фон) в согласии с хранилищем активной локации.
 *
 * Ключевой инвариант: писать можно только в ту локацию, из которой сцена была
 * загружена. Между сменой `activeId` и концом гидрации в состоянии ещё лежат
 * файлы прошлой локации — сохранить их под новым ключом значит перезаписать
 * чужие данные.
 */
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
  const { activeId } = useLayerContext();
  // Локация, чьи данные сейчас лежат в состоянии. null — гидрация не завершена.
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const isSynced = hydratedId === activeId;
  const setFilesRef = useRef(setFiles);
  const setBackgroundRef = useRef(setBackground);

  setFilesRef.current = setFiles;
  setBackgroundRef.current = setBackground;

  useEffect(() => {
    if (isSynced) return undefined;

    let isActive = true;

    const hydrateFromStorage = async () => {
      const persistedFiles = loadFilesFromLocalStorage(activeId);
      const hydratedFiles = await Promise.all(
        persistedFiles.map(async (file) => {
          if (!file.id) return null;
          const blob = await getImageBlob(file.id);
          if (!blob) return null;

          return { ...file, preview: createPreviewUrl(file.id, blob) } as DropzoneFile;
        }),
      );

      if (!isActive) return;

      const nextFiles = hydratedFiles.filter(Boolean) as DropzoneFile[];
      const persistedBackgroundId = loadBackgroundFromLocalStorage(activeId);
      const backgroundBlob = persistedBackgroundId
        ? await getImageBlob(persistedBackgroundId)
        : null;

      if (!isActive) return;

      const nextBackground: Background =
        persistedBackgroundId && backgroundBlob
          ? {
              id: persistedBackgroundId,
              image: createPreviewUrl(persistedBackgroundId, backgroundBlob),
            }
          : DEFAULT_BACKGROUND;

      if (!nextBackground.id) {
        saveBackgroundToLocalStorage(null, activeId);
      }

      setFilesRef.current(nextFiles);
      setBackgroundRef.current(nextBackground);

      // Превью прошлой локации больше не нужны — иначе блобы копятся в памяти.
      revokePreviewUrlsExcept([
        ...nextFiles.map((file) => file.id),
        ...(nextBackground.id ? [nextBackground.id] : []),
      ]);

      setHydratedId(activeId);
    };

    void hydrateFromStorage();

    return () => {
      isActive = false;
    };
  }, [isSynced, activeId]);

  useEffect(() => {
    if (!isSynced) return undefined;

    const timeout = setTimeout(() => saveFilesToLocalStorage(files, activeId), SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [files, isSynced, activeId]);

  useEffect(() => {
    if (!isSynced) return;

    saveBackgroundToLocalStorage(background.id, activeId);
  }, [background.id, isSynced, activeId]);
};
