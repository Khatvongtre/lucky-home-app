import React from 'react';
import { ChevronLeft, Home, LogOut, Search, Building2, MapPin, Share2, Edit, Trash2, Calendar, PlusCircle, Sparkles, User, UserCheck, FileText, Save } from 'lucide-react';
import { formatN } from '../utils/formatters';
import ToastNotification from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import AddHouseForm from '../components/houses/AddHouseForm';
import ShareHouseModal from '../components/houses/ShareHouseModal';
import AiPromptModal from '../components/houses/AiPromptModal';

const getAdvancedDueInfo = (startDate, paymentDay, paymentPeriod) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const period = paymentPeriod || 1;
    const day = paymentDay || 5;

    let start = new Date();
    if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) start = d;
    }

    let monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    if (monthsDiff < 0) monthsDiff = 0;

    let periodsPassed = Math.floor(monthsDiff / period);
    let targetMonth = start.getMonth() + (periodsPassed * period);

    let dueDate = new Date(start.getFullYear(), targetMonth, day);

    if (today > dueDate) {
        dueDate = new Date(start.getFullYear(), targetMonth + period, day);
    }

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return { daysLeft: diffDays, dueDate };
};

const ROLE_DISPLAY_MAP = {
    SuperAdmin: { text: 'Quản trị viên', class: 'bg-purple-100 text-purple-600' },
    Owner: { text: 'Chủ nhà', class: 'bg-blue-100 text-blue-600' },
    Manager: { text: 'Quản lý', class: 'bg-indigo-100 text-indigo-600' },
    Staff: { text: 'Nhân viên', class: 'bg-slate-100 text-slate-500' }
};

const HOUSE_SCOPED_TABS = new Set(['dashboard', 'rooms', 'meters_list', 'bills', 'finance', 'settings']);

const getRoomStatusColor = (isFull, emptyRooms, totalRooms) => {
    if (isFull) return 'bg-emerald-500';
    const emptyRatio = emptyRooms / totalRooms;
    return emptyRatio <= 0.3 ? 'bg-amber-500' : 'bg-red-500';
};

