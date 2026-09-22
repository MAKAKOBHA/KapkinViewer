import { DiceVariant } from 'components/Dice/types';

export type HotkeyId =
  | 'layerModal'
  | 'backgroundMode'
  | 'battleMode'
  | 'grid'
  | 'eidos'
  | 'brushModal'
  | 'cursorHalo'
  | 'addDice'
  | 'rollDice'
  | 'healthUp'
  | 'healthDown';

export type Hotkey = {
  /**
   * Клавиши в нижнем регистре, обязательно в обеих раскладках: мастер за столом
   * не переключает язык ради горячей клавиши.
   */
  keys: string[];
  /** Срабатывает ли, когда фокус стоит в поле ввода. По умолчанию — нет. */
  worksInInput?: boolean;
  /** Строка для таблицы хоткеев в README и CLAUDE.md. */
  description: string;
};

export const HOTKEYS: Record<HotkeyId, Hotkey> = {
  layerModal: {
    keys: ['pagedown'],
    worksInInput: true,
    description: 'Список локаций',
  },
  backgroundMode: { keys: ['b', 'и'], description: 'Режим загрузки фона' },
  battleMode: { keys: ['l', 'д'], description: 'Режим боевой карты' },
  grid: { keys: ['m', 'ь'], description: 'Сетка' },
  eidos: { keys: ["'", 'э'], description: 'Эйдос' },
  brushModal: { keys: ['d', 'в'], description: 'Панель кисти' },
  cursorHalo: { keys: ['o', 'щ'], description: 'Вид ореола курсора' },
  addDice: { keys: ['1', '2', '3', '4', '5', '6'], description: 'Добавить кубик' },
  rollDice: { keys: [' '], description: 'Перебросить все кубики' },
  healthUp: { keys: ['arrowup'], description: 'Здоровье активного токена +1' },
  healthDown: { keys: ['arrowdown'], description: 'Здоровье активного токена −1' },
};

export const DICE_BY_KEY: Record<string, DiceVariant> = {
  '1': 4,
  '2': 6,
  '3': 8,
  '4': 10,
  '5': 12,
  '6': 20,
};

export const matchesHotkey = (key: string, id: HotkeyId): boolean =>
  HOTKEYS[id].keys.includes(key.toLowerCase());
