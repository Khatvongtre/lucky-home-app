import { useState } from 'react';

export const useAppUiState = () => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [houseSearchQuery, setHouseSearchQuery] = useState('');
  const [selectedStatsHouses, setSelectedStatsHouses] = useState([]);
  const [savingMaturityFilter, setSavingMaturityFilter] = useState({ to: '' });
  const [unselectedSavingsBanks, setUnselectedSavingsBanks] = useState([]);
  const [collapsedSavingsBanks, setCollapsedSavingsBanks] = useState([]);
  const [settingsExpanded, setSettingsExpanded] = useState({ services: true, qr: false, pass: false });
  const [isFinanceStatsOpen, setIsFinanceStatsOpen] = useState(true);
  const [isSavingsStatsOpen, setIsSavingsStatsOpen] = useState(false);

  return {
    showQuickMenu,
    setShowQuickMenu,
    searchQuery,
    setSearchQuery,
    houseSearchQuery,
    setHouseSearchQuery,
    selectedStatsHouses,
    setSelectedStatsHouses,
    savingMaturityFilter,
    setSavingMaturityFilter,
    unselectedSavingsBanks,
    setUnselectedSavingsBanks,
    collapsedSavingsBanks,
    setCollapsedSavingsBanks,
    settingsExpanded,
    setSettingsExpanded,
    isFinanceStatsOpen,
    setIsFinanceStatsOpen,
    isSavingsStatsOpen,
    setIsSavingsStatsOpen,
  };
};
