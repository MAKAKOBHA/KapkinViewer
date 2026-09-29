import { Dispatch, SetStateAction } from 'react';
import { DropzoneFile } from './types';
import { getWorldSize } from './viewport';

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
      const imgElement = document.querySelector<HTMLImageElement>(
        `img[data-image-id="${file.id}"]`,
      );

      if (!imgElement) {
        return file;
      }

      const { offsetWidth, offsetHeight } = imgElement;

      if (isInitialAdjustment) {
        newDimensions = { width: offsetWidth, height: offsetHeight };
      }

      if (!isInitialAdjustment) {
        // Границы мира, а не видимого экрана: уехать за край экрана токену
        // теперь можно, за край карты — нет.
        const world = getWorldSize();

        const newX =
          file.position.x + offsetWidth >= world.width
            ? world.width - offsetWidth
            : file.position.x;

        const newY =
          file.position.y + offsetHeight >= world.height
            ? world.height - offsetHeight
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
