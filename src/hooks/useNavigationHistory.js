import { useCallback, useEffect, useRef } from 'react';

export const useNavigationHistory = ({
  isHubMode,
  selectedHouse,
  activeTab,
  setIsHubMode,
  setSelectedHouse,
  setActiveTab,
  setHighlightedItemId,
}) => {
  const historyRef = useRef([]);
  const isGoingBackRef = useRef(false);

  useEffect(() => {
    if (isGoingBackRef.current) {
      isGoingBackRef.current = false;
      return;
    }

    const lastState = historyRef.current[historyRef.current.length - 1];
    if (
      !lastState
      || lastState.isHubMode !== isHubMode
      || lastState.selectedHouse?.id !== selectedHouse?.id
      || lastState.activeTab !== activeTab
    ) {
      historyRef.current.push({ isHubMode, selectedHouse, activeTab });
    }
  }, [activeTab, isHubMode, selectedHouse]);

  const resetNavigationHistory = useCallback(() => {
    historyRef.current = [];
    isGoingBackRef.current = false;
  }, []);

  const goBack = useCallback(() => {
    if (historyRef.current.length > 1) {
      historyRef.current.pop();
      const prevState = historyRef.current[historyRef.current.length - 1];
      isGoingBackRef.current = true;
      setIsHubMode(prevState.isHubMode);
      setSelectedHouse(prevState.selectedHouse);
      setActiveTab(prevState.activeTab);
      setHighlightedItemId(null);
      return;
    }

    if (!selectedHouse || activeTab === 'dashboard') {
      setIsHubMode(true);
      setSelectedHouse(null);
      setActiveTab('dashboard');
    } else {
      setActiveTab('dashboard');
    }
    setHighlightedItemId(null);
  }, [activeTab, selectedHouse, setActiveTab, setHighlightedItemId, setIsHubMode, setSelectedHouse]);

  return {
    goBack,
    resetNavigationHistory,
  };
};
