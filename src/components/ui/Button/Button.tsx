import React from 'react';
import './Button.scss';

export type ButtonVariant = 'main' | 'secondary' | 'success' | 'danger';

export interface ButtonProps {
  text: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonVariant;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  text,
  onClick,
  variant = 'main',
  type = 'button',
  disabled = false,
}) => (
  <button
    type={type}
    className={`ui-button ui-button--${variant}`}
    onClick={onClick}
    disabled={disabled}
  >
    {text}
  </button>
);
