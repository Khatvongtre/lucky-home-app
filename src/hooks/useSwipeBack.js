import { useCallback, useRef } from 'react';

const isFormControl = (target) => (
  target?.closest?.('input, textarea, select, [contenteditable="true"], [data-swipe-back-ignore="true"]')
);

export const useSwipeBack = ({
  onBack,
  enabled = true,
  threshold = 80,
  maxVertical = 70,
  edgeOnly = false,
  edgeSize = 42,
} = {}) => {
  const startRef = useRef(null);

  const onTouchStart = useCallback((event) => {
    if (!enabled || !onBack || event.touches.length !== 1 || isFormControl(event.target)) {
      startRef.current = null;
      return;
    }

    const touch = event.touches[0];
    if (edgeOnly && touch.clientX > edgeSize) {
      startRef.current = null;
      return;
    }

    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      moved: false,
    };
  }, [edgeOnly, edgeSize, enabled, onBack]);

  const onTouchMove = useCallback((event) => {
    if (!startRef.current || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;

    if (dx > 20 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      startRef.current.moved = true;
    }
  }, []);

  const onTouchEnd = useCallback((event) => {
    if (!startRef.current) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;
    const shouldGoBack = startRef.current.moved && dx >= threshold && Math.abs(dy) <= maxVertical;
    startRef.current = null;

    if (shouldGoBack) {
      onBack();
    }
  }, [maxVertical, onBack, threshold]);

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    style: { touchAction: 'pan-y' },
  };
};
