import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useLayerContext } from 'components/providers';
import {
  FILES_VERSION,
  getImageBlob,
  loadBackgroundFromLocalStorage,
  loadFilesFromLocalStorage,
  saveBackgroundToLocalStorage,
  saveFilesToLocalStorage,
} from '../storage';
import { Background, DropzoneFile } from '../types';
import { createPreviewUrl, revokePreviewUrlsExcept } from '../preview-urls';
import { DEFAULT_BACKGROUND } from '../constants/background';
import { measureImageAspect, migrateFilesToFractions } from '../helpers';
import { DEFAULT_WORLD_ASPECT, getScreenSize, getWorldBox } from '../viewport';

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
      const { version, files: persistedFiles } = loadFilesFromLocalStorage(activeId);
      const hydratedFiles = await Promise.all(
        persistedFiles.map(async (file) => {
          if (!file.id) return null;
          const blob = await getImageBlob(file.id);
          if (!blob) return null;

          return { ...file, preview: createPreviewUrl(file.id, blob) } as DropzoneFile;
        }),
      );

      if (!isActive) return;

      const loadedFiles = hydratedFiles.filter(Boolean) as DropzoneFile[];
      const persistedBackground = loadBackgroundFromLocalStorage(activeId);
      const backgroundBlob = persistedBackground
        ? await getImageBlob(persistedBackground.id)
        : null;

      if (!isActive) return;

      let nextBackground: Background = DEFAULT_BACKGROUND;

      if (persistedBackground && backgroundBlob) {
        const image = createPreviewUrl(persistedBackground.id, backgroundBlob);
        // У сцен, сохранённых до появления мира, пропорции карты не записаны —
        // измеряем их по самой картинке.
        const aspect = persistedBackground.aspect ?? (await measureImageAspect(image));

        if (!isActive) return;

        nextBackground = { id: persistedBackground.id, image, aspect };
      }

      if (!nextBackground.id) {
        saveBackgroundToLocalStorage(null, activeId);
      }

      // Сцену из первой версии переводим в доли — по той карте, которую только
      // что собрали, иначе перевод будет считать пропорции по умолчанию.
      const screen = getScreenSize();
      const world = getWorldBox(nextBackground.aspect ?? DEFAULT_WORLD_ASPECT, screen);
      const nextFiles =
        version < FILES_VERSION ? migrateFilesToFractions(loadedFiles, world, screen) : loadedFiles;

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

    saveBackgroundToLocalStorage(
      background.id ? { id: background.id, aspect: background.aspect } : null,
      activeId,
    );
  }, [background.id, background.aspect, isSynced, activeId]);
};
