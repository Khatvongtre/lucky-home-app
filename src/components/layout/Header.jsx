import React from 'react';
import { ChevronLeft, Building2, User } from 'lucide-react';

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
    setActiveTab
}) => {
    return (
        <header className="px-4 h-14 flex items-center justify-between shrink-0 bg-blue-600 text-white z-50 shadow-md relative">
            <div className="flex items-center space-x-2">
                <button onClick={() => {
                    if (!selectedHouse || activeTab === 'dashboard') {
                        setIsHubMode(true);
                        setSelectedHouse(null);
                    } else {
                        setActiveTab('dashboard');
                    }
                }} className="p-1.5 bg-white/10 rounded-lg active:scale-90 transition-all flex items-center justify-center">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-50 mt-0.5">
                    {TAB_TITLES[activeTab] || 'Trang chủ'}
                </h2>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 opacity-80" />
                <h2 className="text-sm font-black uppercase tracking-tighter mt-0.5">Lucky Home</h2>
            </div>
            <div className="flex items-center space-x-2">
                <div className="flex flex-row items-center space-x-1 cursor-pointer active:opacity-80" onClick={() => { setIsHubMode(false); setSelectedHouse(null); if (isGlobalTab) setActiveTab('dashboard'); }}>
                    <p className="text-[8px] font-bold text-blue-100 uppercase tracking-widest truncate max-w-[160px] mt-0.5">{selectedHouse?.name || 'Trang chủ'}</p>
                </div>
                {isOwnerOrAdmin && (
                    <div onClick={() => setActiveTab('settings')} className="w-8 h-8 rounded-full border border-white/30 overflow-hidden cursor-pointer active:scale-90 shadow-sm bg-white flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;