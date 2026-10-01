import { DiceVariant } from 'components/Dice/types';

export type HotkeyId =
  | 'layerModal'
  | 'backgroundMode'
  | 'battleMode'
  | 'grid'
  | 'eidos'
  | 'brushModal'
  | 'cursorHalo'
  | 'resetViewport'
  | 'addDice'
  | 'rollDice'
  | 'healthUp'
  | 'healthDown'
  | 'helpModal';

export type Hotkey = {
  /**
   * Клавиши в нижнем регистре, обязательно в обеих раскладках: мастер за столом
   * не переключает язык ради горячей клавиши.
   */
  keys: string[];
  /** Срабатывает ли, когда фокус стоит в поле ввода. По умолчанию — нет. */
  worksInInput?: boolean;
  /** Строка для справки по F1 и таблицы хоткеев в README. */
  description: string;
  /**
   * Как клавиша подписана в справке, если перечислять все `keys` неудобно —
   * например, шесть цифр для кубиков. По умолчанию — все клавиши через «/».
   */
  label?: string;
  /**
   * В каком блоке справки показывать клавишу. По умолчанию — в общем списке;
   * `layers` — рядом с клавишами поля ввода имени локации, `pan` — рядом с
   * Ctrl-жестами мыши, которыми двигают карту.
   */
  helpSection?: 'layers' | 'pan';
};

export const HOTKEYS: Record<HotkeyId, Hotkey> = {
  layerModal: {
    keys: ['pagedown'],
    worksInInput: true,
    helpSection: 'layers',
    description: 'Список локаций',
  },
  backgroundMode: { keys: ['b', 'и'], description: 'Режим загрузки фона' },
  battleMode: { keys: ['l', 'д'], description: 'Режим боевой карты' },
  grid: { keys: ['m', 'ь'], description: 'Сетка' },
  eidos: { keys: ["'", 'э'], description: 'Эйдос' },
  brushModal: { keys: ['d', 'в'], description: 'Панель кисти' },
  cursorHalo: { keys: ['o', 'щ'], description: 'Вид ореола курсора' },
  resetViewport: {
    keys: ['z', 'я'],
    helpSection: 'pan',
    description: 'Показать карту целиком',
  },
  addDice: {
    keys: ['1', '2', '3', '4', '5', '6'],
    label: '1–6',
    description: 'Добавить кубик (d4, d6, d8, d10, d12, d20)',
  },
  rollDice: { keys: [' '], description: 'Перебросить все кубики' },
  healthUp: { keys: ['arrowup'], description: 'Здоровье активного токена +1' },
  healthDown: { keys: ['arrowdown'], description: 'Здоровье активного токена −1' },
  // В поле ввода F1 ничего не печатает, так что справку можно открыть и там.
  helpModal: { keys: ['f1'], worksInInput: true, description: 'Справка по горячим клавишам' },
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
