import { ChangeEvent, RefObject, useRef, useState } from 'react';
import { saveLayersToStorage, useLayerContext } from 'components/providers';
import {
  buildSaveFileName,
  collectGame,
  downloadGame,
  GameLayer,
  importGame,
  ImportMode,
  SaveFileError,
} from 'components/DragAndDrop';

export type UseGameFileData = {
  isBusy: boolean;
  error: string | null;
  exportLayers(layers: GameLayer[], title: string): Promise<void>;
  pickFile(mode: ImportMode): void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChosen(event: ChangeEvent<HTMLInputElement>): void;
  /** Файл, выбранный для чистого импорта: ждёт подтверждения. */
  replaceCandidate: File | null;
  confirmReplace(): void;
  cancelReplace(): void;
};

/**
 * Выгрузка и загрузка игры файлом.
 *
 * Оба импорта идут через один скрытый `input`: диалог выбора файла открывается
 * только по клику, поэтому режим запоминается в ref до того, как файл выбран.
 */
export const useGameFile = (): UseGameFileData => {
  const { layers } = useLayerContext();

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceCandidate, setReplaceCandidate] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<ImportMode>('append');

  const exportLayers = async (target: GameLayer[], title: string) => {
    setIsBusy(true);
    setError(null);

    try {
      downloadGame(await collectGame(target), buildSaveFileName(title));
    } catch {
      setError('Не удалось выгрузить игру');
    } finally {
      setIsBusy(false);
    }
  };

  const runImport = async (file: File, mode: ImportMode) => {
    setIsBusy(true);
    setError(null);

    try {
      const next = await importGame(file, mode, layers);
      saveLayersToStorage(next.layers, next.activeId);
      // Перезагрузка вместо возни со стейтом: сцена в памяти всё ещё от прошлой
      // локации, и её автосохранение затрёт только что импортированные данные.
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof SaveFileError ? cause.message : 'Не удалось загрузить игру');
      setIsBusy(false);
    }
  };

  const pickFile = (mode: ImportMode) => {
    modeRef.current = mode;
    setError(null);

    const input = fileInputRef.current;
    if (!input) return;

    // Иначе повторный выбор того же файла не даст события change.
    input.value = '';
    input.click();
  };

  const onFileChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (modeRef.current === 'replace') {
      setReplaceCandidate(file);
      return;
    }

    void runImport(file, 'append');
  };

  const confirmReplace = () => {
    const file = replaceCandidate;
    setReplaceCandidate(null);
    if (file) void runImport(file, 'replace');
  };

  return {
    isBusy,
    error,
    exportLayers,
    pickFile,
    fileInputRef,
    onFileChosen,
    replaceCandidate,
    confirmReplace,
    cancelReplace: () => setReplaceCandidate(null),
  };
};
