import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';

// --- Tách Component & Utils (Giai đoạn 1 & 2) ---

import ToastNotification from './components/common/Toast';
import ConfirmDialog from './components/common/ConfirmDialog';
import PermissionDenied from './components/common/PermissionDenied';

import Header from './components/layout/Header';
import SearchAddBar from './components/layout/SearchAddBar';
import AppFooter from './components/layout/AppFooter';
import AppOverlays from './components/layout/AppOverlays';
import { useHouseData } from './hooks/useHouseData';
import { monthLabels, useAppDerivedData } from './hooks/useAppDerivedData';
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

const AuthView = lazy(() => import('./pages/AuthView'));
const HubView = lazy(() => import('./pages/HubView'));
const DashboardView = lazy(() => import('./pages/DashboardView'));
const RoomsView = lazy(() => import('./pages/RoomsView'));
const BillsView = lazy(() => import('./pages/BillsView'));
const MetersView = lazy(() => import('./pages/MetersView'));
const FinanceView = lazy(() => import('./pages/FinanceView'));
const SavingsView = lazy(() => import('./pages/SavingsView'));
const AiChatView = lazy(() => import('./pages/AiChatView'));
const ProfileView = lazy(() => import('./pages/ProfileView'));
const HouseSelectionView = lazy(() => import('./pages/HouseSelectionView'));
const FundView = lazy(() => import('./pages/FundView'));
const FastInputView = lazy(() => import('./pages/FastInputView'));
const SettingsView = lazy(() => import('./pages/SettingsView'));