const HouseSelectionView = ({
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
    activeTab,
    setSearchQuery,
    handleOpenShare,
    setEditingHouse,
    setIsAiCreateHouseOpen,
    handleDeleteHouse,
    toast,
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
    editingHouse
}) => {
    const filteredHouses = houses.filter(h =>
        h.name?.toLowerCase().includes(houseSearchQuery.toLowerCase()) ||
        h.address?.toLowerCase().includes(houseSearchQuery.toLowerCase())
    );

    const visibleSelectedHouses = filteredHouses.filter(h => selectedStatsHouses.includes(h.id));
    const housesForStats = visibleSelectedHouses.length > 0 ? visibleSelectedHouses : filteredHouses;
    const targetTabAfterHouseSelect = HOUSE_SCOPED_TABS.has(activeTab) ? activeTab : 'dashboard';

    const handleSelectHouse = (house) => {
        setSelectedHouse(house);
        setConfig({ ...house });
        setActiveTab(targetTabAfterHouseSelect);
        setSearchQuery('');
    };

    const houseStats = housesForStats.reduce((acc, h) => {
        acc.totalHouses += 1;
        acc.totalRooms += Number(h.totalRooms) || 0;
        acc.emptyRooms += Number(h.emptyRooms) || 0;

        acc.totalRevenue += Number(h.revenue) || 0;
        acc.totalExpense += Number(h.expense) || 0;
        acc.totalProfit += Number(h.profit ?? ((Number(h.revenue) || 0) - (Number(h.expense) || 0)));
        return acc;
    }, { totalHouses: 0, totalRooms: 0, emptyRooms: 0, totalRevenue: 0, totalExpense: 0, totalProfit: 0 });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center">
            <ToastNotification toast={toast} />
            <ConfirmDialog
                dialog={confirmDialog}
                onCancel={() => closeConfirmDialog(false)}
                onConfirm={() => closeConfirmDialog(true)}
            />

            <div className="w-full max-w-sm flex flex-col h-screen relative overflow-hidden">
                <div className="sticky top-0 z-20 bg-slate-50 pt-4 px-3 pb-2 space-y-3 shadow-sm border-b border-slate-200">
                    <div className="relative flex items-center justify-between">

                        {/* LEFT */}
                        <div className="flex items-center space-x-2 z-10">
                            <button
                                type="button"
                                onClick={() => setIsHubMode(true)}
                                className="text-slate-600 hover:bg-slate-200 rounded-lg transition-all active:scale-95"
                                aria-label="Quay lại Hub"
                                title="Quay lại Hub"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        </div>

                        {/* CENTER (ABSOLUTE) */}
                        <h2 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-black text-blue-900 uppercase tracking-tighter">
                            Lucky Home
                        </h2>

                        {/* RIGHT */}
                        <div className="flex items-center space-x-2 z-10">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">
                                {user?.role}
                            </span>

                            <button
                                onClick={handleLogout}
                                className="p-1.5 bg-red-50 text-red-500 rounded-lg active:scale-90 transition-all hover:bg-red-100 hover:text-red-600"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>

                    </div>

                    <div className="bg-slate-900 rounded-xl p-3.5 text-white shadow-xl border-b-1 border-blue-600">
                        <div className="flex justify-between items-center mb-3 px-2 border-b border-slate-700 pb-3">
                            <div className="text-left">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Doanh thu</p>
                                <p className="text-sm font-black text-emerald-400 tabular-nums">+{formatN(houseStats.totalRevenue)}</p>
                            </div>
                            <div className="text-center border-x border-slate-700 px-3">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Chi phí</p>
                                <p className="text-sm font-black text-rose-400 tabular-nums">-{formatN(houseStats.totalExpense)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lợi nhuận</p>
                                <p className="text-sm font-black text-blue-400 tabular-nums">{formatN(houseStats.totalProfit)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="flex flex-col items-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Số nhà</p>
                                <p className="text-sm font-black">{houseStats.totalHouses}</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Tổng phòng</p>
                                <p className="text-sm font-black text-blue-400">{houseStats.totalRooms}</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Đang trống</p>
                                <p className="text-sm font-black text-orange-400">{Math.max(0, houseStats.emptyRooms)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={houseSearchQuery}
                            onChange={(e) => setHouseSearchQuery(e.target.value)}
                            placeholder="Tìm tên nhà hoặc địa chỉ..."
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-600 focus:shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-3 pt-3 pb-16 space-y-2.5 relative">
                    {filteredHouses.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center mt-8">Không tìm thấy cơ sở nào.</p>
                    )}

                    {filteredHouses.map(h => {
                        const payInfo = getAdvancedDueInfo(h.startDate, h.paymentDay, h.paymentPeriod);
                        const isUrgentPay = payInfo.daysLeft <= 3;
                        const isWarningPay = payInfo.daysLeft <= 7;
                        const shouldShowPayInfo = payInfo.daysLeft <= 30;
                        const isFull = h.emptyRooms === 0;

                        const cardStyle = isUrgentPay ? 'bg-red-50/50 border-red-100' : isFull ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100';

                        const roleInfo = ROLE_DISPLAY_MAP[h.userRole] || ROLE_DISPLAY_MAP.Staff;

                        return (
                            <div key={h.id} className={`w-full p-2.5 rounded-xl border shadow-sm active:scale-[0.99] transition-all text-left relative mb-2 ${cardStyle}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="mr-2 flex items-center h-8" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                            checked={selectedStatsHouses.includes(h.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedStatsHouses([...selectedStatsHouses, h.id]);
                                                } else {
                                                    setSelectedStatsHouses(selectedStatsHouses.filter(id => id !== h.id));
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSelectHouse(h)}
                                        className="flex-1 flex items-center space-x-2 text-left overflow-hidden"
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${isUrgentPay ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className={`font-black text-[13px] uppercase tracking-tight leading-tight truncate ${isUrgentPay ? 'text-red-700' : isWarningPay ? 'text-amber-700' : 'text-blue-800'}`}>
                                                    {h.name}
                                                </h3>
                                                <span className={`text-[6.5px] sm:text-[7px] font-black px-1.5 py-0.5 rounded uppercase leading-none whitespace-nowrap shrink-0 ${roleInfo.class}`}>
                                                    {roleInfo.text}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-semibold text-slate-500 mt-0.5 flex items-center truncate">
                                                <MapPin className="w-2.5 h-2.5 mr-1 shrink-0 opacity-60" />
                                                {h.address || "Chưa cập nhật địa chỉ"}
                                            </p>
                                        </div>
                                    </button>

                                    {['SuperAdmin', 'Owner'].includes(h.userRole || user?.role) && (
                                        <div className="flex items-center ml-1">
                                            <button onClick={(e) => handleOpenShare(e, h)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                                                <Share2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setEditingHouse(h); setIsAiCreateHouseOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteHouse(h.id, h.name); }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                                    <div className="flex items-center">
                                        <div className={`flex items-center text-[8.5px] sm:text-[10px] font-bold px-2 py-1 rounded-md leading-none whitespace-nowrap ${isFull ? 'text-emerald-700 bg-emerald-100/50' : 'text-blue-700 bg-blue-50'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isFull ? '' : 'animate-pulse'} ${getRoomStatusColor(isFull, h.emptyRooms, h.totalRooms)}`} />
                                            {isFull ? `Đã lấp đầy (${h.totalRooms} phòng)` : `Trống ${h.emptyRooms} / ${h.totalRooms} phòng`}
                                        </div>
                                    </div>

                                    {shouldShowPayInfo && (
                                        <div className={`flex items-center text-[8.5px] sm:text-[10px] font-bold px-2 py-1 rounded-md leading-none whitespace-nowrap ${isUrgentPay ? 'text-red-700 bg-red-100/50' :
                                            isWarningPay ? 'text-amber-700 bg-amber-100/50' :
                                                'text-emerald-700 bg-emerald-100/50'
                                            }`}>
                                            <Calendar className={`w-3 h-3 mr-1.5 ${isUrgentPay ? 'text-red-600' : isWarningPay ? 'text-amber-500' : 'text-emerald-500'}`} />
                                            Hạn đóng tiền: {payInfo.daysLeft} ngày
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent z-30 pointer-events-none">
                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur-xl pointer-events-auto">
                        <button
                            type="button"
                            onClick={() => setIsHubMode(true)}
                            className="group min-w-0 rounded-lg border border-blue-100 bg-blue-50 px-1 py-1.5 text-blue-700 transition-all hover:bg-blue-100 active:scale-95"
                        >
                            <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm shadow-blue-200">
                                <Home className="h-3 w-3" />
                            </span>
                            <span className="mt-0.5 block truncate text-center text-[7px] font-black uppercase tracking-wide">Trang chủ</span>
                        </button>

                        <button
                            onClick={() => { setEditingHouse(null); setIsAiCreateHouseOpen(true); }}
                            className="group min-w-0 rounded-lg border border-indigo-100 bg-indigo-50 px-1 py-1.5 text-indigo-700 transition-all hover:bg-indigo-100 active:scale-95"
                        >
                            <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                                <PlusCircle className="h-3 w-3" />
                            </span>
                            <span className="mt-0.5 block truncate text-center text-[7px] font-black uppercase tracking-wide">Thêm cơ sở</span>
                        </button>

                        <button
                            onClick={() => { setIsAiPromptModalOpen(true); setAiPrompt(""); setIsListening(false); }}
                            className="group min-w-0 rounded-lg border border-violet-100 bg-violet-50 px-1 py-1.5 text-violet-700 transition-all hover:bg-violet-100 active:scale-95"
                        >
                            <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-200">
                                <Sparkles className="h-3 w-3" />
                            </span>
                            <span className="mt-0.5 block truncate text-center text-[7px] font-black uppercase tracking-wide">Tạo bằng AI</span>
                        </button>
                    </div>
                </div>
            </div>

            <ShareHouseModal
                isShareModalOpen={isShareModalOpen}
                setIsShareModalOpen={setIsShareModalOpen}
                sharingHouse={sharingHouse}
                setSharingHouse={setSharingHouse}
                assignForm={assignForm}
                setAssignForm={setAssignForm}
                handleAssignRole={handleAssignRole}
            />

            {isAiCreateHouseOpen && (
                <Modal title={editingHouse ? "SỬA THÔNG TIN CƠ SỞ" : "TẠO CƠ SỞ MỚI"} onClose={() => { setIsAiCreateHouseOpen(false); setEditingHouse(null); }}>
                    <AddHouseForm editingHouse={editingHouse} onSubmit={handleAddHouse} />
                </Modal>
            )}

            <AiPromptModal
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
            />
        </div>
    );
};

export default HouseSelectionView;
