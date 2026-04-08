import { FC } from 'react';
import { DragAndDrop } from 'components/main/DragAndDrop';
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
