import { useEffect, useRef } from 'react';
import { useLayerContext } from 'components/providers';
import { HOTKEYS, HotkeyId } from './keymap';

type HotkeyHandlers = Partial<Record<HotkeyId, (event: KeyboardEvent) => void>>;

/**
 * Единственная точка, где клавиша превращается в действие.
 *
 * Здесь же живут два правила, которые иначе забываются: клавиша ищется в обеих
 * раскладках, а пока фокус в поле ввода, срабатывают только хоткеи с
 * `worksInInput` — иначе набор имени локации кидал бы кубики.
 */
export const useHotkeys = (handlers: HotkeyHandlers) => {
  const { isInputActive } = useLayerContext();
  // Обработчики читаются через ref: подписка не пересоздаётся на каждый рендер,
  // но замыкания всегда свежие.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      (Object.keys(handlersRef.current) as HotkeyId[]).forEach((id) => {
        const handler = handlersRef.current[id];
        if (!handler) return;
        if (!HOTKEYS[id].keys.includes(key)) return;
        if (isInputActive && !HOTKEYS[id].worksInInput) return;

        handler(event);
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isInputActive]);
};
