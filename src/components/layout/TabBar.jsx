import React from 'react';
import { LayoutDashboard, Home, Boxes, FileText, Wallet, Sparkles, Plus } from 'lucide-react';

const TabBar = ({
    activeTab,
    setActiveTab,
    setSearchQuery,
    shouldShowMeterBanner,
    canAccessFinance,
    showQuickMenu,
    setShowQuickMenu,
    setIsHubMode,
    selectedHouse
}) => {
    return (
        <div className="fixed bottom-0 left-1/2 z-[70] w-full max-w-lg -translate-x-1/2 pointer-events-none">
            <div className="h-14 bg-white border-x border-t border-slate-100 flex items-center justify-around px-2 pointer-events-auto shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Trang chủ' },
                    shouldShowMeterBanner
                        ? { id: 'meters_list', icon: Boxes, label: 'Chốt số' }
                        : { id: 'rooms', icon: Home, label: 'Phòng' },
                    { id: 'spacer', icon: null, label: '' },
                    { id: 'bills', icon: FileText, label: 'Hóa đơn' },
                    { id: 'finance', icon: Wallet, label: 'Thu Chi', hidden: !canAccessFinance },
                    { id: 'ai', icon: Sparkles, label: 'AI Chat', hidden: canAccessFinance }
                ].filter(i => !i.hidden).map((item, i) => (
                    item.id === 'spacer' ? <div key={i} className="w-12" /> : (
                        <button key={item.id} onClick={() => {
                            if (!selectedHouse && item.id !== 'ai' && setIsHubMode) {
                                setIsHubMode(true);
                            }
                            setActiveTab(item.id);
                            setSearchQuery("");
                        }} className={`flex flex-col items-center justify-center px-1 transition-all ${activeTab === item.id ? 'text-blue-600 scale-105' : 'text-slate-400 opacity-60'}`}>
                            <div className={`p-1.5 rounded-lg ${activeTab === item.id ? 'bg-blue-50 shadow-inner' : ''} flex items-center justify-center`}><item.icon className="w-4.5 h-4.5" strokeWidth={activeTab === item.id ? 3 : 2} /></div>
                            <span className={`text-[6px] font-black uppercase mt-1 transition-all ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
                        </button>
                    )
                ))}
            </div>
            <button onClick={() => setShowQuickMenu(!showQuickMenu)} className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-[1.4rem] flex items-center justify-center transition-all duration-500 active:scale-90 pointer-events-auto border-[4px] border-white ${showQuickMenu ? 'bg-slate-800 rotate-45' : 'bg-blue-600'}`}><Plus className="w-7 h-7 text-white stroke-[4px]" /></button>
        </div>
    );
};

export default TabBar;
