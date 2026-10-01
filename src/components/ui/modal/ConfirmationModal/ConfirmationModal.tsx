import React, { useEffect, useRef } from 'react';
import './ConfirmationModal.scss';
import { Button } from 'components/ui/Button';

export interface ConfirmationModalProps {
  isOpen: boolean;
  header: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  header,
  description,
  cancelText = 'Отмена',
  confirmText = 'OK',
  onCancel,
  onConfirm,
}) => {
  // Обработчики читаются через ref: подписка не пересоздаётся на каждый рендер,
  // но замыкания всегда свежие.
  const handlersRef = useRef({ onCancel, onConfirm });
  handlersRef.current = { onCancel, onConfirm };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== 'Escape') return;

      // Подтверждение — верхнее окно, и клавиша дальше не идёт: иначе Esc
      // заодно закрыл бы панель под ним, а хоткеи сцены сработали бы сквозь.
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Enter') handlersRef.current.onConfirm();
      else handlersRef.current.onCancel();
    };

    // Погружение, а не всплытие: хоткеи слушают document, и перехватить
    // событие до них можно только раньше по пути.
    if (isOpen) document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="confirmation-modal" role="dialog" aria-modal="true" aria-label={header}>
      <div className="confirmation-modal__backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="confirmation-modal__card" role="document">
        <div className="confirmation-modal__header">{header}</div>
        {description && <div className="confirmation-modal__description">{description}</div>}
        <div className="confirmation-modal__actions">
          <Button text={cancelText} onClick={onCancel} variant="secondary" />
          <Button text={confirmText} onClick={onConfirm} variant="danger" />
        </div>
      </div>
    </div>
  );
};
