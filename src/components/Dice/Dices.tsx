import { FC } from 'react';
import { DicesContainer } from 'components/common/StyledComponents';
import { useDice } from './hooks/useDice';
import { Dice } from './Dice';

export const Dices: FC = () => {
  const { dices, removeDice, rollTrigger, setRollTrigger } = useDice();

  return (
    <DicesContainer>
      <div style={{ display: 'flex', overflow: 'auto' }}>
        {dices.map(({ id, dice }) => {
          return (
            <Dice
              key={id}
              diceVariant={dice}
              contextAction={(e) => removeDice(e, id)}
              rollTrigger={rollTrigger}
              setRollTrigger={setRollTrigger}
            />
          );
        })}
      </div>
    </DicesContainer>
  );
};
