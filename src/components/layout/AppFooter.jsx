import QuickMenu from './QuickMenu';
import TabBar from './TabBar';

const HIDDEN_FOOTER_TABS = ['savings', 'profile', 'fund', 'ai', 'fast_input'];

const AppFooter = ({
  activeTab,
  setActiveTab,
  setSearchQuery,
  shouldShowMeterBanner,
  canAccessFinance,
  showQuickMenu,
  setShowQuickMenu,
  setIsHubMode,
  selectedHouse,
  setSelectedHouse,
  setEditingRoom,
  setIsAddRoomModalOpen,
  setIsAddTransactionModalOpen,
  user,
  handleLogout,
}) => {
  if (HIDDEN_FOOTER_TABS.includes(activeTab)) return null;

  return (
    <>
      <TabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSearchQuery={setSearchQuery}
        shouldShowMeterBanner={shouldShowMeterBanner}
        canAccessFinance={canAccessFinance}
        showQuickMenu={showQuickMenu}
        setShowQuickMenu={setShowQuickMenu}
        setIsHubMode={setIsHubMode}
        selectedHouse={selectedHouse}
        setSelectedHouse={setSelectedHouse}
      />

      <QuickMenu
        showQuickMenu={showQuickMenu}
        setShowQuickMenu={setShowQuickMenu}
        setEditingRoom={setEditingRoom}
        setIsAddRoomModalOpen={setIsAddRoomModalOpen}
        shouldShowMeterBanner={shouldShowMeterBanner}
        setActiveTab={setActiveTab}
        setIsAddTransactionModalOpen={setIsAddTransactionModalOpen}
        user={user}
        handleLogout={handleLogout}
      />
    </>
  );
};

export default AppFooter;
