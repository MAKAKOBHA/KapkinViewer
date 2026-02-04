import D4 from 'assets/d4.png';
import D6 from 'assets/d6.png';
import D8 from 'assets/d8.png';
import D10 from 'assets/d10.png';
import D12 from 'assets/d12.png';
import D20 from 'assets/d20.png';
import { DiceVariant } from './types';

type DiceStyles = {
  top: string;
  left: string;
  fontSize: string;
  img: string;
};

export const DICE_STYLES = new Map<DiceVariant, DiceStyles>([
  [
    4,
    {
      top: '53px',
      left: '17px',
      fontSize: '3rem',
      img: D4,
    },
  ],
  [
    6,
    {
      top: '50px',
      left: '8px',
      fontSize: '3rem',
      img: D6,
    },
  ],
  [
    8,
    {
      top: '33px',
      left: '30px',
      fontSize: '3rem',
      img: D8,
    },
  ],
  [
    10,
    {
      top: '35px',
      left: '25px',
      fontSize: '3rem',
      img: D10,
    },
  ],
  [
    12,
    {
      top: '55px',
      left: '24px',
      fontSize: '3rem',
      img: D12,
    },
  ],
  [
    20,
    {
      top: '58px',
      left: '25px',
      fontSize: '2.5rem',
      img: D20,
    },
  ],
]);
