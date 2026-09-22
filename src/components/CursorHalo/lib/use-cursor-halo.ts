import { RefObject, useEffect } from 'react';
import { FADE_MS, HOLD_MS, MIN_SCALE, RISE_MS } from '../constants';
import { createShakeState, getShakeScore, pushPoint } from './shake-score';

/**
 * Ведёт ореол: слушает мышь, считает тряску и сам пишет в DOM. В React-стейт
 * не кладём ничего — иначе на каждое движение мыши перерисовывалась бы вся
 * сцена с картинками.
 */
export const useCursorHalo = (haloRef: RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    let shake = createShakeState();
    let position = { x: 0, y: 0 };
    let intensity = 0;
    let holdUntil = 0;
    let frame = 0;
    let lastFrameAt = 0;

    const draw = () => {
      const halo = haloRef.current;
      if (!halo) return;

      const scale = MIN_SCALE + (1 - MIN_SCALE) * intensity;
      halo.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      halo.style.opacity = `${intensity}`;
      halo.classList.toggle('is-active', intensity > 0);
    };

    // Время берём только из performance.now(): аргумент rAF живёт в своих часах
    // и на скрытой вкладке отстаёт от них на десятки миллисекунд, а
    // отрицательная дельта уводила бы масштаб в минус.
    const tick = () => {
      const now = performance.now();
      // Вкладку могли свернуть: кадр после паузы не должен менять ореол разом.
      const delta = Math.min(now - lastFrameAt, 100);
      lastFrameAt = now;

      const score = getShakeScore(shake, now);
      if (score > 0) holdUntil = now + HOLD_MS;

      if (score > intensity) {
        intensity = Math.min(score, intensity + delta / RISE_MS);
      } else if (now >= holdUntil) {
        intensity = Math.max(0, intensity - delta / FADE_MS);
      }

      draw();

      // В покое цикл останавливаем: жечь кадры, пока мастер просто двигает
      // мышью, незачем.
      frame = intensity > 0 || score > 0 ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (frame) return;
      lastFrameAt = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const onMouseMove = (event: MouseEvent) => {
      position = { x: event.clientX, y: event.clientY };

      // Пока кнопка зажата, мастер тащит картинку или штрихует кистью: возить
      // там мышью туда-сюда нормально, и ореол только мешал бы.
      if (event.buttons !== 0) {
        shake = createShakeState();
        return;
      }

      const now = performance.now();
      shake = pushPoint(shake, { x: event.clientX, y: event.clientY, t: now });
      if (getShakeScore(shake, now) > 0) start();
    };

    // Мышь ушла за край окна — вернётся она уже в другой точке, и этот прыжок
    // не должен сойти за разворот.
    const onMouseLeave = () => {
      shake = createShakeState();
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [haloRef]);
};
