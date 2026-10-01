import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationModal } from './ConfirmationModal';

const press = (key: string) => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
};

const renderModal = (isOpen = true) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmationModal
      isOpen={isOpen}
      header="Удаление локации"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );

  return { onConfirm, onCancel };
};

describe('ConfirmationModal', () => {
  it('подтверждает по Enter', () => {
    const { onConfirm, onCancel } = renderModal();

    press('Enter');

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('отменяет по Esc', () => {
    const { onConfirm, onCancel } = renderModal();

    press('Escape');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('молчит на чужую клавишу', () => {
    const { onConfirm, onCancel } = renderModal();

    press('b');

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('не слушает клавиши, пока закрыто', () => {
    const { onConfirm, onCancel } = renderModal(false);

    press('Enter');
    press('Escape');

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('не пускает клавишу к хоткеям под собой', () => {
    const scene = vi.fn();
    document.addEventListener('keydown', scene);
    renderModal();

    const event = press('Escape');

    expect(scene).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    document.removeEventListener('keydown', scene);
  });

  it('снимает слушатель при размонтировании', () => {
    const onConfirm = vi.fn();
    const view = render(
      <ConfirmationModal
        isOpen
        header="Удаление локации"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    view.unmount();

    press('Enter');

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
