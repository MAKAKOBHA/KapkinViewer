import React, { useLayoutEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import './BrushModal.scss';
import { useDrawContext } from 'components/providers';
import { Icon } from 'components/icons';

const MODAL_MARGIN = 12;

export const BrushModal: React.FC = () => {
  const {
    activeTool,
    handleToolToggle,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
  } = useDrawContext();
  const brushModalRef = useRef<HTMLDivElement>(null);
  const hasMeasuredRef = useRef(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!brushModalRef.current || hasMeasuredRef.current) return;

    const { width } = brushModalRef.current.getBoundingClientRect();
    setPosition({
      x: Math.max(window.innerWidth - width - MODAL_MARGIN, 0),
      y: MODAL_MARGIN,
    });
    hasMeasuredRef.current = true;
  }, []);

  return (
    <Draggable
      handle=".brush-modal__handle"
      bounds="parent"
      nodeRef={brushModalRef}
      position={position}
      onDrag={(_, data) => setPosition({ x: data.x, y: data.y })}
    >
      <div ref={brushModalRef} className="brush-modal" role="dialog" aria-label="Brush settings">
        <div className="brush-modal__handle" aria-hidden="true" />
        <div className="brush-modal__content">
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
        </div>
      </div>
    </Draggable>
  );
};