const PageLoading = () => (
  <div className="flex-1 flex items-center justify-center p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
    Đang tải...
  </div>
);

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
  const [viewDate, setViewDate] = useState(new Date());
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('this-month');
  const [isFinanceStatsOpen, setIsFinanceStatsOpen] = useState(true);
  const [isSavingsStatsOpen, setIsSavingsStatsOpen] = useState(true);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
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

  // Tự động tắt hiệu ứng nhấp nháy đỏ (highlight) sau 4 giây
  useEffect(() => {
    if (highlightedItemId) {
      const timer = setTimeout(() => {
        setHighlightedItemId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId]);

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

  useEffect(() => {
    const handleUnauthorized = () => handleLogout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [handleLogout]);

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

  const handlePrevMonth = () => { setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; }); };
  const handleNextMonth = () => { setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; }); };
  const monthDisplay = `Tháng ${viewDate.getMonth() + 1}, ${viewDate.getFullYear()}`;

  // ==========================================
  // 6. ACTION HANDLERS (CRUD)
  // ==========================================

  // ==========================================
  // 7. RENDER QUYẾT ĐỊNH LUỒNG
  // ==========================================

  // Các tab hiển thị độc lập, không cần thiết phải ở trong một House cụ thể
  const isGlobalTab = ['savings', 'ai', 'profile', 'fund', 'fast_input'].includes(activeTab);

  // 1. CHƯA ĐĂNG NHẬP -> HIỂN THỊ FORM LOGIN/REGISTER
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-left animate-in fade-in duration-700">
        <ToastNotification toast={toast} />
        <Suspense fallback={<PageLoading />}>
          <AuthView setIsLoggedIn={setIsLoggedIn} setUser={setUser} showToast={showToast} />
        </Suspense>
      </div>
    );
  }

  // 2. MÀN HÌNH HUB TỔNG QUAN (Ngay sau khi đăng nhập)
  if (isLoggedIn && isHubMode) {
    return (
      <Suspense fallback={<PageLoading />}>
        <HubView
          user={user}
          houses={houses}
          setIsHubMode={setIsHubMode}
          setActiveTab={setActiveTab}
          setSelectedHouse={setSelectedHouse}
          setConfig={setConfig}
          setSearchQuery={setSearchQuery}
          setEditingHouse={setEditingHouse}
          setIsAiCreateHouseOpen={setIsAiCreateHouseOpen}
          setIsAiPromptModalOpen={setIsAiPromptModalOpen}
          setAiPrompt={setAiPrompt}
          setIsListening={setIsListening}
          showToast={showToast}
          handleLogout={handleLogout}
          toast={toast}
          dashboardWarnings={dashboardWarnings}
          setHighlightedItemId={setHighlightedItemId}
        />
      </Suspense>
    );
  }

  // 3. ĐÃ ĐĂNG NHẬP NHƯNG CHƯA CHỌN CƠ SỞ (Đang ở mode Quản lý nhà)
  if (isLoggedIn && !selectedHouse && !isGlobalTab) {
    return (
      <Suspense fallback={<PageLoading />}>
        <HouseSelectionView
          user={user}
          houses={houses}
          houseSearchQuery={houseSearchQuery}
          setHouseSearchQuery={setHouseSearchQuery}
          selectedStatsHouses={selectedStatsHouses}
          setSelectedStatsHouses={setSelectedStatsHouses}
          setIsHubMode={setIsHubMode}
          handleLogout={handleLogout}
          setSelectedHouse={setSelectedHouse}
          setConfig={setConfig}
          setActiveTab={setActiveTab}
          setSearchQuery={setSearchQuery}
          handleOpenShare={handleOpenShare}
          setEditingHouse={setEditingHouse}
          setIsAiCreateHouseOpen={setIsAiCreateHouseOpen}
          handleDeleteHouse={handleDeleteHouse}
          toast={toast}
          confirmDialog={confirmDialog}
          closeConfirmDialog={closeConfirmDialog}
          isShareModalOpen={isShareModalOpen}
          setIsShareModalOpen={setIsShareModalOpen}
          sharingHouse={sharingHouse}
          setSharingHouse={setSharingHouse}
          assignForm={assignForm}
          setAssignForm={setAssignForm}
          handleAssignRole={handleAssignRole}
          isAiCreateHouseOpen={isAiCreateHouseOpen}
          handleAddHouse={handleAddHouse}
          isAiPromptModalOpen={isAiPromptModalOpen}
          setIsAiPromptModalOpen={setIsAiPromptModalOpen}
          setIsListening={setIsListening}
          aiFeedback={aiFeedback}
          setAiFeedback={setAiFeedback}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          handleMicClick={handleMicClick}
          isListening={isListening}
          handleAiGenerateHouse={handleAiGenerateHouse}
          editingHouse={editingHouse}
          setHighlightedItemId={setHighlightedItemId}
        />
      </Suspense>
    );
  }

  // MÀN HÌNH NHẬP NHANH BẰNG AI (Full screen)
  if (activeTab === 'fast_input') {
    return (
      <div className="h-screen bg-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-800 shadow-2xl overflow-hidden">
        <ToastNotification toast={toast} />
        <Suspense fallback={<PageLoading />}>
          <FastInputView setActiveTab={setActiveTab} showToast={showToast} />
        </Suspense>
      </div>
    );
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

      {/* KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH */}
      <main className="flex-1 w-full overflow-y-auto px-4 pt-2 pb-32 no-scrollbar scroll-smooth">
        <Suspense fallback={<PageLoading />}>

        {activeTab === 'dashboard' && <DashboardView
          shouldShowMeterBanner={shouldShowMeterBanner}
          setActiveTab={setActiveTab}
          dashboardSummary={dashboardSummary}
          canViewProfit={canViewProfit}
          isOwnerOrAdmin={isOwnerOrAdmin}
          revenueChartData={revenueChartData}
        />
        }

        {activeTab === 'rooms' && <RoomsView
          currentRooms={currentRooms}
          setEditingRoom={setEditingRoom}
          setIsAddRoomModalOpen={setIsAddRoomModalOpen}
          isManagerOrAbove={isManagerOrAbove}
          highlightedItemId={highlightedItemId}
          setHighlightedItemId={setHighlightedItemId}
        />
        }

        {activeTab === 'bills' && <BillsView
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          monthDisplay={monthDisplay}
          billStats={billStats}
          currentBills={currentBills}
          setBottomSheet={setBottomSheet}
          highlightedItemId={highlightedItemId}
          setHighlightedItemId={setHighlightedItemId}
        />
        }

        {activeTab === 'meters_list' && <MetersView
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          monthDisplay={monthDisplay}
          summary={meterSummary}
          config={config}
          currentMeters={currentMeters}
          handleUpdateOldMeterUI={handleUpdateOldMeterUI}
          handleUpdateMeterUI={handleUpdateMeterUI}
          setEditingMeter={setEditingMeter}
          setIsAddMeterModalOpen={setIsAddMeterModalOpen}
          setMappingMeter={setMappingMeter}
          handleSaveMetersAndGenerateBills={handleSaveMetersAndGenerateBills}
          viewDate={viewDate}
          rooms={rooms}
          highlightedItemId={highlightedItemId}
          setHighlightedItemId={setHighlightedItemId}
        />
        }

        {activeTab === 'finance' && canAccessFinance && <FinanceView
          canViewProfit={canViewProfit}
          isFinanceStatsOpen={isFinanceStatsOpen}
          setIsFinanceStatsOpen={setIsFinanceStatsOpen}
          isMonthOpen={isMonthOpen}
          setIsMonthOpen={setIsMonthOpen}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          monthLabels={monthLabels}
          financeStats={financeStats}
          currentTransactions={currentTransactions}
          canManageTransactions={canManageTransactions}
          setEditingTransaction={setEditingTransaction}
          setTxType={setTxType}
          setSelectedCat={setSelectedCat}
          setIsAddTransactionModalOpen={setIsAddTransactionModalOpen}
        />
        }

        {activeTab === 'savings' && <SavingsView
          isSavingsStatsOpen={isSavingsStatsOpen}
          setIsSavingsStatsOpen={setIsSavingsStatsOpen}
          uniqueBankNames={uniqueBankNames}
          collapsedSavingsBanks={collapsedSavingsBanks}
          setCollapsedSavingsBanks={setCollapsedSavingsBanks}
          summarySavings={summarySavings}
          currentSavings={currentSavings}
          unselectedSavingsBanks={unselectedSavingsBanks}
          setUnselectedSavingsBanks={setUnselectedSavingsBanks}
          setEditingSaving={setEditingSaving}
          setIsAddSavingModalOpen={setIsAddSavingModalOpen}
          highlightedItemId={highlightedItemId}
          setHighlightedItemId={setHighlightedItemId}
        />
        }

        {activeTab === 'fund' && <FundView
          showToast={showToast}
          requestConfirm={requestConfirm}
          setActiveTab={setActiveTab}
        />}

        {activeTab === 'ai' && <AiChatView
          aiMessages={aiMessages}
          isAiLoading={isAiLoading}
          handleAiChat={handleAiChat}
          setAiMessages={setAiMessages}
          requestConfirm={requestConfirm}
          showToast={showToast}
          executeAiAction={executeAiAction}
        />
        }

        {activeTab === 'fast_input' && (
          // Dự phòng render ở đây
          <FastInputView setActiveTab={setActiveTab} showToast={showToast} />
        )}

        {activeTab === 'profile' && <ProfileView
          user={user}
          getRoleLabel={getRoleLabel}
          handleLogout={handleLogout}
          changePasswordForm={changePasswordForm}
          setChangePasswordForm={setChangePasswordForm}
          handleChangePassword={handleChangePassword}
        />
        }

        {activeTab === 'settings' && isOwnerOrAdmin && (
          <SettingsView
            user={user}
            config={config}
            setConfig={setConfig}
            settingsExpanded={settingsExpanded}
            setSettingsExpanded={setSettingsExpanded}
            handleLogout={handleLogout}
            handleSaveConfig={handleSaveConfig}
            handleUploadQR={handleUploadQR}
            qrFileRef={qrFileRef}
            isScanningQR={isScanningQR}
            changePasswordForm={changePasswordForm}
            setChangePasswordForm={setChangePasswordForm}
            handleChangePassword={handleChangePassword}
          />
        )}


        {/* LỖI PHÂN QUYỀN */}
        {((activeTab === 'finance' && !canAccessFinance) || (activeTab === 'settings' && !isManagerOrAbove)) && (
          <PermissionDenied onBack={() => setActiveTab('dashboard')} />
        )}
        </Suspense>
      </main>

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
