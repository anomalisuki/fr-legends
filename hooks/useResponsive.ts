import React from 'react';

/**
 * Hook to track window width and return isMobile boolean
 * @returns Object with isMobile boolean and windowWidth
 */
export const useResponsive = (): { isMobile: boolean; windowWidth: number } => {
  const [windowWidth, setWindowWidth] = React.useState<number>(typeof window !== 'undefined' ? window.innerWidth : 768);

  React.useEffect((): (() => void) => {
    const handleResize = (): void => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return (): void => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: windowWidth < 768,
    windowWidth,
  };
};

/**
 * Hook to track element's container width using ResizeObserver
 * @param ref React ref to the container element
 * @returns Current container width
 */
export const useContainerWidth = <T extends HTMLElement>(ref: React.RefObject<T>): number => {
  const [width, setWidth] = React.useState<number>(200);

  React.useEffect((): (() => void) => {
    const container = ref.current;
    if (!container) return (): void => {};

    const resizeObserver = new ResizeObserver((): void => {
      const containerWidth = container.clientWidth;
      if (containerWidth > 0) {
        setWidth(containerWidth);
      }
    });

    resizeObserver.observe(container);
    return (): void => resizeObserver.disconnect();
  }, [ref]);

  return width;
};
