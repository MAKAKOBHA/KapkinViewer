import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayerProvider } from 'components/providers';
import { CursorHalo } from './CursorHalo';

let now = 0;
let frames: FrameRequestCallback[] = [];

/** Кадр отрисовки — ровно один, вручную: ореол живёт на requestAnimationFrame. */
const runFrame = (stamp = now) => {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(stamp));
};

const move = (x: number, y: number, buttons = 0) => {
  window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, buttons }));
};

/** Тряска: взмахи по 60 px, по кадру на каждые 25 мс. */
const shake = (steps: number, buttons = 0, frameLag = 0) => {
  let x = 400;
  let direction = 1;

  for (let step = 0; step < steps; step += 1) {
    x += direction * 30;
    if (step % 2 === 1) direction = -direction;
    move(x, 300, buttons);
    now += 25;
    runFrame(now - frameLag);
  }
};

const rest = (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 25) {
    now += 25;
    runFrame();
  }
};

// Хоткеи читают `isInputActive`, так что ореолу нужен LayerProvider.
const renderHalo = () => {
  const { container } = render(<CursorHalo />, { wrapper: LayerProvider });
  return container.querySelector('.cursor-halo') as HTMLDivElement;
};

const press = (key: string) => {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
};

const opacityOf = (halo: HTMLDivElement) => Number(halo.style.opacity || 0);

beforeEach(() => {
  now = 0;
  frames = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cursor halo', () => {
  it('stays hidden while the mouse moves in a straight line', () => {
    const halo = renderHalo();

    for (let step = 1; step <= 20; step += 1) {
      move(400 + step * 30, 300);
      now += 25;
      runFrame();
    }

    expect(halo).not.toHaveClass('is-active');
  });

  it('shows up and follows the cursor when the mouse is shaken', () => {
    const halo = renderHalo();

    shake(12);

    expect(halo).toHaveClass('is-active');
    expect(opacityOf(halo)).toBeGreaterThan(0);
    expect(halo.style.transform).toContain('300px, 0');
  });

  it('never lets the halo turn inside out', () => {
    const halo = renderHalo();
    let lowest = 1;

    for (let burst = 0; burst < 8; burst += 1) {
      shake(4);
      lowest = Math.min(lowest, opacityOf(halo));
      rest(100);
      lowest = Math.min(lowest, opacityOf(halo));
    }

    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(halo.style.transform).not.toContain('scale(-');
  });

  it('ignores the frame clock, which runs behind performance.now()', () => {
    const halo = renderHalo();

    shake(12, 0, 150);

    expect(halo).toHaveClass('is-active');
    expect(opacityOf(halo)).toBeGreaterThan(0);
  });

  it('fades out and stops the frame loop once the shaking is over', () => {
    const halo = renderHalo();

    shake(12);
    rest(2000);

    expect(halo).not.toHaveClass('is-active');
    expect(opacityOf(halo)).toBe(0);
    expect(frames).toHaveLength(0);
  });

  it('switches between the two looks on the hotkey, in both layouts', () => {
    const halo = renderHalo();

    expect(halo).toHaveClass('cursor-halo--calm');

    press('o');
    expect(halo).toHaveClass('cursor-halo--rainbow');

    press('щ');
    expect(halo).toHaveClass('cursor-halo--calm');
  });

  it('keeps quiet while a button is held: the master is dragging or drawing', () => {
    const halo = renderHalo();

    shake(12, 1);

    expect(halo).not.toHaveClass('is-active');
    expect(frames).toHaveLength(0);
  });
});
