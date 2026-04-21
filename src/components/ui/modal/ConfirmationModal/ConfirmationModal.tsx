import React from 'react';
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
