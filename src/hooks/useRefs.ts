import { useCallback, useRef } from 'react';

export type useRefsData = {
  refsByKey: Record<string, HTMLElement | null>;
  setRef(element: HTMLElement | null, key: string): void;
};

export const useRefs = () => {
  const refsByKey = useRef<Record<string, HTMLElement | null>>({});

  const setRef = useCallback((element: HTMLElement | null, key: string) => {
    refsByKey.current[key] = element;
  }, []);

  return { refsByKey: refsByKey.current, setRef };
};
