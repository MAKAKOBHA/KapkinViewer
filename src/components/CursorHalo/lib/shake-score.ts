import {
  MIN_AXIS_PX,
  MIN_SEGMENT_PX,
  MIN_SPEED_PX_PER_SEC,
  SHAKE_WINDOW_MS,
  TURNS_FOR_MAX,
  TURNS_TO_TRIGGER,
} from '../constants';

export type ShakePoint = { x: number; y: number; t: number };

type Segment = { t: number; length: number };

export type ShakeState = {
  /** Точка, от которой отмеряется следующий отрезок. */
  point: ShakePoint | null;
  dirX: number;
  dirY: number;
  /** Моменты разворотов и длины отрезков в пределах окна. */
  turns: number[];
  segments: Segment[];
};

export const createShakeState = (): ShakeState => ({
  point: null,
  dirX: 0,
  dirY: 0,
  turns: [],
  segments: [],
});

/**
 * Признак тряски — смена направления, а не скорость сама по себе: мастер,
 * который тащит токен через весь стол, движется быстро, но прямо, и раздувать
 * ореол ему незачем.
 */
export const pushPoint = (state: ShakeState, point: ShakePoint): ShakeState => {
  const previous = state.point;
  if (!previous) return { ...state, point };

  const dx = point.x - previous.x;
  const dy = point.y - previous.y;
  const length = Math.hypot(dx, dy);
  if (length < MIN_SEGMENT_PX) return state;

  const dirX = Math.abs(dx) >= MIN_AXIS_PX ? Math.sign(dx) : state.dirX;
  const dirY = Math.abs(dy) >= MIN_AXIS_PX ? Math.sign(dy) : state.dirY;
  // Диагональный разворот считается один раз: обе оси меняют знак разом, но
  // тряска от этого не становится вдвое сильнее.
  const isTurn =
    (state.dirX !== 0 && dirX !== state.dirX) || (state.dirY !== 0 && dirY !== state.dirY);

  const since = point.t - SHAKE_WINDOW_MS;

  return {
    point,
    dirX,
    dirY,
    turns: state.turns.filter((t) => t > since).concat(isTurn ? [point.t] : []),
    segments: state.segments.filter((segment) => segment.t > since).concat({ t: point.t, length }),
  };
};

/** Насколько сильно мастер трясёт мышью прямо сейчас: от 0 до 1. */
export const getShakeScore = (state: ShakeState, now: number): number => {
  const since = now - SHAKE_WINDOW_MS;

  const turns = state.turns.filter((t) => t > since).length;
  if (turns < TURNS_TO_TRIGGER) return 0;

  const distance = state.segments.reduce(
    (sum, segment) => (segment.t > since ? sum + segment.length : sum),
    0,
  );
  if (distance / (SHAKE_WINDOW_MS / 1000) < MIN_SPEED_PX_PER_SEC) return 0;

  // На пороге ореол появляется уже заметным, иначе первые развороты уходят
  // в почти невидимый масштаб.
  const from = TURNS_TO_TRIGGER - 1;
  return Math.min((turns - from) / (TURNS_FOR_MAX - from), 1);
};
