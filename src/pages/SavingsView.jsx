import React from 'react';
import { ChevronDown, PiggyBank, Landmark } from 'lucide-react';
import { formatN } from '../utils/formatters';

const SavingsView = ({
    isSavingsStatsOpen,
    setIsSavingsStatsOpen,
    uniqueBankNames,
    collapsedSavingsBanks,
    setCollapsedSavingsBanks,
    summarySavings,
    currentSavings,
    unselectedSavingsBanks,
    setUnselectedSavingsBanks,
    setEditingSaving,
    setIsAddSavingModalOpen,
}) => {
    return (
        <div className="animate-in fade-in pb-20">
            <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md px-1">
                <div className="bg-slate-900 p-6 rounded-xl text-white shadow-xl relative border-b-8 border-slate-950">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setIsSavingsStatsOpen(!isSavingsStatsOpen)} className="flex items-center gap-1 active:scale-95 transition-all text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền gửi tiết kiệm</p>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${!isSavingsStatsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {uniqueBankNames.length > 0 && (
                            <button
                                onClick={() => {
                                    if (collapsedSavingsBanks.length === uniqueBankNames.length) {
                                        setCollapsedSavingsBanks([]);
                                    } else {
                                        setCollapsedSavingsBanks(uniqueBankNames);
                                    }
                                }}
                                className="flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors bg-white/5 px-2 py-1 rounded shadow-sm active:scale-95"
                            >
                                <span className="text-[8px] font-black uppercase tracking-widest">
                                    {collapsedSavingsBanks.length === uniqueBankNames.length ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsedSavingsBanks.length !== uniqueBankNames.length ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>
                    {isSavingsStatsOpen && (
                        <div className="animate-in slide-in-from-top-2 duration-200 mt-3">
                            <h3 className="text-4xl font-black tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">
                                {formatN(summarySavings.reduce((a, b) => a + (b.amount || 0), 0))}
                            </h3>
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 relative overflow-hidden">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Lãi / tháng</p>
                                    <p className="text-base font-black text-amber-400 tabular-nums">+{formatN(summarySavings.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) / 12), 0))}</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 relative overflow-hidden">
                                    <PiggyBank className="w-10 h-10 absolute -right-2 -bottom-2 opacity-10 text-white" />
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng lãi dự kiến</p>
                                    <p className="text-base font-black text-amber-400 tabular-nums">+{formatN(summarySavings.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) * ((b.termMonths || 0) / 12)), 0))}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-1 mt-4 pb-4">
                {currentSavings.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center mt-10">Chưa có sổ tiết kiệm nào.</p>
                )}
                {Object.entries(
                    currentSavings.reduce((acc, s) => {
                        const bank = s.bankName || 'Khác';
                        if (!acc[bank]) acc[bank] = [];
                        acc[bank].push(s);
                        return acc;
                    }, {})
                ).map(([bank, items]) => {
                    const groupAmount = items.reduce((a, b) => a + (b.amount || 0), 0);
                    const groupInterest = items.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) * ((b.termMonths || 0) / 12)), 0);
                    const isSelected = !unselectedSavingsBanks.includes(bank);
                    const isCollapsed = collapsedSavingsBanks.includes(bank);

                    return (
                        <div key={bank} className="mb-6 last:mb-0 animate-in fade-in">
                            <div className="flex flex-col mb-3 bg-gradient-to-r from-slate-100 to-white p-3 rounded-xl border border-slate-200 shadow-sm gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center shrink-0 ml-0.5">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) setUnselectedSavingsBanks(unselectedSavingsBanks.filter(b => b !== bank));
                                                else setUnselectedSavingsBanks([...unselectedSavingsBanks, bank]);
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shadow-inner shrink-0">
                                        <Landmark className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div className="flex-1 flex justify-between items-center gap-1 min-w-0">
                                        <h4 className="text-[13px] font-black text-blue-900 uppercase tracking-wider leading-tight truncate pr-2">{bank}</h4>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded shadow-sm">{items.length} SỔ</span>
                                            <button
                                                onClick={() => {
                                                    if (isCollapsed) {
                                                        setCollapsedSavingsBanks(collapsedSavingsBanks.filter(b => b !== bank));
                                                    } else {
                                                        setCollapsedSavingsBanks([...collapsedSavingsBanks, bank]);
                                                    }
                                                }}
                                                className="p-1 -mr-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors shadow-none"
                                            >
                                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between px-1">
                                    <div className="flex-1">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng gốc</p>
                                        <p className="text-[13px] font-black text-indigo-700 tabular-nums">{formatN(groupAmount)}<span className="text-[9px] text-indigo-400 ml-0.5">đ</span></p>
                                    </div>
                                    <div className="w-[1px] h-8 bg-slate-200 mx-4"></div>
                                    <div className="flex-1 text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng lãi</p>
                                        <p className="text-[13px] font-black text-emerald-600 tabular-nums">+{formatN(groupInterest)}<span className="text-[9px] text-emerald-600/50 ml-0.5">đ</span></p>
                                    </div>
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className={`space-y-3 transition-all ${!isSelected ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                    {items.map(s => {
                                        const endDate = new Date(s.startDate);
                                        const tMonths = s.termMonths || 0;
                                        endDate.setMonth(endDate.getMonth() + Math.floor(tMonths));
                                        endDate.setDate(endDate.getDate() + Math.round((tMonths - Math.floor(tMonths)) * 30));
                                        const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                                        const isMatured = daysLeft <= 0;
                                        const interest = Math.round((s.amount || 0) * ((s.interestRate || 0) / 100) * ((s.termMonths || 0) / 12));
                                        const startDate = new Date(s.startDate);
                                        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                        const passedDays = Math.max(0, totalDays - daysLeft);
                                        const progress = totalDays > 0 ? Math.min(100, (passedDays / totalDays) * 100) : 100;

                                        return (
                                            <div key={s.id} onClick={() => { setEditingSaving(s); setIsAddSavingModalOpen(true); }} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden ml-2 border-l-4 border-l-amber-500">
                                                {isMatured && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase z-10 shadow-sm">Đã đến hạn</div>}
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center space-x-3 w-[60%]">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-inner shrink-0"><PiggyBank className="w-5 h-5" /></div>
                                                        <div className="overflow-hidden w-full">
                                                            <h4 className="font-black text-[13px] text-blue-900 uppercase leading-tight mb-0.5">{s.note || `Sổ tiết kiệm`}</h4>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Gửi: {startDate.toLocaleDateString('vi-VN')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right w-[40%] pl-2 shrink-0">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số tiền gốc</p>
                                                        <p className="text-[15px] font-black text-indigo-700 tabular-nums">{formatN(s.amount)}<span className="text-[10px] text-indigo-400 ml-0.5">đ</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lãi suất</p>
                                                            <p className="text-[11px] font-black text-purple-600">{s.interestRate}%<span className="text-[9px] text-purple-400 font-bold">/năm</span></p>
                                                        </div>
                                                        <div className="w-[1px] h-6 bg-slate-200"></div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kỳ hạn</p>
                                                            <p className="text-[11px] font-black text-emerald-600">{s.termMonths} <span className="text-[9px] text-emerald-500 font-bold">tháng</span></p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lãi dự kiến</p>
                                                        <p className="text-[13px] font-black text-emerald-600 tabular-nums">+{formatN(interest)} đ</p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between px-1 gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden relative">
                                                        <div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isMatured ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <p className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isMatured ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {isMatured ? 'Đáo hạn' : `Còn ${daysLeft} ngày`}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default SavingsView;