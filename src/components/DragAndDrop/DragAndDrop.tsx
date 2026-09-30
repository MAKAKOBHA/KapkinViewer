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
import { toPixels } from './viewport';

export const DragAndDrop: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const scene = useSceneViewport(rootRef);
  const { viewportRef, world, worldRef, setWorldAspect } = scene;

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
  } = useFileController({ viewportRef, worldRef, setWorldAspect });
  const { isBrushModalOpen } = useDrawContext();
  const { isLayerModalOpen } = useLayerContext();

  const { onMouseDown, setRef } = useMouseEvents({
    files,
    setFiles,
    setActiveFileId,
    viewportRef,
    worldRef,
  });

  // Сцена хранится в долях ширины карты — в пиксели они превращаются здесь, и
  // только здесь.
  const renderImage = (file: DropzoneFile) => {
    const isNormalImage = file.imageType === 'normal';
    const position = toPixels(file.position, world);
    const size = toPixels({ x: file.dimensions.width, y: file.dimensions.height }, world);

    return (
      <ImageContainer
        key={file.id}
        ref={isNormalImage ? (element) => setRef(element, file.id) : undefined}
        role="button"
        tabIndex={0}
        onMouseDown={(e) => onMouseDown(e, file.id)}
        onContextMenu={(e) => deleteImage(e, file.id)}
        onAuxClick={(e) => duplicateImage(e, file.id)}
        $top={position.y}
        $left={position.x}
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
          style={{ width: size.x, height: size.y }}
        />
      </ImageContainer>
    );
  };

  // Обёртки — это и есть карта: её пропорции задаёт фон, а размер — окно.
  const worldStyle = { width: world.width, height: world.height };

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
        Сцена разрезана на две обёртки, потому что между картой и токенами стоят
        рисунок и сетка. Обе обёртки берут трансформ из одних и тех же
        CSS-переменных, так что разъехаться не могут.
      */}
      <div className="scene-layer scene-layer--below" style={worldStyle}>
        {background.image && (
          <img src={background.image} alt="Background" className="background-image" />
        )}
        {files.filter((file) => file.imageType !== 'normal').map(renderImage)}
      </div>
      {/* Холст экранный: карту к нему приводит трансформация при отрисовке. */}
      <Canvas scene={scene} />
      {isGridEnabled && <Grid src={GridImg} onMouseDown={(e) => e.preventDefault()} />}
      <div className="scene-layer scene-layer--above" style={worldStyle}>
        {files.filter((file) => file.imageType === 'normal').map(renderImage)}
      </div>
      {imageType !== 'normal' && <BackgroundBorder $isBackground={imageType === 'background'} />}
      <Eidos src={EidosImg} $isVisible={isEidosEnabled} onMouseDown={(e) => e.preventDefault()} />
    </div>
  );
};
