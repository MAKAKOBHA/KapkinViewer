import { useCallback, useEffect, useRef } from 'react';

/**
 * Откладывает работу до ближайшего кадра и склеивает частые вызовы в один: и
 * зум, и кисть сыплют событиями чаще, чем экран успевает обновиться.
 *
 * Заказанный кадр всегда переназначается, а не пропускается. Это не прихоть:
 * пропуск оставлял планировщик заклиненным навсегда, стоило одному кадру не
 * выполниться — а так бывает и при двойном монтировании в StrictMode, и пока
 * окно скрыто и кадры не идут вовсе.
 */
export const useFrameSchedule = (callback: () => void) => {
  const callbackRef = useRef(callback);
  const frameRef = useRef(0);

  callbackRef.current = callback;

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    },
    [],
  );

  return useCallback(() => {
    cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      callbackRef.current();
    });
  }, []);
};
