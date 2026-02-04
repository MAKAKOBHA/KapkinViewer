import { DiceContainer } from 'components/common/StyledComponents';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { DiceVariant } from './types';
import { rollDice } from './helpers';
import { DICE_STYLES } from './constants';

type DiceProps = {
  diceVariant: DiceVariant;
  rollTrigger: boolean;
  setRollTrigger: Dispatch<SetStateAction<boolean>>;
  contextAction(e: React.MouseEvent<HTMLDivElement>): void;
};

export const Dice: FC<DiceProps> = ({
  diceVariant,
  rollTrigger,
  setRollTrigger,
  contextAction,
}) => {
  const [currentNumber, setCurrentNumber] = useState<number>(0);
  const [isRolling, setIsRolling] = useState(false);

  const clickHandler = useCallback(() => {
    if (!isRolling) {
      setIsRolling(true);
      rollDice(
        diceVariant,
        (randomNumber) => {
          setCurrentNumber(randomNumber);
        },
        () => setIsRolling(false),
      );
    }
  }, [diceVariant, isRolling]);

  useEffect(() => {
    if (rollTrigger) {
      clickHandler();
      setRollTrigger(false);
    }
  }, [clickHandler, rollTrigger, setRollTrigger]);

  return (
    <DiceContainer onClick={clickHandler} onContextMenu={(e) => contextAction(e)}>
      <img src={DICE_STYLES.get(diceVariant)?.img} alt="" />
      <div
        style={{
          position: 'absolute',
          top: DICE_STYLES.get(diceVariant)!.top,
          left: DICE_STYLES.get(diceVariant)!.left,
          fontSize: DICE_STYLES.get(diceVariant)!.fontSize,
          width: '100px',
          textAlign: 'center',
        }}
      >
        {currentNumber}
      </div>
    </DiceContainer>
  );
};
