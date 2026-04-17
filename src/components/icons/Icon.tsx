import './Icon.scss';
import { Accept, Brush, Cancel, Edit, Eraser, Opacity, Size, Trash } from './icons';

const icons = {
  brush: Brush,
  eraser: Eraser,
  opacity: Opacity,
  size: Size,
  trash: Trash,
  edit: Edit,
  accept: Accept,
  cancel: Cancel,
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
