import { Hotkey } from 'hooks/hotkeys';

// Имена, которые даёт `event.key`, мастеру ничего не скажут — подписываем по-человечески.
const KEY_NAMES: Record<string, string> = {
  ' ': 'Пробел',
  pagedown: 'PageDown',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  escape: 'Esc',
  enter: 'Enter',
};

export const getKeyName = (key: string): string => KEY_NAMES[key] ?? key.toUpperCase();

export const getHotkeyLabel = ({ keys, label }: Hotkey): string =>
  label ?? keys.map(getKeyName).join(' / ');
