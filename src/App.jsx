import React, { useState, useCallback } from 'react';

// --- Tách Component & Utils (Giai đoạn 1 & 2) ---

import ToastNotification from './components/common/Toast';
import ConfirmDialog from './components/common/ConfirmDialog';

import Header from './components/layout/Header';
import SearchAddBar from './components/layout/SearchAddBar';
import AppFooter from './components/layout/AppFooter';
import AppOverlays from './components/layout/AppOverlays';
import AppMainContent from './components/layout/AppMainContent';
import AppEntryRoutes from './components/layout/AppEntryRoutes';
import { useHouseData } from './hooks/useHouseData';
import { useAppDerivedData } from './hooks/useAppDerivedData';
import { useSavings } from './hooks/useSavings';
import { useBills } from './hooks/useBills';
import { useFinance } from './hooks/useFinance';
import { useMeters } from './hooks/useMeters';
import { useRooms } from './hooks/useRooms';
import { useHouses } from './hooks/useHouses';
import { useAiAssistant } from './hooks/useAiAssistant';
import { useSettings } from './hooks/useSettings';
import { useAuthSession } from './hooks/useAuthSession';
import { useNavigationHistory } from './hooks/useNavigationHistory';
import { usePermissions } from './hooks/usePermissions';
import { useAppDataLoader } from './hooks/useAppDataLoader';
import { useFeedback } from './hooks/useFeedback';
import { useAutoClearHighlight } from './hooks/useAutoClearHighlight';
import { useMonthNavigation } from './hooks/useMonthNavigation';
import { useUnauthorizedLogout } from './hooks/useUnauthorizedLogout';

// ==========================================
// CẤU HÌNH API BACKEND (.NET 8)
// ==========================================
const API_URL = import.meta.env.VITE_API_URL;
if (import.meta.env.DEV) {
  console.log("API URL:", API_URL);
}

