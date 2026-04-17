import { FC } from 'react';
import { DragAndDrop } from 'components/DragAndDrop';
import { Dices } from 'components/Dice/Dices';
import { DrawProvider, LayerProvider } from 'components/providers';

export const App: FC = () => {
  return (
    <div>
      <LayerProvider>
        <DrawProvider>
          <DragAndDrop />
          <Dices />
        </DrawProvider>
      </LayerProvider>
    </div>
  );
};
