import { useCallback, useEffect } from 'react';
import { authStorage } from '../services/authStorage';

export const useAppDataLoader = ({
  isLoggedIn,
  isHubMode,
  activeTab,
  selectedHouse,
  viewDate,
  selectedMonth,
  setActiveTab,
  setConfig,
  setIsHubMode,
  loadSavings,
  loadWarnings,
  loadHouses,
  loadDashboardData,
  loadRoomsData,
  loadMetersData,
  loadBillsData,
  loadTransactions,
  showToast,
}) => {
  const loadTabData = useCallback(async (tab = activeTab, houseId = selectedHouse?.id) => {
    try {
      if (tab === 'savings') {
        await loadSavings();
        return;
      }
      if (!houseId) return;

      switch (tab) {
        case 'dashboard':
          await loadDashboardData(houseId);
          break;
        case 'rooms':
          await loadRoomsData(houseId);
          break;
        case 'meters_list':
          await loadMetersData(houseId);
          break;
        case 'bills':
          await loadBillsData(houseId);
          break;
        case 'finance':
          await loadTransactions(houseId);
          break;
        case 'settings':
          setConfig(prev => ({ ...selectedHouse, ...prev }));
          break;
        default:
          break;
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, [
    activeTab,
    loadBillsData,
    loadDashboardData,
    loadMetersData,
    loadRoomsData,
    loadSavings,
    loadTransactions,
    selectedHouse,
    setConfig,
    showToast,
  ]);

  const loadHouseData = useCallback(async (houseId, tab = activeTab) => {
    await loadTabData(tab, houseId);
  }, [activeTab, loadTabData]);

  useEffect(() => {
    const pathName = window.location.pathname;
    const targetTab = pathName === '/chitieu' || pathName === '/chitieu/' ? 'fast_input' : null;

    if (!targetTab) return;

    const token = authStorage.getToken();
    if (!token) {
      sessionStorage.setItem('redirectAfterLogin', targetTab);
    } else {
      setIsHubMode(false);
      setActiveTab(targetTab);
    }
  }, [setActiveTab, setIsHubMode]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const pendingTab = sessionStorage.getItem('redirectAfterLogin');
    if (!pendingTab) return;

    setIsHubMode(false);
    setActiveTab(pendingTab);
    sessionStorage.removeItem('redirectAfterLogin');

    if (window.location.pathname.includes('/chitieu')) {
      window.history.replaceState({}, document.title, '/');
    }
  }, [isLoggedIn, setActiveTab, setIsHubMode]);

  useEffect(() => {
    if (isLoggedIn && isHubMode) {
      loadWarnings();
    }
  }, [isLoggedIn, isHubMode, loadWarnings]);

  useEffect(() => {
    if (isLoggedIn && !selectedHouse) {
      loadHouses().catch(error => showToast(error.message, 'error'));
    }
  }, [isLoggedIn, loadHouses, selectedHouse, showToast]);

  useEffect(() => {
    if (isLoggedIn && activeTab !== 'finance') {
      loadTabData(activeTab, selectedHouse?.id);
    }
  }, [activeTab, isLoggedIn, loadTabData, selectedHouse?.id, selectedMonth, viewDate]);

  useEffect(() => {
    if (activeTab !== 'finance' || !selectedHouse?.id) return;
    loadTransactions(selectedHouse.id).catch(error => console.error('Lỗi khi tải giao dịch:', error.message));
  }, [activeTab, loadTransactions, selectedHouse?.id]);

  return {
    loadHouseData,
    loadTabData,
  };
};
