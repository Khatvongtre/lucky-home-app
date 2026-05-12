import React, { Suspense, lazy } from 'react';
import ToastNotification from '../common/Toast';

const AuthView = lazy(() => import('../../pages/AuthView'));
const HubView = lazy(() => import('../../pages/HubView'));
const HouseSelectionView = lazy(() => import('../../pages/HouseSelectionView'));
const FastInputView = lazy(() => import('../../pages/FastInputView'));

const PageLoading = () => (
  <div className="flex-1 flex items-center justify-center p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
    Dang tai...
  </div>
);

const AppEntryRoutes = ({
  activeTab,
  authState,
  fastInputState,
  houseSelectionState,
  hubState,
  isGlobalTab,
}) => {
  const { isLoggedIn, setIsLoggedIn, setUser, showToast, toast } = authState;

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

  if (hubState.isHubMode) {
    return (
      <Suspense fallback={<PageLoading />}>
        <HubView
          user={hubState.user}
          houses={hubState.houses}
          setIsHubMode={hubState.setIsHubMode}
          setActiveTab={hubState.setActiveTab}
          setSelectedHouse={hubState.setSelectedHouse}
          setConfig={hubState.setConfig}
          setSearchQuery={hubState.setSearchQuery}
          setEditingHouse={hubState.setEditingHouse}
          setIsAiCreateHouseOpen={hubState.setIsAiCreateHouseOpen}
          setIsAiPromptModalOpen={hubState.setIsAiPromptModalOpen}
          setAiPrompt={hubState.setAiPrompt}
          setIsListening={hubState.setIsListening}
          showToast={showToast}
          handleLogout={hubState.handleLogout}
          toast={toast}
          dashboardWarnings={hubState.dashboardWarnings}
          setHighlightedItemId={hubState.setHighlightedItemId}
        />
      </Suspense>
    );
  }

  if (!houseSelectionState.selectedHouse && !isGlobalTab) {
    return (
      <Suspense fallback={<PageLoading />}>
        <HouseSelectionView
          user={houseSelectionState.user}
          houses={houseSelectionState.houses}
          houseSearchQuery={houseSelectionState.houseSearchQuery}
          setHouseSearchQuery={houseSelectionState.setHouseSearchQuery}
          selectedStatsHouses={houseSelectionState.selectedStatsHouses}
          setSelectedStatsHouses={houseSelectionState.setSelectedStatsHouses}
          setIsHubMode={houseSelectionState.setIsHubMode}
          handleLogout={houseSelectionState.handleLogout}
          setSelectedHouse={houseSelectionState.setSelectedHouse}
          setConfig={houseSelectionState.setConfig}
          setActiveTab={houseSelectionState.setActiveTab}
          setSearchQuery={houseSelectionState.setSearchQuery}
          handleOpenShare={houseSelectionState.handleOpenShare}
          setEditingHouse={houseSelectionState.setEditingHouse}
          setIsAiCreateHouseOpen={houseSelectionState.setIsAiCreateHouseOpen}
          handleDeleteHouse={houseSelectionState.handleDeleteHouse}
          toast={toast}
          confirmDialog={houseSelectionState.confirmDialog}
          closeConfirmDialog={houseSelectionState.closeConfirmDialog}
          isShareModalOpen={houseSelectionState.isShareModalOpen}
          setIsShareModalOpen={houseSelectionState.setIsShareModalOpen}
          sharingHouse={houseSelectionState.sharingHouse}
          setSharingHouse={houseSelectionState.setSharingHouse}
          assignForm={houseSelectionState.assignForm}
          setAssignForm={houseSelectionState.setAssignForm}
          handleAssignRole={houseSelectionState.handleAssignRole}
          isAiCreateHouseOpen={houseSelectionState.isAiCreateHouseOpen}
          handleAddHouse={houseSelectionState.handleAddHouse}
          isAiPromptModalOpen={houseSelectionState.isAiPromptModalOpen}
          setIsAiPromptModalOpen={houseSelectionState.setIsAiPromptModalOpen}
          setIsListening={houseSelectionState.setIsListening}
          aiFeedback={houseSelectionState.aiFeedback}
          setAiFeedback={houseSelectionState.setAiFeedback}
          aiPrompt={houseSelectionState.aiPrompt}
          setAiPrompt={houseSelectionState.setAiPrompt}
          handleMicClick={houseSelectionState.handleMicClick}
          isListening={houseSelectionState.isListening}
          handleAiGenerateHouse={houseSelectionState.handleAiGenerateHouse}
          editingHouse={houseSelectionState.editingHouse}
          setHighlightedItemId={houseSelectionState.setHighlightedItemId}
        />
      </Suspense>
    );
  }

  if (activeTab === 'fast_input') {
    return (
      <div className="h-screen bg-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-800 shadow-2xl overflow-hidden">
        <ToastNotification toast={toast} />
        <Suspense fallback={<PageLoading />}>
          <FastInputView setActiveTab={fastInputState.setActiveTab} showToast={showToast} />
        </Suspense>
      </div>
    );
  }

  return null;
};

export default AppEntryRoutes;
