import React from 'react';
import { ChevronLeft, User } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';

const TAB_TITLES = {
    dashboard: 'Trang chủ',
    rooms: 'Phòng',
    meters_list: 'Chốt số điện',
    bills: 'Hóa đơn',
    finance: 'Thu chi',
    fund: 'Sổ chi tiêu',
    savings: 'Sổ tiết kiệm',
    ai: 'Chat AI',
    profile: 'Tài khoản',
    settings: 'Cài đặt'
};

const Header = ({
    selectedHouse,
    activeTab,
    isGlobalTab,
    isOwnerOrAdmin,
    setIsHubMode,
    setSelectedHouse,
    setActiveTab,
    setConfig,
    houses,
    setHighlightedItemId,
    setViewDate,
    goBack
}) => {
    return (
        <header className="px-4 h-14 flex items-center justify-between shrink-0 bg-blue-600 text-white z-50 shadow-md relative">
            <div className="flex items-center space-x-2">
                <button onClick={() => {
                    if (goBack) {
                        goBack();
                    } else {
                        if (!selectedHouse || activeTab === 'dashboard') {
                            setIsHubMode(true);
                            setSelectedHouse(null);
                            setActiveTab('dashboard');
                        } else {
                            setActiveTab('dashboard');
                        }
                    }
                }} className="p-1.5 bg-white/10 rounded-lg active:scale-90 transition-all flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-50 mt-0.5">
                    {TAB_TITLES[activeTab] || 'Trang chủ'}
                </h2>
            </div>
            <div className="flex items-center space-x-2">
                <NotificationBell
                    selectedHouse={selectedHouse}
                    houses={houses}
                    setSelectedHouse={setSelectedHouse}
                    setConfig={setConfig}
                    setIsHubMode={setIsHubMode}
                    setActiveTab={setActiveTab}
                    setHighlightedItemId={setHighlightedItemId}
                    setViewDate={setViewDate}
                    buttonClassName="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90 transition-all"
                    panelAlign="right-0"
                />
                <div className="flex flex-row items-center space-x-1 cursor-pointer active:opacity-80" onClick={() => {
                    if (!selectedHouse) {
                        setIsHubMode(true);
                        setActiveTab('dashboard');
                    } else {
                        setIsHubMode(false); setSelectedHouse(null); if (isGlobalTab) setActiveTab('dashboard');
                    }
                }}>
                    <p className="text-[8px] font-bold text-blue-100 uppercase tracking-widest truncate max-w-[160px] mt-0.5">{selectedHouse?.name || 'Trang chủ'}</p>
                </div>
                {isOwnerOrAdmin && selectedHouse && (
                    <div onClick={() => setActiveTab('settings')} className="w-8 h-8 rounded-full border border-white/30 overflow-hidden cursor-pointer active:scale-90 shadow-sm bg-white flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
