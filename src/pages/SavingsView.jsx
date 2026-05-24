import React, { useEffect } from 'react';
import { CalendarDays, ChevronDown, PiggyBank, Landmark, X } from 'lucide-react';
import { formatN } from '../utils/formatters';
import { getSavingMaturityDate } from '../utils/date';

const SavingsView = ({
    isSavingsStatsOpen,
    setIsSavingsStatsOpen,
    uniqueBankNames,
    collapsedSavingsBanks,
    setCollapsedSavingsBanks,
    summarySavings,
    currentSavings,
    savingMaturityFilter,
    setSavingMaturityFilter,
    unselectedSavingsBanks,
    setUnselectedSavingsBanks,
    setEditingSaving,
    setIsAddSavingModalOpen,
    highlightedItemId,
    setHighlightedItemId
}) => {
    useEffect(() => {
        let scrollInterval;
        if (highlightedItemId && currentSavings?.length > 0) {
            const hId = String(highlightedItemId);
            const targetSaving = currentSavings.find(s => String(s.id) === hId);
            if (targetSaving) {
                const bank = targetSaving.bankName || 'Khác';

                // Tự động mở rộng và check chọn ngân hàng nếu đang bị ẩn
                setCollapsedSavingsBanks(prev => prev.includes(bank) ? prev.filter(b => b !== bank) : prev);
                setUnselectedSavingsBanks(prev => prev.includes(bank) ? prev.filter(b => b !== bank) : prev);

                let attempts = 0;
                scrollInterval = setInterval(() => {
                    const element = document.getElementById(`saving-card-${targetSaving.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        clearInterval(scrollInterval);
                    }
                    attempts++;
                    if (attempts >= 10) clearInterval(scrollInterval);
                }, 200);
            }
        }
        return () => { if (scrollInterval) clearInterval(scrollInterval); };
    }, [highlightedItemId, currentSavings, setCollapsedSavingsBanks, setUnselectedSavingsBanks]);

    const hasMaturityFilter = Boolean(savingMaturityFilter?.to);

    return (
        <div className="animate-in fade-in pb-20">
            <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md px-1">
                <div className="bg-slate-900 p-4 rounded-xl text-white shadow-xl relative border-b-4 border-slate-950">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsSavingsStatsOpen(!isSavingsStatsOpen)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsSavingsStatsOpen(!isSavingsStatsOpen);
                            }
                        }}
                        aria-expanded={isSavingsStatsOpen}
                        className="flex cursor-pointer justify-between items-center rounded-lg active:bg-white/5"
                    >
                        <div className="flex flex-1 min-w-0 items-center gap-1 active:scale-95 transition-all text-left mr-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Tổng tiền gửi</p>
                            <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-300 ${!isSavingsStatsOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {uniqueBankNames.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (collapsedSavingsBanks.length === uniqueBankNames.length) {
                                        setCollapsedSavingsBanks([]);
                                    } else {
                                        setCollapsedSavingsBanks(uniqueBankNames);
                                    }
                                }}
                                className="flex w-32 shrink-0 justify-between items-center text-slate-400 hover:text-amber-400 transition-colors bg-white/5 px-2 py-1 rounded shadow-sm active:scale-95"
                            >
                                <span className="text-[8px] font-black uppercase tracking-widest">
                                    {collapsedSavingsBanks.length === uniqueBankNames.length ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsedSavingsBanks.length !== uniqueBankNames.length ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>
                    <div className="mt-3">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="flex-1 min-w-0 text-[clamp(15px,5vw,28px)] font-black tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 truncate">
                                {formatN(summarySavings.reduce((a, b) => a + (b.amount || 0), 0))}
                            </h3>
                            {setSavingMaturityFilter && (
                                <div className="w-32 shrink-0">
                                    <div className="flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-1.5 mt-1">
                                        <CalendarDays className="h-3 w-3 shrink-0 text-white mr-0.5" strokeWidth={2.5} />
                                        <input
                                            type={savingMaturityFilter?.to ? "date" : "text"}
                                            value={savingMaturityFilter?.to || ''}
                                            onFocus={(e) => { e.target.type = 'date'; try { e.target.showPicker?.(); } catch (err) { } }}
                                            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                            onChange={(e) => setSavingMaturityFilter({ to: e.target.value })}
                                            placeholder="Ngày đáo hạn"
                                            className="min-w-0 flex-1 bg-transparent px-0.5 text-center text-[9px] font-bold text-amber-100 placeholder:text-slate-400 outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setSavingMaturityFilter({ to: '' })}
                                            disabled={!hasMaturityFilter}
                                            title={'X\u00f3a l\u1ecdc ng\u00e0y \u0111\u00e1o h\u1ea1n'}
                                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white transition-all active:scale-90 disabled:opacity-30 ml-0.5"
                                        >
                                            <X className="h-2.5 w-2.5" strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {isSavingsStatsOpen && (
                            <div className="animate-in slide-in-from-top-2 duration-200 mt-2 grid grid-cols-2 gap-2">
                                <div className="bg-white/5 p-2 rounded-lg border border-white/10 relative overflow-hidden">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lãi / tháng</p>
                                    <p className="text-xs font-black text-amber-400 tabular-nums">+{formatN(summarySavings.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) / 12), 0))}</p>
                                </div>
                                <div className="bg-white/5 p-2 rounded-lg border border-white/10 relative overflow-hidden">
                                    <PiggyBank className="w-8 h-8 absolute -right-2 -bottom-2 opacity-10 text-white" />
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng lãi dự kiến</p>
                                    <p className="text-xs font-black text-amber-400 tabular-nums">+{formatN(summarySavings.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) * ((b.termMonths || 0) / 12)), 0))}</p>
                                </div>
                            </div>
                        )}
                    </div>
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
                        <div key={bank} className="mb-3 last:mb-0 animate-in fade-in">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    if (isCollapsed) {
                                        setCollapsedSavingsBanks(collapsedSavingsBanks.filter(b => b !== bank));
                                    } else {
                                        setCollapsedSavingsBanks([...collapsedSavingsBanks, bank]);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (isCollapsed) {
                                            setCollapsedSavingsBanks(collapsedSavingsBanks.filter(b => b !== bank));
                                        } else {
                                            setCollapsedSavingsBanks([...collapsedSavingsBanks, bank]);
                                        }
                                    }
                                }}
                                aria-expanded={!isCollapsed}
                                className="flex cursor-pointer flex-col mb-1.5 bg-gradient-to-r from-slate-100 to-white p-2.5 rounded-lg border border-slate-200 shadow-sm gap-2 active:bg-slate-50"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center shrink-0 ml-0.5">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onClick={(e) => e.stopPropagation()}
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
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

                                <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between px-1">
                                    <div className="flex-1">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng gốc</p>
                                        <p className="text-[12px] font-black text-indigo-700 tabular-nums">{formatN(groupAmount)}<span className="text-[8px] text-indigo-400 ml-0.5">đ</span></p>
                                    </div>
                                    <div className="w-[1px] h-7 bg-slate-200 mx-3"></div>
                                    <div className="flex-1 text-right">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng lãi</p>
                                        <p className="text-[12px] font-black text-emerald-600 tabular-nums">+{formatN(groupInterest)}<span className="text-[8px] text-emerald-600/50 ml-0.5">đ</span></p>
                                    </div>
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className={`space-y-1.5 transition-all ${!isSelected ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                    {items.map(s => {
                                        const endDate = getSavingMaturityDate(s.startDate, s.termMonths) || new Date(s.startDate);
                                        const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                                        const isMatured = daysLeft <= 0;
                                        const interest = Math.round((s.amount || 0) * ((s.interestRate || 0) / 100) * ((s.termMonths || 0) / 12));
                                        const startDate = new Date(s.startDate);
                                        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                        const passedDays = Math.max(0, totalDays - daysLeft);
                                        const progress = totalDays > 0 ? Math.min(100, (passedDays / totalDays) * 100) : 100;

                                        const hId = highlightedItemId ? String(highlightedItemId) : null;
                                        const isHighlighted = hId && String(s.id) === hId;

                                        let cardClasses = "p-2.5 rounded-lg border shadow-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden ml-1.5 border-l-4 ";
                                        let progressColor = 'bg-amber-400';
                                        let statusTextColor = 'text-amber-600';

                                        if (isMatured) {
                                            if (!isHighlighted) cardClasses += " bg-emerald-50/50 border-emerald-200 border-l-emerald-500";
                                            progressColor = 'bg-emerald-500';
                                            statusTextColor = 'text-emerald-600';
                                        } else if (daysLeft > 20) {
                                            if (!isHighlighted) cardClasses += " bg-white border-slate-200 border-l-emerald-500";
                                            progressColor = 'bg-emerald-400';
                                            statusTextColor = 'text-emerald-600';
                                        } else if (daysLeft > 10) {
                                            if (!isHighlighted) cardClasses += " bg-white border-slate-200 border-l-amber-500";
                                            progressColor = 'bg-amber-400';
                                            statusTextColor = 'text-amber-600';
                                        } else {
                                            if (!isHighlighted) cardClasses += " bg-red-50/40 border-red-200 border-l-red-500 animate-pulse shadow-red-100";
                                            progressColor = 'bg-red-500';
                                            statusTextColor = 'text-red-600';
                                        }

                                        if (isHighlighted) {
                                            cardClasses += " bg-red-50 border-red-500 border-l-red-500 shadow-red-200 animate-pulse ring-2 ring-red-200";
                                        }

                                        return (
                                            <div id={`saving-card-${s.id}`} key={s.id} onClick={() => { setEditingSaving(s); setIsAddSavingModalOpen(true); if (isHighlighted && setHighlightedItemId) setHighlightedItemId(null); }} className={cardClasses}>
                                                {isMatured && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase z-10 shadow-sm">Đã đến hạn</div>}
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center space-x-2.5 w-[60%]">
                                                        <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-inner shrink-0"><PiggyBank className="w-4.5 h-4.5" /></div>
                                                        <div className="overflow-hidden w-full">
                                                            <h4 className="font-black text-[13px] text-blue-900 uppercase leading-tight mb-1 truncate">{s.note || `Sổ tiết kiệm`}</h4>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest space-y-0.5">
                                                                <p>Ngày Gửi: {startDate.toLocaleDateString('vi-VN')}</p>
                                                                <p>Đáo hạn: {endDate.toLocaleDateString('vi-VN')}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right w-[40%] pl-2 shrink-0">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số tiền gốc</p>
                                                        <p className="text-[14px] font-black text-indigo-700 tabular-nums">{formatN(s.amount)}<span className="text-[9px] text-indigo-400 ml-0.5">đ</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                                    <div className="flex items-center gap-2.5">
                                                        <div>
                                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lãi suất</p>
                                                            <p className="text-[10px] font-black text-purple-600">{s.interestRate}%<span className="text-[8px] text-purple-400 font-bold">/năm</span></p>
                                                        </div>
                                                        <div className="w-[1px] h-4 bg-slate-200"></div>
                                                        <div>
                                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kỳ hạn</p>
                                                            <p className="text-[10px] font-black text-emerald-600">{s.termMonths} <span className="text-[8px] text-emerald-500 font-bold">tháng</span></p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lãi dự kiến</p>
                                                        <p className="text-[11px] font-black text-emerald-600 tabular-nums">+{formatN(interest)} đ</p>
                                                    </div>
                                                </div>
                                                <div className="mt-1.5 flex items-center justify-between px-1 gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden relative">
                                                        <div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${progressColor}`} style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${statusTextColor}`}>
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
