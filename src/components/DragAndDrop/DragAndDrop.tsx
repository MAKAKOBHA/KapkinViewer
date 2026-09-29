import React, { useRef } from 'react';
import { BackgroundBorder, Eidos, Grid, ImageContainer } from 'components/common/StyledComponents';
import GridImg from 'assets/grid.png';
import EidosImg from 'assets/eidos.gif';
import { LayerModal } from 'components/LayerModal';
import { useDrawContext, useLayerContext } from 'components/providers';
import { useFileController } from './hooks/useFileController';
import { useMouseEvents } from './hooks/useMouseEvents';
import { useSceneViewport } from './hooks/useSceneViewport';
import './DragAndDrop.scss';
import { BrushModal } from '../BrushModal';
import { Canvas } from '../Canvas';
import { DropzoneFile } from './types';

export const DragAndDrop: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useSceneViewport(rootRef);

  const {
    files,
    setFiles,
    setActiveFileId,
    isDragVisible,
    getRootProps,
    getInputProps,
    background,
    imageType,
    deleteImage,
    duplicateImage,
    isGridEnabled,
    isEidosEnabled,
  } = useFileController(viewportRef);
  const { isBrushModalOpen } = useDrawContext();
  const { isLayerModalOpen } = useLayerContext();

  const { onMouseDown, setRef } = useMouseEvents({
    files,
    setFiles,
    setActiveFileId,
    viewportRef,
  });

  const renderImage = (file: DropzoneFile) => {
    const isNormalImage = file.imageType === 'normal';

    return (
      <ImageContainer
        key={file.id}
        ref={isNormalImage ? (element) => setRef(element, file.id) : undefined}
        role="button"
        tabIndex={0}
        onMouseDown={(e) => onMouseDown(e, file.id)}
        onContextMenu={(e) => deleteImage(e, file.id)}
        onAuxClick={(e) => duplicateImage(e, file.id)}
        $top={file.position.y}
        $left={file.position.x}
        $isNormalImage={isNormalImage}
        $health={file.health}
        aria-label={`Draggable image: ${file.name}`}
      >
        {file.health !== undefined && file.health >= 0 && (
          <svg viewBox="0 0 40 40" style={{ position: 'absolute', top: '-40%' }}>
            <text
              x="0"
              y="15"
              style={{
                fill: '#e11e1e',
                fontFamily: 'Lombardina Two, StRome, Roboto Condensed, sans-serif',
              }}
            >
              {file.health}
            </text>
          </svg>
        )}
        <img
          src={file.preview}
          alt={file.name}
          data-image-id={file.id}
          style={{
            width: isNormalImage ? file.dimensions.width : 'auto',
            height: isNormalImage ? file.dimensions.height : 'auto',
            maxWidth: '100vw',
            maxHeight: '100vh',
          }}
        />
      </ImageContainer>
    );
  };

  return (
    <div className="drag-and-drop-root" ref={rootRef}>
      <div
        {...getRootProps({
          style: {
            position: 'absolute',
            height: '100vh',
            width: '100vw',
            zIndex: '9999',
            visibility: isDragVisible ? 'visible' : 'hidden',
          },
        })}
      >
        <input {...getInputProps()} />
      </div>
      {isBrushModalOpen && <BrushModal />}
      {isLayerModalOpen && <LayerModal />}
      {/*
        Сцена разрезана на две обёртки, потому что между картой и токенами стоит
        сетка, а она масштабироваться не должна. Обе обёртки берут трансформ из
        одних и тех же CSS-переменных, так что разъехаться не могут.
      */}
      <div className="scene-layer scene-layer--below">
        {background.image && (
          <img src={background.image} alt="Background" className="background-image" />
        )}
        {files.filter((file) => file.imageType !== 'normal').map(renderImage)}
        <Canvas viewportRef={viewportRef} />
      </div>
      {isGridEnabled && <Grid src={GridImg} onMouseDown={(e) => e.preventDefault()} />}
      <div className="scene-layer scene-layer--above">
        {files.filter((file) => file.imageType === 'normal').map(renderImage)}
      </div>
      {imageType !== 'normal' && <BackgroundBorder $isBackground={imageType === 'background'} />}
      <Eidos src={EidosImg} $isVisible={isEidosEnabled} onMouseDown={(e) => e.preventDefault()} />
    </div>
  );
};
