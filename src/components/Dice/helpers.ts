import { DiceVariant } from './types';

export const rollDice = (
  dices: DiceVariant,
  callback: (number: number) => void,
  onEnd: () => void,
) => {
  let interval = 20; // Initial speed (ms)
  const maxInterval = 250; // Total interval before stopping
  let prevNumber: number;

  const roll = () => {
    let randomNumber = Math.floor(Math.random() * dices) + 1;
    if (randomNumber === prevNumber) {
      if (randomNumber === 1) {
        randomNumber += 1;
      } else {
        randomNumber -= 1;
      }
    }

    prevNumber = randomNumber;
    callback(randomNumber); // Display or process the number

    if (interval >= maxInterval) {
      onEnd();
      return;
    }

    interval += Math.floor(Math.random() * 20) + 1; // Slow down each step
    setTimeout(roll, interval);
  };

  roll();
};
