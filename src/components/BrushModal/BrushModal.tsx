import React from 'react';
import './BrushModal.scss';
import { useDrawContext } from 'components/providers';
import { Icon } from 'components/icons';
import { DraggablePanel } from 'components/ui/DraggablePanel';

export const BrushModal: React.FC = () => {
  const {
    activeTool,
    handleToolToggle,
    handleClearCanvas,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
  } = useDrawContext();

  return (
    <DraggablePanel
      className="brush-modal"
      contentClassName="brush-modal__content"
      ariaLabel="Brush settings"
    >
      <button
        type="button"
        className={`brush-modal__tool ${activeTool === 'brush' ? 'is-active' : ''}`}
        onClick={() => handleToolToggle('brush')}
        aria-pressed={activeTool === 'brush'}
        aria-label="Toggle brush"
      >
        <Icon icon="brush" />
      </button>
      <button
        type="button"
        className={`brush-modal__tool ${activeTool === 'eraser' ? 'is-active' : ''}`}
        onClick={() => handleToolToggle('eraser')}
        aria-pressed={activeTool === 'eraser'}
        aria-label="Toggle eraser"
      >
        <Icon icon="eraser" />
      </button>
      <label className="brush-modal__slider" aria-label="Brush size">
        <Icon icon="size" />
        <input
          key="size"
          type="range"
          min={1}
          max={100}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <span className="brush-modal__value">{brushSize}</span>
      </label>
      <label className="brush-modal__slider" aria-label="Brush opacity">
        <Icon icon="opacity" />
        <input
          key="opacity"
          type="range"
          min={1}
          max={100}
          value={brushOpacity}
          onChange={(e) => setBrushOpacity(Number(e.target.value))}
        />
        <span className="brush-modal__value">{brushOpacity}</span>
      </label>
      <div className="brush-modal__colors" aria-label="Brush color">
        <button
          type="button"
          className={`brush-modal__color brush-modal__color--green ${
            brushColor === 'green' ? 'is-active' : ''
          }`}
          onClick={() => setBrushColor('green')}
          aria-label="Green color"
        />
        <button
          type="button"
          className={`brush-modal__color brush-modal__color--red ${
            brushColor === 'red' ? 'is-active' : ''
          }`}
          onClick={() => setBrushColor('red')}
          aria-label="Red color"
        />
        <button
          type="button"
          className={`brush-modal__color brush-modal__color--blue ${
            brushColor === 'blue' ? 'is-active' : ''
          }`}
          onClick={() => setBrushColor('blue')}
          aria-label="Blue color"
        />
      </div>
      <button
        type="button"
        className="brush-modal__tool"
        onClick={handleClearCanvas}
        aria-label="Clear canvas"
      >
        <Icon icon="trash" />
      </button>
    </DraggablePanel>
  );
};
