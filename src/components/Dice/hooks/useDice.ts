import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { DiceVariant } from '../types';

type DiceRecord = {
  id: number;
  dice: DiceVariant;
};

const diceKeyMap: Record<string, DiceVariant> = {
  '1': 4,
  '2': 6,
  '3': 8,
  '4': 10,
  '5': 12,
  '6': 20,
};

const useCurrentRef = <T>(initValue: T) => {
  const ref = useRef(initValue);

  const getRef = useCallback(() => ref.current, []);

  return [ref, getRef] as const;
};

export const useDice = (): {
  dices: DiceRecord[];
  rollTrigger: boolean;
  setRollTrigger: Dispatch<SetStateAction<boolean>>;
  removeDice(e: React.MouseEvent<HTMLDivElement>, idToDelete: number): void;
} => {
  const [dices, setDices] = useState<DiceRecord[]>([]);
  const [diceIdRef, getDiceIdRef] = useCurrentRef(0);
  const [rollTrigger, setRollTrigger] = useState(false);

  useEffect(() => {
    const handleDiceSelect = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setRollTrigger(true);
        return;
      }
      if (Object.keys(diceKeyMap).includes(e.key)) {
        setDices((prevDices) => {
          diceIdRef.current = getDiceIdRef() + 1;
          return [
            ...prevDices,
            {
              id: diceIdRef.current,
              dice: diceKeyMap[e.key as keyof typeof diceKeyMap],
            },
          ];
        });
      }
    };

    document.addEventListener('keydown', handleDiceSelect);
    return () => document.removeEventListener('keydown', handleDiceSelect);
  }, [diceIdRef, getDiceIdRef]);

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
