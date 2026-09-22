import { FC, PropsWithChildren, useLayoutEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import './DraggablePanel.scss';

const PANEL_MARGIN = 12;

type Props = PropsWithChildren<{
  /** Класс-модификатор панели: размеры и фон, специфичные для конкретного окна. */
  className?: string;
  contentClassName?: string;
  ariaLabel: string;
}>;

/**
 * Плавающее окно поверх сцены: панель кисти, список локаций и всё, что появится
 * дальше. При первом показе встаёт в правый верхний угол, дальше его двигает
 * мастер за полоску-ручку.
 */
export const DraggablePanel: FC<Props> = ({
  className = '',
  contentClassName = '',
  ariaLabel,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const hasMeasuredRef = useRef(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Ширина известна только после первой отрисовки, а перемерять уже сдвинутую
  // мастером панель нельзя — иначе она прыгнет обратно в угол.
  useLayoutEffect(() => {
    if (!panelRef.current || hasMeasuredRef.current) return;

    const { width } = panelRef.current.getBoundingClientRect();
    setPosition({
      x: Math.max(window.innerWidth - width - PANEL_MARGIN, 0),
      y: PANEL_MARGIN,
    });
    hasMeasuredRef.current = true;
  }, []);

  return (
    <Draggable
      handle=".draggable-panel__handle"
      bounds="parent"
      nodeRef={panelRef}
      position={position}
      onDrag={(_, data) => setPosition({ x: data.x, y: data.y })}
    >
      <div
        ref={panelRef}
        className={`draggable-panel ${className}`.trim()}
        role="dialog"
        aria-label={ariaLabel}
      >
        <div className="draggable-panel__handle" aria-hidden="true" />
        <div className={`draggable-panel__content ${contentClassName}`.trim()}>{children}</div>
      </div>
    </Draggable>
  );
};
