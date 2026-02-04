import { FC } from 'react';
import { DragAndDrop } from 'components/main/DragAndDrop';
import { Dices } from 'components/Dice/Dices';

export const App: FC = () => {
  return (
    <div>
      <DragAndDrop />
      <Dices />
    </div>
  );
};
