import { FC } from 'react';
import { DragAndDrop } from 'components/DragAndDrop';
import { Dices } from 'components/Dice/Dices';
import { DrawProvider } from 'components/providers';

export const App: FC = () => {
  return (
    <div>
      <DrawProvider>
        <DragAndDrop />
        <Dices />
      </DrawProvider>
    </div>
  );
};
