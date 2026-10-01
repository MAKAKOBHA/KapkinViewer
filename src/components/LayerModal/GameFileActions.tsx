import { FC } from 'react';
import { Icon } from 'components/icons';
import { useLayerContext } from 'components/providers';
import { SAVE_EXTENSION } from 'components/DragAndDrop';
import { UseGameFileData } from './useGameFile';

type Props = {
  game: UseGameFileData;
};

/**
 * Выгрузка всей игры, две загрузки — начисто и добавлением к текущим локациям —
 * и новый мир: то же, что чистая загрузка, только без файла.
 */
export const GameFileActions: FC<Props> = ({ game }) => {
  const { layers } = useLayerContext();
  const { isBusy, error, exportLayers, pickFile, fileInputRef, onFileChosen, requestReset } = game;

  return (
    <div className="layer-modal__game">
      <input
        ref={fileInputRef}
        type="file"
        accept={`.${SAVE_EXTENSION}`}
        className="layer-modal__file"
        onChange={onFileChosen}
        tabIndex={-1}
        aria-label="Game file"
      />
      <div className="layer-modal__game-buttons">
        <button
          type="button"
          className="layer-modal__game-button"
          onClick={() => {
            void exportLayers(layers, 'Все локации');
          }}
          disabled={isBusy}
          title="Скачать все локации в файл"
          aria-label="Export all layers"
        >
          <Icon icon="export" />
          Скачать
        </button>
        <button
          type="button"
          className="layer-modal__game-button"
          onClick={() => pickFile('replace')}
          disabled={isBusy}
          title="Загрузить игру из файла вместо текущих локаций"
          aria-label="Import game"
        >
          <Icon icon="import" />
          Загрузить
        </button>
        <button
          type="button"
          className="layer-modal__game-button"
          onClick={() => pickFile('append')}
          disabled={isBusy}
          title="Добавить локации из файла к текущим"
          aria-label="Import game and keep current layers"
        >
          <Icon icon="import-add" />
          Добавить
        </button>
        <button
          type="button"
          className="layer-modal__game-button"
          onClick={requestReset}
          disabled={isBusy}
          title="Удалить все локации и начать с пустой"
          aria-label="Start a new game"
        >
          <Icon icon="new-game" />
          Новый мир
        </button>
      </div>
      {error && (
        <div className="layer-modal__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
