import { FC, useRef, useState } from 'react';
import { useHotkeys } from 'hooks/hotkeys';
import './CursorHalo.scss';
import { useCursorHalo } from './lib/use-cursor-halo';

export type CursorHaloVariant = 'calm' | 'rainbow';

const NEXT_VARIANT: Record<CursorHaloVariant, CursorHaloVariant> = {
  calm: 'rainbow',
  rainbow: 'calm',
};

type Props = {
  /** С какого вида ореол начинает; дальше мастер переключает его клавишей. */
  initialVariant?: CursorHaloVariant;
};

/**
 * Ореол вокруг курсора: разрастается, когда мастер быстро водит мышью из
 * стороны в сторону, и гаснет сам. Системный курсор не подменяем — по нему
 * видно режим (крестик на холсте), да и картинку больше 128px браузер под
 * курсор всё равно не возьмёт.
 */
export const CursorHalo: FC<Props> = ({ initialVariant = 'calm' }) => {
  const haloRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<CursorHaloVariant>(initialVariant);

  useCursorHalo(haloRef);
  // Смена вида перепишет className, и `is-active` слетит — но только до
  // ближайшего кадра, а он придёт сразу же, пока ореол виден.
  useHotkeys({ cursorHalo: () => setVariant((previous) => NEXT_VARIANT[previous]) });

  return <div ref={haloRef} className={`cursor-halo cursor-halo--${variant}`} aria-hidden="true" />;
};
