import React from 'react';
import { UserCheck, Home, Boxes, Receipt, Sparkles, CircleDollarSign, Settings, LogOut } from 'lucide-react';

const QuickMenu = ({
    showQuickMenu,
    setShowQuickMenu,
    setEditingRoom,
    setIsAddRoomModalOpen,
    shouldShowMeterBanner,
    setActiveTab,
    setIsAddTransactionModalOpen,
    user,
    handleLogout
}) => {
    return (
        <div className={`fixed inset-0 z-[500] transition-opacity duration-300 ${showQuickMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowQuickMenu(false)} />
            <div className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[2.5rem] p-8 pb-36 transition-transform duration-500 transform ${showQuickMenu ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="grid grid-cols-3 gap-6">
                    {[
                        { label: 'Thêm Phòng', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50', action: () => { setEditingRoom(null); setIsAddRoomModalOpen(true); setShowQuickMenu(false); } },
                        shouldShowMeterBanner
                            ? { label: 'Phòng', icon: Home, color: 'text-blue-600 bg-blue-50', action: () => { setActiveTab('rooms'); setShowQuickMenu(false); } }
                            : { label: 'Chốt số điện', icon: Boxes, color: 'text-orange-600 bg-orange-50', action: () => { setActiveTab('meters_list'); setShowQuickMenu(false); } },
                        { label: 'Hóa Đơn', icon: Receipt, color: 'text-purple-600 bg-purple-50', action: () => { setActiveTab('bills'); setShowQuickMenu(false); } },
                        { label: 'AI Chat', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50', action: () => { setActiveTab('ai'); setShowQuickMenu(false); } },
                        { label: 'Thu chi', icon: CircleDollarSign, color: 'text-rose-600 bg-rose-50', action: () => { setIsAddTransactionModalOpen(true); setShowQuickMenu(false); }, hidden: user?.role !== 'Owner' },
                        { label: 'Cài Đặt', icon: Settings, color: 'text-slate-600 bg-slate-50', action: () => { setActiveTab('settings'); setShowQuickMenu(false); }, hidden: user?.role !== 'Owner' },
                        { label: 'Đăng Xuất', icon: LogOut, color: 'text-red-600 bg-red-50', action: () => handleLogout() }
                    ].filter(i => !i.hidden).map((item, i) => (
                        <button key={i} onClick={() => item.action()} className="flex flex-col items-center space-y-2 active:scale-90 transition-all">
                            <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center`}><item.icon className="w-6 h-6" strokeWidth={1.5} /></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center leading-tight">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuickMenu;