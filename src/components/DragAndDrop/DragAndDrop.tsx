import React from 'react';
import { BackgroundBorder, Eidos, Grid, ImageContainer } from 'components/common/StyledComponents';
import GridImg from 'assets/grid.png';
import EidosImg from 'assets/eidos.gif';
import { useFileController } from './hooks/useFileController';
import { useMouseEvents } from './hooks/useMouseEvents';
import './DragAndDrop.scss';
import { BrushModal } from '../BrushModal';
import { Canvas } from '../Canvas';
import { useDrawContext, useLayerContext } from 'components/providers';
import { LayerModal } from 'components/LayerModal';

export const DragAndDrop: React.FC = () => {
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
  } = useFileController();
  const { isBrushModalOpen } = useDrawContext();
  const { isLayerModalOpen } = useLayerContext();

  const { onMouseDown, setRef } = useMouseEvents({ files, setFiles, setActiveFileId });

  return (
    <div className="drag-and-drop-root">
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
      <Canvas />
      <div style={{ position: 'relative', height: '100vh' }}>
        {background.image && (
          <img src={background.image} alt="Background" className="background-image" />
        )}
        {files.map((file) => {
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
        })}
      </div>
      {imageType !== 'normal' && <BackgroundBorder $isBackground={imageType === 'background'} />}
      {isGridEnabled && <Grid src={GridImg} onMouseDown={(e) => e.preventDefault()} />}
      <Eidos src={EidosImg} $isVisible={isEidosEnabled} onMouseDown={(e) => e.preventDefault()} />
    </div>
  );
};
