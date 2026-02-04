import styled from 'styled-components';

export const BackgroundBorder = styled.div<{ $isBackground: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px dashed ${(props) => (props.$isBackground ? '#007bff' : '#ff353f')};
  z-index: 9998;
  pointer-events: none;
`;

export const Grid = styled.img`
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

export const Eidos = styled.img<{ $isVisible: boolean }>`
  position: absolute;
  z-index: 4;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: ${({ $isVisible }) => ($isVisible ? '1' : '0')};
  pointer-events: ${({ $isVisible }) => ($isVisible ? 'auto' : 'none')};
  transition: opacity 0.8s ease;
`;

export const ImageContainer = styled.div.attrs<{
  $isNormalImage: boolean;
  $health?: number;
  $top: number;
  $left: number;
}>((props) => ({
  style: {
    top: `${props.$top}px`,
    left: `${props.$left}px`,
    zIndex: props.$isNormalImage ? 3 : 1,
    opacity: props.$health === 0 ? '40%' : 1,
  },
}))`
  position: absolute;
  cursor: grab;
`;

export const DicesContainer = styled.div`
  display: flex;
  position: absolute;
  overflow: hidden;
  max-width: 100vw;
  background-color: #ff2d2d59;
  top: 0;
  left: 0;
  z-index: 5;
  border-end-end-radius: 20px;
`;

export const DiceContainer = styled.div`
  position: relative;
  flex: 0 0 auto;
  height: 150px;
  width: 150px;
  color: #f9ff00;
`;
