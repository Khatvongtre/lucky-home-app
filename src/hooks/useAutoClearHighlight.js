import { useEffect, useState } from 'react';

export const useAutoClearHighlight = (timeoutMs = 4000) => {
  const [highlightedItemId, setHighlightedItemId] = useState(null);

  useEffect(() => {
    if (!highlightedItemId) return undefined;

    const timer = setTimeout(() => {
      setHighlightedItemId(null);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [highlightedItemId, timeoutMs]);

  return {
    highlightedItemId,
    setHighlightedItemId,
  };
};