// ==========================================
// ỨNG DỤNG CHÍNH
// ==========================================
const App = () => {
  // ==========================================
  // 1. GLOBAL STATES
  // ==========================================

  const [isHubMode, setIsHubMode] = useState(true); // NEW: Manage global HUB screen visibility
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [bottomSheet, setBottomSheet] = useState(null);
  const [houseSearchQuery, setHouseSearchQuery] = useState("");
  const [selectedStatsHouses, setSelectedStatsHouses] = useState([]);
  const [unselectedSavingsBanks, setUnselectedSavingsBanks] = useState([]);
  const [collapsedSavingsBanks, setCollapsedSavingsBanks] = useState([]);
  const [settingsExpanded, setSettingsExpanded] = useState({ services: true, qr: false, pass: false });

  const [config, setConfig] = useState({});
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const {
    viewDate,
    isMonthOpen,
    setIsMonthOpen,
    selectedMonth,
    setSelectedMonth,
    handlePrevMonth,
    handleNextMonth,
    monthDisplay,
  } = useMonthNavigation();
  const [isFinanceStatsOpen, setIsFinanceStatsOpen] = useState(true);
  const [isSavingsStatsOpen, setIsSavingsStatsOpen] = useState(true);
  const { highlightedItemId, setHighlightedItemId } = useAutoClearHighlight();
  const {
    houses,
    setHouses,
    rooms,
    meters,
    setMeters,
    dashboardWarnings,
    transactions,
    dashboardSummary,
    bills,
    setBills,
    billStats,
    loadHouses,
    loadWarnings,
    loadDashboardData,
    loadRoomsData,
    loadMetersData,
    loadBillsData,
    loadTransactions,
    resetHouseData,
  } = useHouseData({ viewDate, selectedMonth });

  // ==========================================
  // 2. HELPER FUNCTIONS & EFFECTS
  // ==========================================

  const {
    toast,
    confirmDialog,
    showToast,
    requestConfirm,
    closeConfirmDialog,
  } = useFeedback();

  const {
    isLoggedIn,
    setIsLoggedIn,
    user,
    setUser,
    changePasswordForm,
    setChangePasswordForm,
    handleLogout: clearAuthSession,
    handleChangePassword,
  } = useAuthSession({ showToast });

  const {
    isOwnerOrAdmin,
    isManagerOrAbove,
    canAccessFinance,
    canViewProfit,
    canManageTransactions,
    getRoleLabel,
  } = usePermissions({ selectedHouse, user });

  const {
    savings,
    isAddSavingModalOpen,
    setIsAddSavingModalOpen,
    editingSaving,
    setEditingSaving,
    loadSavings,
    resetSavings,
    handleAddSaving,
    handleDeleteSaving,
  } = useSavings({ showToast, requestConfirm });

  const {
    qrFileRef,
    isScanningQR,
    handleSaveConfig,
    handleUploadQR,
  } = useSettings({
    houseId: selectedHouse?.id,
    setConfig,
    config,
    showToast,
  });

  const { loadHouseData } = useAppDataLoader({
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
  });

  const {
    isAiCreateHouseOpen,
    setIsAiCreateHouseOpen,
    editingHouse,
    setEditingHouse,
    isAiPromptModalOpen,
    setIsAiPromptModalOpen,
    aiPrompt,
    setAiPrompt,
    isListening,
    setIsListening,
    aiFeedback,
    setAiFeedback,
    isShareModalOpen,
    setIsShareModalOpen,
    sharingHouse,
    setSharingHouse,
    assignForm,
    setAssignForm,
    handleOpenShare,
    handleAssignRole,
    handleAddHouse,
    handleDeleteHouse,
    handleAiGenerateHouse,
    handleMicClick,
  } = useHouses({
    selectedHouseId: selectedHouse?.id,
    setSelectedHouse,
    setHouses,
    showToast,
    requestConfirm,
  });

  const {
    isAddRoomModalOpen,
    setIsAddRoomModalOpen,
    editingRoom,
    setEditingRoom,
    handleAddRoom,
    handleDeleteRoom,
  } = useRooms({
    houseId: selectedHouse?.id,
    loadHouseData,
    showToast,
    requestConfirm,
  });

  const {
    isGeneratingImage,
    executeGenerateBills,
    handleDiscountUpdate,
    handlePayBill,
    handleDeleteBill,
    handleShareZaloImage,
  } = useBills({
    bills,
    setBills,
    bottomSheet,
    setBottomSheet,
    selectedHouse,
    loadHouseData,
    showToast,
    requestConfirm,
    setIsOverwriteModalOpen,
  });

  const {
    isAddTransactionModalOpen,
    setIsAddTransactionModalOpen,
    editingTransaction,
    setEditingTransaction,
    txType,
    setTxType,
    selectedCat,
    setSelectedCat,
    isCatOpen,
    setIsCatOpen,
    handleAddTx,
    handleDeleteTransaction,
  } = useFinance({
    houseId: selectedHouse?.id,
    canManageTransactions,
    loadHouseData,
    showToast,
    requestConfirm,
  });

  const {
    isAddMeterModalOpen,
    setIsAddMeterModalOpen,
    editingMeter,
    setEditingMeter,
    mappingMeter,
    setMappingMeter,
    handleUpdateOldMeterUI,
    handleUpdateMeterUI,
    handleSaveMeter,
    handleDeleteMeter,
    handleSaveMeterMapping,
    handleSaveMetersAndGenerateBills,
  } = useMeters({
    meters,
    setMeters,
    houseId: selectedHouse?.id,
    viewDate,
    loadHouseData,
    showToast,
    requestConfirm,
  });

  const {
    aiMessages,
    setAiMessages,
    isAiLoading,
    actionToSelectHouse,
    setActionToSelectHouse,
    setPendingAction,
    resetAiMessages,
    executeAiAction,
    handleAiChat,
  } = useAiAssistant({
    houseId: selectedHouse?.id,
    showToast,
    setActiveTab,
    setEditingHouse,
    setIsAiCreateHouseOpen,
    setEditingSaving,
    setIsAddSavingModalOpen,
    setEditingRoom,
    setIsAddRoomModalOpen,
    setEditingTransaction,
    setIsAddTransactionModalOpen,
  });

  const {
    goBack,
    resetNavigationHistory,
  } = useNavigationHistory({
    isHubMode,
    selectedHouse,
    activeTab,
    setIsHubMode,
    setSelectedHouse,
    setActiveTab,
    setHighlightedItemId,
  });

  const resetAppAfterLogout = useCallback(() => {
    setSelectedHouse(null);
    setIsHubMode(true);
    setActiveTab('dashboard');
    resetHouseData();
    resetSavings();
    resetAiMessages();
    resetNavigationHistory();
  }, [resetAiMessages, resetHouseData, resetNavigationHistory, resetSavings]);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    resetAppAfterLogout();
  }, [clearAuthSession, resetAppAfterLogout]);

  useUnauthorizedLogout(handleLogout);

  const {
    currentRooms,
    currentMeters,
    currentTransactions,
    currentBills,
    currentSavings,
    uniqueBankNames,
    summarySavings,
    financeStats,
    revenueChartData,
    shouldShowMeterBanner,
    meterSummary,
  } = useAppDerivedData({
    rooms,
    meters,
    transactions,
    bills,
    savings,
    searchQuery,
    unselectedSavingsBanks,
    selectedHouse,
    dashboardSummary,
    config,
  });

  // ==========================================
  // 6. ACTION HANDLERS (CRUD)
  // ==========================================

  // ==========================================
  // 7. RENDER QUYẾT ĐỊNH LUỒNG
  // ==========================================

  // Các tab hiển thị độc lập, không cần thiết phải ở trong một House cụ thể
  const isGlobalTab = ['savings', 'ai', 'profile', 'fund', 'fast_input'].includes(activeTab);

  const entryRoute = (
    <AppEntryRoutes
      activeTab={activeTab}
      isGlobalTab={isGlobalTab}
      authState={{
        isLoggedIn,
        setIsLoggedIn,
        setUser,
        showToast,
        toast,
      }}
      fastInputState={{
        setActiveTab,
      }}
      hubState={{
        isHubMode,
        user,
        houses,
        setIsHubMode,
        setActiveTab,
        setSelectedHouse,
        setConfig,
        setSearchQuery,
        setEditingHouse,
        setIsAiCreateHouseOpen,
        setIsAiPromptModalOpen,
        setAiPrompt,
        setIsListening,
        handleLogout,
        dashboardWarnings,
        setHighlightedItemId,
      }}
      houseSelectionState={{
        selectedHouse,
        user,
        houses,
        houseSearchQuery,
        setHouseSearchQuery,
        selectedStatsHouses,
        setSelectedStatsHouses,
        setIsHubMode,
        handleLogout,
        setSelectedHouse,
        setConfig,
        setActiveTab,
        setSearchQuery,
        handleOpenShare,
        setEditingHouse,
        setIsAiCreateHouseOpen,
        handleDeleteHouse,
        confirmDialog,
        closeConfirmDialog,
        isShareModalOpen,
        setIsShareModalOpen,
        sharingHouse,
        setSharingHouse,
        assignForm,
        setAssignForm,
        handleAssignRole,
        isAiCreateHouseOpen,
        handleAddHouse,
        isAiPromptModalOpen,
        setIsAiPromptModalOpen,
        setIsListening,
        aiFeedback,
        setAiFeedback,
        aiPrompt,
        setAiPrompt,
        handleMicClick,
        isListening,
        handleAiGenerateHouse,
        editingHouse,
        setHighlightedItemId,
      }}
    />
  );

  if (!isLoggedIn || isHubMode || (!selectedHouse && !isGlobalTab) || activeTab === 'fast_input') {
    return entryRoute;
  }

  // 4. MAIN APP (Khi đã chọn cơ sở, hoặc truy cập Tab có tính Global như Tiết Kiệm)
  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-100 shadow-2xl overflow-hidden">
      <ToastNotification toast={toast} />
      <ConfirmDialog
        dialog={confirmDialog}
        onCancel={() => closeConfirmDialog(false)}
        onConfirm={() => closeConfirmDialog(true)}
      />

      {/* HEADER */}
      <Header
        selectedHouse={selectedHouse}
        activeTab={activeTab}
        isGlobalTab={isGlobalTab}
        isOwnerOrAdmin={isOwnerOrAdmin}
        setIsHubMode={setIsHubMode}
        setSelectedHouse={setSelectedHouse}
        setActiveTab={setActiveTab}
        goBack={goBack}
      />

      <SearchAddBar
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setEditingRoom={setEditingRoom}
        setIsAddRoomModalOpen={setIsAddRoomModalOpen}
        setIsAddTransactionModalOpen={setIsAddTransactionModalOpen}
        setIsAddMeterModalOpen={setIsAddMeterModalOpen}
        setEditingSaving={setEditingSaving}
        setIsAddSavingModalOpen={setIsAddSavingModalOpen}
      />

      <AppMainContent
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aiState={{
          aiMessages,
          isAiLoading,
          handleAiChat,
          setAiMessages,
          executeAiAction,
        }}
        billsState={{
          billStats,
          currentBills,
          setBottomSheet,
        }}
        dashboardState={{
          shouldShowMeterBanner,
          dashboardSummary,
          revenueChartData,
        }}
        feedback={{
          requestConfirm,
          showToast,
        }}
        financeState={{
          isFinanceStatsOpen,
          setIsFinanceStatsOpen,
          financeStats,
          currentTransactions,
          setEditingTransaction,
          setTxType,
          setSelectedCat,
          setIsAddTransactionModalOpen,
        }}
        highlightState={{
          highlightedItemId,
          setHighlightedItemId,
        }}
        meterState={{
          meterSummary,
          config,
          currentMeters,
          handleUpdateOldMeterUI,
          handleUpdateMeterUI,
          setEditingMeter,
          setIsAddMeterModalOpen,
          setMappingMeter,
          handleSaveMetersAndGenerateBills,
          viewDate,
          rooms,
        }}
        monthState={{
          handlePrevMonth,
          handleNextMonth,
          monthDisplay,
          isMonthOpen,
          setIsMonthOpen,
          selectedMonth,
          setSelectedMonth,
        }}
        permissions={{
          canAccessFinance,
          canManageTransactions,
          canViewProfit,
          getRoleLabel,
          isManagerOrAbove,
          isOwnerOrAdmin,
        }}
        profileState={{
          user,
          handleLogout,
          changePasswordForm,
          setChangePasswordForm,
          handleChangePassword,
        }}
        roomsState={{
          currentRooms,
          setEditingRoom,
          setIsAddRoomModalOpen,
        }}
        savingsState={{
          isSavingsStatsOpen,
          setIsSavingsStatsOpen,
          uniqueBankNames,
          collapsedSavingsBanks,
          setCollapsedSavingsBanks,
          summarySavings,
          currentSavings,
          unselectedSavingsBanks,
          setUnselectedSavingsBanks,
          setEditingSaving,
          setIsAddSavingModalOpen,
        }}
        settingsState={{
          user,
          config,
          setConfig,
          settingsExpanded,
          setSettingsExpanded,
          handleLogout,
          handleSaveConfig,
          handleUploadQR,
          qrFileRef,
          isScanningQR,
          changePasswordForm,
          setChangePasswordForm,
          handleChangePassword,
        }}
      />

      <AppFooter
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSearchQuery={setSearchQuery}
        shouldShowMeterBanner={shouldShowMeterBanner}
        canAccessFinance={canAccessFinance}
        showQuickMenu={showQuickMenu}
        setShowQuickMenu={setShowQuickMenu}
        setIsHubMode={setIsHubMode}
        selectedHouse={selectedHouse}
        setEditingRoom={setEditingRoom}
        setIsAddRoomModalOpen={setIsAddRoomModalOpen}
        setIsAddTransactionModalOpen={setIsAddTransactionModalOpen}
        user={user}
        handleLogout={handleLogout}
      />


      <AppOverlays
        API_URL={API_URL}
        actionToSelectHouse={actionToSelectHouse}
        billsState={{
          bottomSheet,
          setBottomSheet,
          config,
          isGeneratingImage,
          handleDiscountUpdate,
          handleShareZaloImage,
          handleDeleteBill,
          handlePayBill,
          isOverwriteModalOpen,
          setIsOverwriteModalOpen,
          executeGenerateBills,
        }}
        financeState={{
          isAddTransactionModalOpen,
          setIsAddTransactionModalOpen,
          handleAddTx,
          handleDeleteTransaction,
          editingTransaction,
          txType,
          setTxType,
          selectedCat,
          setSelectedCat,
          isCatOpen,
          setIsCatOpen,
        }}
        houseSelectionState={{
          houses,
          user,
          setSelectedHouse,
          setConfig,
          setPendingAction,
          setActionToSelectHouse,
        }}
        meterState={{
          mappingMeter,
          setMappingMeter,
          rooms,
          selectedHouse,
          setMeters,
          handleSaveMeterMapping,
          isAddMeterModalOpen,
          setIsAddMeterModalOpen,
          editingMeter,
          setEditingMeter,
          handleSaveMeter,
          handleDeleteMeter,
        }}
        roomState={{
          isAddRoomModalOpen,
          setIsAddRoomModalOpen,
          editingRoom,
          handleAddRoom,
          handleDeleteRoom,
          sharedHeaters: meters.filter(meter => meter.type === 'heater' && meter.houseId === selectedHouse?.id),
        }}
        savingState={{
          isAddSavingModalOpen,
          setIsAddSavingModalOpen,
          editingSaving,
          handleAddSaving,
          handleDeleteSaving,
          uniqueBankNames,
        }}
        permissions={{
          canManageTransactions,
          isManagerOrAbove,
          isOwnerOrAdmin,
        }}
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body { background-color: #f8fafc; margin: 0; padding: 0; width: 100%; height: 100%; min-height: 100vh; overflow: hidden !important; position: static !important; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        textarea, input, select { outline: none; }
      `}</style>
    </div>
  );
}

export default App;
