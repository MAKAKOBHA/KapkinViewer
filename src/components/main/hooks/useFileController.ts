import { useEffect, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { DropzoneState, useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { DropzoneFile, ImageType } from '../types';
import { adjustImageSizeToViewport, adjustRenderedImageDimensions } from '../helpers';
import { useKeyPress } from './useKeyPress';

type MouseEventFunction = (e: React.MouseEvent<HTMLDivElement>, id: string) => void;

type FileControllerData = {
  files: DropzoneFile[];
  setFiles: Dispatch<SetStateAction<DropzoneFile[]>>;
  setActiveFileId: Dispatch<SetStateAction<string>>;
  isDragVisible: boolean;
  getRootProps: DropzoneState['getRootProps'];
  getInputProps: DropzoneState['getInputProps'];
  backgroundImage: string | null;
  imageType: ImageType;
  deleteImage: MouseEventFunction;
  duplicateImage: MouseEventFunction;
  isGridEnabled: boolean;
  isEidosEnabled: boolean;
  isBrushModalOpen: boolean;
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
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string>('');

  const { imageType, setImageType, isGridEnabled, isEidosEnabled, isBrushModalOpen } = useKeyPress();

  // Обработчик добавления фонового изображения
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (imageType === 'background') {
        // Если режим добавления фона активен
        const file = acceptedFiles[0];
        if (file) {
          const preview = URL.createObjectURL(file);
          setBackgroundImage(preview); // Устанавливаем фоновое изображение
          setImageType('normal');
        }
      } else {
        // Обычный режим добавления изображений
        const filePreviews = acceptedFiles.map((file) => {
          return new Promise<DropzoneFile>((resolve, reject) => {
            const img = new Image();
            const preview = URL.createObjectURL(file);

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
                id: `${file.name}-${uuidv4()}`,
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
    [imageType, setImageType],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
  });

  const deleteImage = useCallback((e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  }, []);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragVisible(true);
  };

  const onDragEnd = () => {
    setIsDragVisible(false);
  };

  const duplicateImage = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();

    if (e.button === 1) {
      const selectedFile = files.find((file) => file.id === id);

      if (!selectedFile) return;

      setFiles((prevFiles) => [
        ...prevFiles,
        { ...selectedFile, id: `${selectedFile.id.slice(0, -36)}${uuidv4()}` },
      ]);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', () => adjustRenderedImageDimensions({ setFunc: setFiles }));
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDragEnd);

    return () => {
      window.removeEventListener('resize', () =>
        adjustRenderedImageDimensions({ setFunc: setFiles }),
      );
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDragEnd);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeFileId) return;

      if (e.key === 'ArrowUp') {
        setFiles((prevFiles) => {
          return getNewFilesWithHealth(prevFiles, activeFileId, 'inc');
        });
      }
      if (e.key === 'ArrowDown') {
        setFiles((prevFiles) => {
          return getNewFilesWithHealth(prevFiles, activeFileId, 'dec');
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId]);

  return {
    files,
    setFiles,
    setActiveFileId,
    isDragVisible,
    getRootProps,
    getInputProps,
    backgroundImage,
    imageType,
    deleteImage,
    duplicateImage,
    isGridEnabled,
    isEidosEnabled,
    isBrushModalOpen,
  };
};
