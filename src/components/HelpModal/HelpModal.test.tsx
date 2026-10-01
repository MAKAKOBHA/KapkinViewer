import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LayerProvider } from 'components/providers';
import { HOTKEYS } from 'hooks/hotkeys';
import { HelpModal } from './HelpModal';
import { getHotkeyLabel } from './helpers';

const press = (key: string) => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
};

const renderHelp = () => render(<HelpModal />, { wrapper: LayerProvider });

describe('HelpModal', () => {
  it('открывается и закрывается по F1', () => {
    renderHelp();
    expect(screen.queryByRole('dialog')).toBeNull();

    press('F1');
    expect(screen.getByRole('dialog', { name: 'Hotkeys help' })).toBeTruthy();

    press('F1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('не пускает F1 до браузерной справки', () => {
    renderHelp();

    expect(press('F1').defaultPrevented).toBe(true);
  });

  it('собирает клавиши локаций в блок «Управление слоями»', () => {
    renderHelp();
    press('F1');

    const layers = screen.getByText('Управление слоями').closest('section')!;
    expect(layers.textContent).toContain(HOTKEYS.layerModal.description);
    expect(layers.textContent).toContain('Сохранить имя локации');
  });

  it('собирает клавишу сброса и Ctrl-жесты в блок «Панорамирование»', () => {
    renderHelp();
    press('F1');

    const pan = screen.getByText('Панорамирование').closest('section')!;
    expect(pan.textContent).toContain(HOTKEYS.resetViewport.description);
    expect(pan.textContent).toContain('Ctrl + колесо');
    expect(pan.textContent).toContain('Ctrl + левая кнопка');
  });

  it.each(Object.entries(HOTKEYS))('показывает хоткей «%s»', (_id, hotkey) => {
    renderHelp();
    press('F1');

    expect(screen.getByText(hotkey.description)).toBeTruthy();
    // Не `getByText`: Esc подписывает и закрытие панели, и отмену ввода имени.
    expect(screen.getAllByText(getHotkeyLabel(hotkey)).length).toBeGreaterThan(0);
  });
});

describe('getHotkeyLabel', () => {
  it('подписывает обе раскладки заглавными', () => {
    expect(getHotkeyLabel(HOTKEYS.backgroundMode)).toBe('B / И');
  });

  it('переводит имена специальных клавиш', () => {
    expect(getHotkeyLabel(HOTKEYS.rollDice)).toBe('Пробел');
    expect(getHotkeyLabel(HOTKEYS.healthUp)).toBe('↑');
  });

  it('берёт явную подпись, если она задана', () => {
    expect(getHotkeyLabel(HOTKEYS.addDice)).toBe('1–6');
  });
});
