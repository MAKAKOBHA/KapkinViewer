import { Icon } from 'components/icons';
import { useLayerContext } from 'components/providers';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  isAdding: boolean;
  setIsAdding: Dispatch<SetStateAction<boolean>>;
  cancelEdit(): void;
};

export const AddNewLayer: FC<Props> = ({ isAdding, setIsAdding, cancelEdit }) => {
  const { setLayers, setActiveId } = useLayerContext();

  const [newLayerName, setNewLayerName] = useState('');

  const startAdd = () => {
    setIsAdding(true);
    setNewLayerName('');
    cancelEdit();
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewLayerName('');
  };

  const saveAdd = () => {
    const trimmed = newLayerName.trim();
    if (!trimmed) return;
    const nextId = uuidv4();
    setLayers((prev) => [...prev, { id: nextId, name: trimmed }]);
    setActiveId(nextId);
    setNewLayerName('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button type="button" className="layer-modal__add" onClick={startAdd}>
        + Add new
      </button>
    );
  }

  return (
    <div className="layer-modal__item is-editing" role="option" aria-selected="false">
      <div className="layer-modal__name">
        <input
          className="layer-modal__input"
          value={newLayerName}
          onChange={(event) => setNewLayerName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') saveAdd();
            if (event.key === 'Escape') cancelAdd();
          }}
          autoFocus
          aria-label="New layer name"
        />
      </div>
      <div className="layer-modal__actions">
        <button
          type="button"
          className="layer-modal__icon-button"
          onClick={saveAdd}
          aria-label="Accept new layer"
        >
          <Icon icon="accept" />
        </button>
        <button
          type="button"
          className="layer-modal__icon-button"
          onClick={cancelAdd}
          aria-label="Cancel new layer"
        >
          <Icon icon="cancel" />
        </button>
      </div>
    </div>
  );
};
