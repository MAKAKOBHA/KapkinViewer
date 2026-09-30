import { Dispatch, SetStateAction } from 'react';
import { DropzoneFile } from './types';
import { clampToWorld, getWorldHeightInFractions, Size, toFraction, World } from './viewport';

/** Пропорции картинки: ширина к высоте. null — картинку не удалось прочитать. */
export const measureImageAspect = (src: string): Promise<number | null> =>
  new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * Размер новой картинки — в долях ширины мира. Целиком картинка не крупнее 80%
 * карты (боевая — во всю карту), а мелкая остаётся как есть: раздувать её до
 * пол-экрана незачем.
 */
export const adjustImageSizeToWorld = (
  width: number,
  height: number,
  isBattleImage: boolean,
  world: World,
) => {
  const resizeRatio = isBattleImage ? 1 : 0.8;

  const maxWidth = resizeRatio;
  const maxHeight = getWorldHeightInFractions(world) * resizeRatio;
  const natural = toFraction({ x: width, y: height }, world);
  const ratio = Math.min(maxWidth / natural.x, maxHeight / natural.y);

  return ratio < 1
    ? { width: natural.x * ratio, height: natural.y * ratio }
    : { width: natural.x, height: natural.y };
};

/**
 * Сцены, сохранённые до перехода на доли, лежат в пикселях того окна, в котором
 * их расставили. Размер того окна не сохранялся — берём нынешний: при тех же
 * пропорциях расстановка совпадёт точно, при других слегка поедет по вертикали.
 * Перевод разовый: дальше сцена уже в долях.
 */
export const migrateFilesToFractions = (
  files: DropzoneFile[],
  world: World,
  screen: Size,
): DropzoneFile[] =>
  files.map((file) => {
    // Обе стороны делим на ширину: иначе на экране другой формы круглый токен
    // стал бы овальным.
    const dimensions = {
      width: file.dimensions.width / screen.width,
      height: file.dimensions.height / screen.width,
    };
    // Переносим центр, а не угол: мастер ставил токен серединой на дверь, и
    // именно середина должна остаться на месте, как бы ни изменился размер.
    const center = {
      x: (file.position.x + file.dimensions.width / 2) / screen.width,
      y: (file.position.y + file.dimensions.height / 2) / screen.height / world.aspect,
    };

    return {
      ...file,
      position: { x: center.x - dimensions.width / 2, y: center.y - dimensions.height / 2 },
      dimensions,
    };
  });

/**
 * Возвращает все картинки в границы карты. Нужно, когда границы поменялись сами:
 * новый фон принёс другие пропорции, и то, что лежало у нижнего края, оказалось
 * за ним. От размера окна доли не зависят, так что ресайзу это больше не нужно.
 */
export const clampFilesToWorld = ({
  setFunc,
  world,
}: {
  setFunc: Dispatch<SetStateAction<DropzoneFile[]>>;
  world: World;
}) => {
  setFunc((prevFiles) =>
    prevFiles.map((file) => ({
      ...file,
      position: clampToWorld(file.position, file.dimensions, world),
    })),
  );
};

export const updateImageDimensions = ({
  setFunc,
  id,
  dimensions,
  world,
}: {
  setFunc: Dispatch<SetStateAction<DropzoneFile[]>>;
  id: string;
  dimensions: DropzoneFile['dimensions'];
  world: World;
}) => {
  setFunc((prevFiles) =>
    prevFiles.map((file) => {
      if (file.id === id) {
        return {
          ...file,
          dimensions,
          position: clampToWorld(file.position, dimensions, world),
        };
      }
      return file;
    }),
  );
};
