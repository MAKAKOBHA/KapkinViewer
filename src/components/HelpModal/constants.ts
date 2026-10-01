/**
 * То, что не проходит через `HOTKEYS`, и потому само в справку не попадёт:
 * клавиши внутри поля ввода и мышь. Меняете поведение — поправьте и здесь.
 */
export type HelpRow = { label: string; description: string };

export const LAYER_INPUT_KEYS: HelpRow[] = [
  { label: 'Enter', description: 'Сохранить имя локации' },
  { label: 'Esc', description: 'Отменить ввод имени' },
];

/** Клавиши окна с подтверждением: оно перехватывает их до хоткеев. */
export const CONFIRM_KEYS: HelpRow[] = [
  { label: 'Enter', description: 'Подтвердить действие' },
  { label: 'Esc', description: 'Отказаться от действия' },
];

export const MOUSE_ACTIONS: HelpRow[] = [
  { label: 'Левая кнопка', description: 'Перетащить токен' },
  { label: 'Правая кнопка', description: 'Удалить токен или кубик' },
  { label: 'Средняя кнопка', description: 'Дублировать токен' },
  { label: 'Колесо', description: 'Масштаб токена' },
  { label: 'Тряска мышью', description: 'Подсветить курсор ореолом' },
];

/** Мышь, которая двигает карту, — в своём блоке рядом с клавишей сброса. */
export const PAN_ACTIONS: HelpRow[] = [
  { label: 'Ctrl + колесо', description: 'Масштаб сцены в точку курсора' },
  { label: 'Ctrl + левая кнопка', description: 'Перемещать сцену' },
];
