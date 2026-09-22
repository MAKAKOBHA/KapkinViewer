import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { FC, PropsWithChildren } from 'react';
import { LayerProvider, useLayerContext } from 'components/providers';
import { useHotkeys } from './useHotkeys';
import { HOTKEYS, HotkeyId } from './keymap';

type Handlers = Partial<Record<HotkeyId, (event: KeyboardEvent) => void>>;

const Probe: FC<{ handlers: Handlers }> = ({ handlers }) => {
  const { isInputActive, setIsInputActive } = useLayerContext();
  useHotkeys(handlers);

  return (
    <button type="button" onClick={() => setIsInputActive(!isInputActive)}>
      toggle input
    </button>
  );
};

const Wrapper: FC<PropsWithChildren> = ({ children }) => <LayerProvider>{children}</LayerProvider>;

const setup = (handlers: Handlers) => {
  const view = render(<Probe handlers={handlers} />, { wrapper: Wrapper });
  const focusInput = () => act(() => view.getByRole('button').click());

  return { focusInput };
};

const press = (key: string) => {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
};

describe('useHotkeys', () => {
  it('срабатывает и в латинской, и в кириллической раскладке', () => {
    const backgroundMode = vi.fn();
    setup({ backgroundMode });

    press('b');
    press('и');

    expect(backgroundMode).toHaveBeenCalledTimes(2);
  });

  it('не зависит от регистра', () => {
    const grid = vi.fn();
    setup({ grid });

    press('M');
    press('Ь');

    expect(grid).toHaveBeenCalledTimes(2);
  });

  it('молчит на чужую клавишу', () => {
    const grid = vi.fn();
    setup({ grid });

    press('z');

    expect(grid).not.toHaveBeenCalled();
  });

  it('передаёт событие обработчику — по нему кубик понимает, какой он', () => {
    const addDice = vi.fn();
    setup({ addDice });

    press('3');

    expect(addDice).toHaveBeenCalledWith(expect.objectContaining({ key: '3' }));
  });

  it('молчит, пока фокус в поле ввода', () => {
    const rollDice = vi.fn();
    const { focusInput } = setup({ rollDice });

    focusInput();
    press(' ');

    expect(rollDice).not.toHaveBeenCalled();
  });

  it('пропускает хоткеи с worksInInput даже при фокусе в поле ввода', () => {
    const layerModal = vi.fn();
    const { focusInput } = setup({ layerModal });

    focusInput();
    press('PageDown');

    expect(layerModal).toHaveBeenCalledTimes(1);
  });

  it('снимает слушатель при размонтировании', () => {
    const grid = vi.fn();
    const view = render(<Probe handlers={{ grid }} />, { wrapper: Wrapper });
    view.unmount();

    press('m');

    expect(grid).not.toHaveBeenCalled();
  });
});

describe('карта хоткеев', () => {
  const isDigitOrSpace = (key: string) => /^[0-9 ]$/.test(key);
  const isCyrillic = (key: string) => /^[а-яё]$/.test(key);

  it.each(Object.entries(HOTKEYS))(
    'у символьного хоткея «%s» объявлена кириллическая раскладка',
    (_id, hotkey) => {
      const characterKeys = hotkey.keys.filter((key) => key.length === 1 && !isDigitOrSpace(key));
      if (characterKeys.length === 0) return;

      expect(characterKeys.some(isCyrillic)).toBe(true);
    },
  );

  it('не назначает одну клавишу двум действиям', () => {
    const allKeys = Object.values(HOTKEYS).flatMap((hotkey) => hotkey.keys);

    expect(allKeys).toHaveLength(new Set(allKeys).size);
  });

  it('хранит клавиши в нижнем регистре', () => {
    const allKeys = Object.values(HOTKEYS).flatMap((hotkey) => hotkey.keys);

    expect(allKeys).toEqual(allKeys.map((key) => key.toLowerCase()));
  });
});
