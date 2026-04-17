import { Dispatch, SetStateAction } from 'react';
import { DropzoneFile } from './types';

export const adjustImageSizeToViewport = (
  width: number,
  height: number,
  isBattleImage: boolean,
) => {
  const resizeRatio = isBattleImage ? 1 : 0.8;

  const maxWidth = window.innerWidth * resizeRatio;
  const maxHeight = window.innerHeight * resizeRatio;
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return ratio < 1 ? { width: width * ratio, height: height * ratio } : { width, height };
};

export const adjustRenderedImageDimensions = ({
  isInitialAdjustment,
  setFunc,
}: {
  isInitialAdjustment?: boolean;
  setFunc: Dispatch<SetStateAction<DropzoneFile[]>>;
}) => {
  setFunc((prevFiles) =>
    prevFiles.map((file) => {
      let newDimensions;
      let newPosition;
      const imgElement = document.querySelector(
        `img[data-image-id="${file.id}"]`,
      ) as HTMLImageElement;
      const { offsetWidth, offsetHeight } = imgElement;

      if (!imgElement) {
        return file;
      }

      if (isInitialAdjustment) {
        newDimensions = { width: offsetWidth, height: offsetHeight };
      }

      if (!isInitialAdjustment) {
        const newX =
          file.position.x + offsetWidth >= window.innerWidth
            ? window.innerWidth - file.dimensions.width
            : file.position.x;

        const newY =
          file.position.y + offsetHeight >= window.innerHeight
            ? window.innerHeight - offsetHeight
            : file.position.y;

        newPosition = { x: newX, y: newY };
      }

      return {
        ...file,
        ...(newDimensions && { dimensions: newDimensions }),
        ...(newPosition && { position: newPosition }),
      };
    }),
  );
};

export const updateImageDimensions = ({
  setFunc,
  id,
  dimensions,
}: {
  setFunc: Dispatch<SetStateAction<DropzoneFile[]>>;
  id: string;
  dimensions: DropzoneFile['dimensions'];
}) => {
  setFunc((prevFiles) =>
    prevFiles.map((file) => {
      if (file.id === id) {
        return {
          ...file,
          dimensions,
        };
      }
      return file;
    }),
  );

  adjustRenderedImageDimensions({ setFunc });
};
