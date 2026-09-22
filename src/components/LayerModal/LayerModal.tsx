import React, { useEffect, useState } from 'react';
import './LayerModal.scss';
import { Icon } from 'components/icons';
import { LayerItem, removeLayer, useLayerContext } from 'components/providers';
import { deleteLayerDataFromStorage } from 'components/DragAndDrop';
import { ConfirmationModal } from 'components/ui/modal';
import { DraggablePanel } from 'components/ui/DraggablePanel';
import { AddNewLayer } from './AddNewLayer';

export const LayerModal: React.FC = () => {
  const { layers, setLayers, activeId, setActiveId, setIsInputActive } = useLayerContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [layerToDelete, setLayerToDelete] = useState<LayerItem | null>(null);

  useEffect(() => {
    if (editingId || isAdding) {
      setIsInputActive(true);
    } else {
      setIsInputActive(false);
    }
  }, [editingId, isAdding, setIsInputActive]);

  const startEdit = (layer: LayerItem) => {
    setEditingId(layer.id);
    setEditingValue(layer.name);
    setActiveId(layer.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === editingId ? { ...layer, name: trimmed || 'No name' } : layer,
      ),
    );
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    const next = removeLayer(layers, id, activeId);
    setLayerToDelete(null);
    if (!next) return;

    if (editingId === id) {
      cancelEdit();
    }
    setLayers(next.layers);
    setActiveId(next.activeId);
    void deleteLayerDataFromStorage(id);
  };

  return (
    <>
      <ConfirmationModal
        header="Удаление локации"
        description={`Подтверждаете удаление локации ${layerToDelete?.name}`}
        isOpen={!!layerToDelete}
        onCancel={() => setLayerToDelete(null)}
        onConfirm={() => handleDelete(layerToDelete!.id)}
      />
      <DraggablePanel
        className="layer-modal"
        contentClassName="layer-modal__content"
        ariaLabel="Layers"
      >
        <div className="layer-modal__title">Локации</div>
        <div className="layer-modal__list" role="listbox" aria-label="Layer list">
          {layers.map((layer) => {
            const isActive = layer.id === activeId;
            const isEditing = layer.id === editingId;

            return (
              <div
                key={layer.id}
                className={`layer-modal__item ${isActive ? 'is-active' : ''} ${
                  isEditing ? 'is-editing' : ''
                }`}
                onClick={() => setActiveId(layer.id)}
                // Только Enter: пробел занят глобальным броском кубиков.
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  setActiveId(layer.id);
                }}
                role="option"
                tabIndex={0}
                aria-selected={isActive}
              >
                <div className="layer-modal__name">
                  {isEditing ? (
                    <input
                      className="layer-modal__input"
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveEdit();
                        if (event.key === 'Escape') cancelEdit();
                      }}
                      onClick={(event) => event.stopPropagation()}
                      autoFocus
                      aria-label="Edit layer name"
                    />
                  ) : (
                    <span>{layer.name}</span>
                  )}
                </div>
                <div className="layer-modal__actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="layer-modal__icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          saveEdit();
                        }}
                        aria-label="Accept layer name"
                      >
                        <Icon icon="accept" />
                      </button>
                      <button
                        type="button"
                        className="layer-modal__icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          cancelEdit();
                        }}
                        aria-label="Cancel editing"
                      >
                        <Icon icon="cancel" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="layer-modal__icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEdit(layer);
                        }}
                        aria-label="Edit layer"
                      >
                        <Icon icon="edit" />
                      </button>
                      <button
                        type="button"
                        className="layer-modal__icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setLayerToDelete(layer);
                        }}
                        aria-label="Delete layer"
                        disabled={layers.length <= 1}
                      >
                        <Icon icon="trash" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <AddNewLayer isAdding={isAdding} setIsAdding={setIsAdding} cancelEdit={cancelEdit} />
        </div>
      </DraggablePanel>
    </>
  );
};
