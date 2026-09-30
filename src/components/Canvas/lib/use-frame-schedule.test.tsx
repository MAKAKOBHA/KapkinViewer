import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFrameSchedule } from './use-frame-schedule';

/** Ручные кадры: браузерных в тестовой среде нет, а сроки нам важны. */
const frames = new Map<number, FrameRequestCallback>();
let nextHandle = 1;

const runFrame = () => {
  const pending = [...frames.entries()];
  frames.clear();
  act(() => {
    pending.forEach(([, callback]) => callback(performance.now()));
  });
};

beforeEach(() => {
  frames.clear();
  nextHandle = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const handle = nextHandle;
    nextHandle += 1;
    frames.set(handle, callback);
    return handle;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => frames.delete(handle));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useFrameSchedule', () => {
  it('склеивает частые вызовы в один кадр', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useFrameSchedule(callback));

    act(() => {
      result.current();
      result.current();
      result.current();
    });
    runFrame();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('не заклинивает, если заказанный кадр так и не выполнился', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useFrameSchedule(callback));

    // кадр заказан и погашен мимо планировщика — так бывает при двойном
    // монтировании в StrictMode и пока окно скрыто
    act(() => result.current());
    frames.clear();

    act(() => result.current());
    runFrame();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('зовёт свежий обработчик, а не тот, что был при первом рендере', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }: { callback: () => void }) => useFrameSchedule(callback),
      { initialProps: { callback: first } },
    );

    act(() => result.current());
    rerender({ callback: second });
    runFrame();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('не меняет ссылку между рендерами — подписки не пересоздаются', () => {
    const { result, rerender } = renderHook(
      ({ callback }: { callback: () => void }) => useFrameSchedule(callback),
      { initialProps: { callback: vi.fn() } },
    );
    const first = result.current;

    rerender({ callback: vi.fn() });

    expect(result.current).toBe(first);
  });

  it('после размонтирования кадр не выполняется', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useFrameSchedule(callback));

    act(() => result.current());
    unmount();
    runFrame();

    expect(callback).not.toHaveBeenCalled();
  });
});
