import { Dispatch, SetStateAction, useRef, useState } from 'react';
import { useHotkeys, DICE_BY_KEY } from 'hooks/hotkeys';
import { DiceVariant } from '../types';

type DiceRecord = {
  id: number;
  dice: DiceVariant;
};

export const useDice = (): {
  dices: DiceRecord[];
  rollTrigger: boolean;
  setRollTrigger: Dispatch<SetStateAction<boolean>>;
  removeDice(e: React.MouseEvent<HTMLDivElement>, idToDelete: number): void;
} => {
  const [dices, setDices] = useState<DiceRecord[]>([]);
  const [rollTrigger, setRollTrigger] = useState(false);
  const nextDiceIdRef = useRef(0);

  useHotkeys({
    rollDice: () => setRollTrigger(true),
    addDice: (event) => {
      const dice = DICE_BY_KEY[event.key];
      if (!dice) return;

      nextDiceIdRef.current += 1;
      setDices((prevDices) => [...prevDices, { id: nextDiceIdRef.current, dice }]);
    },
  });

  const removeDice = (e: React.MouseEvent<HTMLDivElement>, idToDelete: number) => {
    e.preventDefault();
    setDices((prevDices) => prevDices.filter(({ id }) => id !== idToDelete));
  };

  return {
    dices,
    rollTrigger,
    setRollTrigger,
    removeDice,
  };
};
