import { describe, expect, it } from 'vitest';
import { createShakeState, getShakeScore, pushPoint, ShakePoint } from './shake-score';

const feed = (points: ShakePoint[]) => points.reduce(pushPoint, createShakeState());

/** Путь по прямой вправо. */
const straight = (steps: number, stepPx: number, stepMs: number): ShakePoint[] => {
  const points: ShakePoint[] = [{ x: 0, y: 0, t: 0 }];

  for (let step = 1; step <= steps; step += 1) {
    points.push({ x: step * stepPx, y: 0, t: step * stepMs });
  }

  return points;
};

/** Тряска: `sweeps` взмахов по `sweepPx` пикселей, каждый из отрезков `stepPx`. */
const zigzag = (sweeps: number, sweepPx: number, stepPx: number, stepMs: number): ShakePoint[] => {
  const points: ShakePoint[] = [{ x: 0, y: 0, t: 0 }];
  let x = 0;
  let t = 0;

  for (let sweep = 0; sweep < sweeps; sweep += 1) {
    const direction = sweep % 2 === 0 ? 1 : -1;

    for (let moved = 0; moved < sweepPx; moved += stepPx) {
      x += direction * stepPx;
      t += stepMs;
      points.push({ x, y: 0, t });
    }
  }

  return points;
};

const lastMoment = (points: ShakePoint[]) => points[points.length - 1].t;

const score = (points: ShakePoint[]) => getShakeScore(feed(points), lastMoment(points));

describe('shake score', () => {
  it('ignores a fast move in a straight line', () => {
    expect(score(straight(20, 30, 25))).toBe(0);
  });

  it('reacts to a zigzag', () => {
    expect(score(zigzag(4, 120, 30, 40))).toBeGreaterThan(0);
  });

  it('reaches the maximum on a rapid zigzag', () => {
    expect(score(zigzag(8, 60, 30, 25))).toBe(1);
  });

  it('ignores slow waving: the turns are there, the speed is not', () => {
    expect(score(zigzag(8, 10, 10, 60))).toBe(0);
  });

  it('ignores jitter that never leaves the same spot', () => {
    const jitter: ShakePoint[] = Array.from({ length: 30 }, (_, index) => ({
      x: index % 2 === 0 ? 0 : 3,
      y: 0,
      t: index * 20,
    }));

    expect(score(jitter)).toBe(0);
  });

  it('fades once the shaking stops', () => {
    const points = zigzag(8, 60, 30, 25);

    expect(getShakeScore(feed(points), lastMoment(points) + 1000)).toBe(0);
  });
});
