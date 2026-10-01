import { FC, PropsWithChildren, useState } from 'react';
import { Hotkey, HOTKEYS, useHotkeys } from 'hooks/hotkeys';
import { DraggablePanel } from 'components/ui/DraggablePanel';
import { getHotkeyLabel } from './helpers';
import { HelpRow, LAYER_INPUT_KEYS, MOUSE_ACTIONS, PAN_ACTIONS } from './constants';
import './HelpModal.scss';

// Список клавиш берётся прямо из карты: новый хоткей появится в справке сам.
const getHotkeyRows = (section?: Hotkey['helpSection']): HelpRow[] =>
  Object.values(HOTKEYS)
    .filter((hotkey) => hotkey.helpSection === section)
    .map((hotkey) => ({ label: getHotkeyLabel(hotkey), description: hotkey.description }));

const GENERAL_ROWS = getHotkeyRows();
const LAYER_ROWS = [...getHotkeyRows('layers'), ...LAYER_INPUT_KEYS];
const PAN_ROWS = [...PAN_ACTIONS, ...getHotkeyRows('pan')];

type HelpSectionProps = PropsWithChildren<{ title: string; rows: HelpRow[] }>;

const HelpSection: FC<HelpSectionProps> = ({ title, rows, children }) => (
  <section className="help-modal__section">
    <div className="help-modal__title">{title}</div>
    <dl className="help-modal__list">
      {rows.map(({ label, description }) => (
        <div key={label} className="help-modal__row">
          <dt className="help-modal__key">
            <kbd>{label}</kbd>
          </dt>
          <dd className="help-modal__description">{description}</dd>
        </div>
      ))}
    </dl>
    {children && <p className="help-modal__note">{children}</p>}
  </section>
);

/**
 * Справка по горячим клавишам, открывается и закрывается по F1. Состояние
 * держим здесь же: кроме самой справки, оно никому не нужно.
 */
export const HelpModal: FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys({
    helpModal: (event) => {
      // Иначе браузер откроет свою справку в новой вкладке.
      event.preventDefault();
      setIsOpen((wasOpen) => !wasOpen);
    },
    closeModal: () => setIsOpen(false),
  });

  if (!isOpen) return null;

  return (
    <DraggablePanel
      className="help-modal"
      contentClassName="help-modal__content"
      ariaLabel="Hotkeys help"
    >
      <HelpSection title="Горячие клавиши" rows={GENERAL_ROWS}>
        Буквы работают в обеих раскладках.
      </HelpSection>
      <HelpSection title="Управление слоями" rows={LAYER_ROWS}>
        Пока курсор в поле ввода имени, из горячих клавиш срабатывают только PageDown и F1.
      </HelpSection>
      <HelpSection title="Мышь" rows={MOUSE_ACTIONS} />
      <HelpSection title="Панорамирование" rows={PAN_ROWS} />
    </DraggablePanel>
  );
};
