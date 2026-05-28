import React, { Suspense, lazy } from 'react';
import PermissionDenied from '../common/PermissionDenied';
import PageLoading from '../common/PageLoading';
import { monthLabels } from '../../hooks/useAppDerivedData';

const DashboardView = lazy(() => import('../../pages/DashboardView'));
const RoomsView = lazy(() => import('../../pages/RoomsView'));
const BillsView = lazy(() => import('../../pages/BillsView'));
const MetersView = lazy(() => import('../../pages/MetersView'));
const FinanceView = lazy(() => import('../../pages/FinanceView'));
const SavingsView = lazy(() => import('../../pages/SavingsView'));
const AiChatView = lazy(() => import('../../pages/AiChatView'));
const ProfileView = lazy(() => import('../../pages/ProfileView'));
const FundView = lazy(() => import('../../pages/FundView'));
const FastInputView = lazy(() => import('../../pages/FastInputView'));
const SettingsView = lazy(() => import('../../pages/SettingsView'));

const AppMainContent = ({
  activeTab,
  setActiveTab,
  setIsHubMode,
  aiState,
  billsState,
  dashboardState,
  feedback,
  financeState,
  highlightState,
  meterState,
  monthState,
  permissions,
  profileState,
  roomsState,
  savingsState,
  settingsState,
  selectedHouse,
}) => {
  const { requestConfirm, showToast } = feedback;
  const { highlightedItemId, setHighlightedItemId } = highlightState;
  const {
    canAccessFinance,
    canManageTransactions,
    canViewProfit,
    getRoleLabel,
    isManagerOrAbove,
    isOwnerOrAdmin,
  } = permissions;
  const {
    handleNextMonth,
    handlePrevMonth,
    isMonthOpen,
    monthDisplay,
    selectedMonth,
    setIsMonthOpen,
    setSelectedMonth,
  } = monthState;

  return (
    <main className="flex-1 w-full overflow-y-auto px-4 pt-2 pb-32 no-scrollbar scroll-smooth">
      <Suspense fallback={<PageLoading />}>
        {activeTab === 'dashboard' && (
          <DashboardView
            shouldShowMeterBanner={dashboardState.shouldShowMeterBanner}
            setActiveTab={setActiveTab}
            dashboardSummary={dashboardState.dashboardSummary}
            canViewProfit={canViewProfit}
            isOwnerOrAdmin={isOwnerOrAdmin}
            revenueChartData={dashboardState.revenueChartData}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsView
            currentRooms={roomsState.currentRooms}
            setEditingRoom={roomsState.setEditingRoom}
            setIsAddRoomModalOpen={roomsState.setIsAddRoomModalOpen}
            isManagerOrAbove={isManagerOrAbove}
            highlightedItemId={highlightedItemId}
            setHighlightedItemId={setHighlightedItemId}
            showToast={showToast}
            requestConfirm={requestConfirm}
            selectedHouse={selectedHouse}
          />
        )}

        {activeTab === 'bills' && (
          <BillsView
            handlePrevMonth={handlePrevMonth}
            handleNextMonth={handleNextMonth}
            monthDisplay={monthDisplay}
            billStats={billsState.billStats}
            currentBills={billsState.currentBills}
            setBottomSheet={billsState.setBottomSheet}
            highlightedItemId={highlightedItemId}
            setHighlightedItemId={setHighlightedItemId}
          />
        )}

        {activeTab === 'meters_list' && (
          <MetersView
            handlePrevMonth={handlePrevMonth}
            handleNextMonth={handleNextMonth}
            monthDisplay={monthDisplay}
            summary={meterState.meterSummary}
            config={meterState.config}
            currentMeters={meterState.currentMeters}
            handleUpdateOldMeterUI={meterState.handleUpdateOldMeterUI}
            handleUpdateMeterUI={meterState.handleUpdateMeterUI}
            setEditingMeter={meterState.setEditingMeter}
            setIsAddMeterModalOpen={meterState.setIsAddMeterModalOpen}
            setMappingMeter={meterState.setMappingMeter}
            isSavingMeterReadings={meterState.isSavingMeterReadings}
            savingMeterId={meterState.savingMeterId}
            generatingRoomId={meterState.generatingRoomId}
            handleSaveMeterReading={meterState.handleSaveMeterReading}
            handleGenerateBills={meterState.handleGenerateBills}
            handleGenerateBillForRoom={meterState.handleGenerateBillForRoom}
            showToast={meterState.showToast}
            viewDate={meterState.viewDate}
            rooms={meterState.rooms}
            loadHouseData={meterState.loadHouseData}
            selectedHouse={selectedHouse}
            highlightedItemId={highlightedItemId}
            setHighlightedItemId={setHighlightedItemId}
          />
        )}

        {activeTab === 'finance' && canAccessFinance && (
          <FinanceView
            canViewProfit={canViewProfit}
            isFinanceStatsOpen={financeState.isFinanceStatsOpen}
            setIsFinanceStatsOpen={financeState.setIsFinanceStatsOpen}
            isMonthOpen={isMonthOpen}
            setIsMonthOpen={setIsMonthOpen}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            monthLabels={monthLabels}
            financeStats={financeState.financeStats}
            currentTransactions={financeState.currentTransactions}
            canManageTransactions={canManageTransactions}
            setEditingTransaction={financeState.setEditingTransaction}
            setTxType={financeState.setTxType}
            setSelectedCat={financeState.setSelectedCat}
            setIsAddTransactionModalOpen={financeState.setIsAddTransactionModalOpen}
          />
        )}

        {activeTab === 'savings' && (
          <SavingsView
            isSavingsStatsOpen={savingsState.isSavingsStatsOpen}
            setIsSavingsStatsOpen={savingsState.setIsSavingsStatsOpen}
            uniqueBankNames={savingsState.uniqueBankNames}
            collapsedSavingsBanks={savingsState.collapsedSavingsBanks}
            setCollapsedSavingsBanks={savingsState.setCollapsedSavingsBanks}
            summarySavings={savingsState.summarySavings}
            currentSavings={savingsState.currentSavings}
            savingMaturityFilter={savingsState.savingMaturityFilter}
            setSavingMaturityFilter={savingsState.setSavingMaturityFilter}
            unselectedSavingsBanks={savingsState.unselectedSavingsBanks}
            setUnselectedSavingsBanks={savingsState.setUnselectedSavingsBanks}
            setEditingSaving={savingsState.setEditingSaving}
            setIsAddSavingModalOpen={savingsState.setIsAddSavingModalOpen}
            highlightedItemId={highlightedItemId}
            setHighlightedItemId={setHighlightedItemId}
          />
        )}

        {activeTab === 'fund' && (
          <FundView
            showToast={showToast}
            requestConfirm={requestConfirm}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'ai' && (
          <AiChatView
            aiMessages={aiState.aiMessages}
            isAiLoading={aiState.isAiLoading}
            handleAiChat={aiState.handleAiChat}
            setAiMessages={aiState.setAiMessages}
            requestConfirm={requestConfirm}
            showToast={showToast}
            executeAiAction={aiState.executeAiAction}
          />
        )}

        {activeTab === 'fast_input' && (
          <FastInputView setActiveTab={setActiveTab} setIsHubMode={setIsHubMode} showToast={showToast} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={profileState.user}
            getRoleLabel={getRoleLabel}
            handleLogout={profileState.handleLogout}
            changePasswordForm={profileState.changePasswordForm}
            setChangePasswordForm={profileState.setChangePasswordForm}
            handleChangePassword={profileState.handleChangePassword}
          />
        )}

        {activeTab === 'settings' && isOwnerOrAdmin && (
          <SettingsView
            user={settingsState.user}
            config={settingsState.config}
            setConfig={settingsState.setConfig}
            settingsExpanded={settingsState.settingsExpanded}
            setSettingsExpanded={settingsState.setSettingsExpanded}
            handleLogout={settingsState.handleLogout}
            handleSaveConfig={settingsState.handleSaveConfig}
            handleUploadQR={settingsState.handleUploadQR}
            qrFileRef={settingsState.qrFileRef}
            isScanningQR={settingsState.isScanningQR}
            changePasswordForm={settingsState.changePasswordForm}
            setChangePasswordForm={settingsState.setChangePasswordForm}
            handleChangePassword={settingsState.handleChangePassword}
          />
        )}

        {((activeTab === 'finance' && !canAccessFinance) || (activeTab === 'settings' && !isManagerOrAbove)) && (
          <PermissionDenied onBack={() => setActiveTab('dashboard')} />
        )}
      </Suspense>
    </main>
  );
};

export default AppMainContent;
