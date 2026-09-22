import { useEffect, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { DropzoneState, useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { useHotkeys } from 'hooks/hotkeys';
import { Background, DropzoneFile, ImageType } from '../types';
import { adjustImageSizeToViewport, adjustRenderedImageDimensions } from '../helpers';
import { useKeyPress } from './useKeyPress';
import { deleteImageBlob, getImageBlob, putImageBlob } from '../storage';
import { DEFAULT_BACKGROUND } from '../constants/background';
import { useSyncFilesWithStorage } from './useSyncFilesWithStorage';
import { createPreviewUrl, revokePreviewUrl } from '../preview-urls';

type MouseEventFunction = (e: React.MouseEvent<HTMLDivElement>, id: string) => void;

type FileControllerData = {
  files: DropzoneFile[];
  setFiles: Dispatch<SetStateAction<DropzoneFile[]>>;
  setActiveFileId: Dispatch<SetStateAction<string>>;
  isDragVisible: boolean;
  getRootProps: DropzoneState['getRootProps'];
  getInputProps: DropzoneState['getInputProps'];
  background: Background;
  imageType: ImageType;
  deleteImage: MouseEventFunction;
  duplicateImage: MouseEventFunction;
  isGridEnabled: boolean;
  isEidosEnabled: boolean;
};

const getNewFilesWithHealth = (
  prevFiles: DropzoneFile[],
  activeFileId: string,
  type: 'inc' | 'dec',
): DropzoneFile[] => {
  const newFiles = [...prevFiles];
  const activeFileIndex = prevFiles.findIndex((file) => file.id === activeFileId);
  if (activeFileIndex === -1) return newFiles;

  let fileHealth = newFiles[activeFileIndex].health ?? 0;

  if (type === 'inc') {
    fileHealth += 1;
  } else if (fileHealth >= 0) {
    fileHealth -= 1;
  }

  newFiles[activeFileIndex] = {
    ...newFiles[activeFileIndex],
    health: fileHealth,
  };

  return newFiles;
};

export const useFileController = (): FileControllerData => {
  const [files, setFiles] = useState<DropzoneFile[]>([]);
  const [isDragVisible, setIsDragVisible] = useState(false);
  const [background, setBackground] = useState<Background>(DEFAULT_BACKGROUND);
  const [activeFileId, setActiveFileId] = useState<string>('');

  useSyncFilesWithStorage({ files, setFiles, background, setBackground });
  const { imageType, setImageType, isGridEnabled, isEidosEnabled } = useKeyPress();

  // Обработчик добавления фонового изображения
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (imageType === 'background') {
        // Если режим добавления фона активен
        const file = acceptedFiles[0];
        if (file) {
          const newId = `background-${uuidv4()}`;
          const preview = createPreviewUrl(newId, file);
          void putImageBlob(newId, file);
          if (background.id) {
            revokePreviewUrl(background.id);
            void deleteImageBlob(background.id);
          }
          setBackground({ id: newId, image: preview }); // Устанавливаем фоновое изображение
          setImageType('normal');
        }
      } else {
        // Обычный режим добавления изображений
        const filePreviews = acceptedFiles.map((file) => {
          return new Promise<DropzoneFile>((resolve, reject) => {
            const img = new Image();
            const id = `${file.name}-${uuidv4()}`;
            const preview = createPreviewUrl(id, file);

            void putImageBlob(id, file);

            img.onload = () => {
              const isBattleImage = imageType === 'battle';
              const originalWidth = img.naturalWidth;
              const originalHeight = img.naturalHeight;
              const adjustedImage = adjustImageSizeToViewport(
                originalWidth,
                originalHeight,
                isBattleImage,
              );

              resolve({
                id,
                preview,
                name: file.name,
                position: {
                  x: window.innerWidth / 2 - adjustedImage.width / 2,
                  y: window.innerHeight / 2 - adjustedImage.height / 2,
                },
                dimensions: adjustedImage,
                imageType,
              });
            };

            img.onerror = (error) => {
              // eslint-disable-next-line no-console
              console.error(`Error loading image: ${file.name}`, error);
              reject(new Error(`Failed to load image preview for: ${file.name}`));
            };

            img.src = preview;
          });
        });

        Promise.all(filePreviews).then((newFiles) => {
          setFiles((prevFiles) => [...prevFiles, ...newFiles]);
          if (imageType === 'battle') {
            setImageType('normal');
          } else {
            setActiveFileId(newFiles.at(-1)?.id ?? '');
          }
        });
      }
    },
    [background.id, imageType, setImageType],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
  });

  const deleteImage = useCallback((e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    setFiles((prevFiles) => {
      const fileToDelete = prevFiles.find((file) => file.id === id);
      if (fileToDelete) {
        revokePreviewUrl(fileToDelete.id);
        void deleteImageBlob(fileToDelete.id);
      }
      return prevFiles.filter((file) => file.id !== id);
    });
  }, []);

  const duplicateImage = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();

    if (e.button === 1) {
      const selectedFile = files.find((file) => file.id === id);

      if (!selectedFile) return;

      const newId = `${selectedFile.name}-${uuidv4()}`;

      setFiles((prevFiles) => [...prevFiles, { ...selectedFile, id: newId }]);

      void (async () => {
        const blob = await getImageBlob(selectedFile.id);
        if (!blob) return;

        await putImageBlob(newId, blob);
        // У копии свой object URL: иначе удаление оригинала погасило бы её превью.
        const preview = createPreviewUrl(newId, blob);
        setFiles((prevFiles) =>
          prevFiles.map((file) => (file.id === newId ? { ...file, preview } : file)),
        );
      })();
    }
  };

  useEffect(() => {
    const handleResize = () => adjustRenderedImageDimensions({ setFunc: setFiles });
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragVisible(true);
    };
    const handleDragEnd = () => setIsDragVisible(false);

    window.addEventListener('resize', handleResize);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, []);

  const changeActiveFileHealth = (type: 'inc' | 'dec') => {
    if (!activeFileId) return;

    setFiles((prevFiles) => getNewFilesWithHealth(prevFiles, activeFileId, type));
  };

  useHotkeys({
    healthUp: () => changeActiveFileHealth('inc'),
    healthDown: () => changeActiveFileHealth('dec'),
  });

  return {
    files,
    setFiles,
    setActiveFileId,
    isDragVisible,
    getRootProps,
    getInputProps,
    background,
    imageType,
    deleteImage,
    duplicateImage,
    isGridEnabled,
    isEidosEnabled,
  };
};
