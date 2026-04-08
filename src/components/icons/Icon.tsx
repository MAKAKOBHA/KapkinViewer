import './Icon.scss';
import { Brush, Eraser, Opacity, Size } from './icons';

const icons = {
  brush: Brush,
  eraser: Eraser,
  opacity: Opacity,
  size: Size,
} as const;

export type IconName = keyof typeof icons;

type IconProps = {
  icon: IconName;
};

export const Icon = ({ icon }: IconProps) => {
  const IconComponent = icons[icon];

  return (
    <span className="icon" aria-hidden="true">
      <IconComponent />
    </span>
  );
};
