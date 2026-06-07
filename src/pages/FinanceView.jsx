import React from 'react';
import { Wallet, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { formatN } from '../utils/formatters';
import { TRANSACTION_CATEGORIES } from '../utils/constants';

const FinanceView = ({
    canViewProfit,
    isFinanceStatsOpen,
    setIsFinanceStatsOpen,
    isMonthOpen,
    setIsMonthOpen,
    selectedMonth,
    setSelectedMonth,
    monthLabels,
    financeStats,
    currentTransactions,
    canManageTransactions,
    setEditingTransaction,
    setTxType,
    setSelectedCat,
    setIsAddTransactionModalOpen,
}) => {
    return (
        <div className="animate-in fade-in pb-20">
            <div className="sticky top-0 z-30 bg-slate-50 pb-4 -mt-4 -mx-4 px-5">
                <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-2xl relative border-b-1 border-blue-600 overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                    <div className="flex justify-between items-center relative z-50">
                        <button onClick={() => setIsFinanceStatsOpen(!isFinanceStatsOpen)} className="flex items-center gap-2 active:scale-95 transition-all text-left">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                <Wallet className="w-4 h-4 text-blue-400" />
                            </div>
                            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest flex items-center gap-1">
                                Báo cáo tài chính
                                <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform duration-300 ${!isFinanceStatsOpen ? 'rotate-180' : ''}`} />
                            </p>
                        </button>

                        <div className="relative z-50">
                            <button
                                onClick={() => setIsMonthOpen(!isMonthOpen)}
                                className="flex items-center gap-2 bg-blue-600 border border-blue-400 py-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 transition-all active:scale-95"
                            >
                                {monthLabels[selectedMonth]}
                                <ChevronDown className={`w-3 h-3 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMonthOpen && (
                                <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl z-[80] overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-1">
                                        {Object.keys(monthLabels).map((key) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => { setSelectedMonth(key); setIsMonthOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl mb-0.5 last:mb-0 ${selectedMonth === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <span>{monthLabels[key]}</span>
                                                {selectedMonth === key && <Check className="w-3.5 h-3.5" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isFinanceStatsOpen && (
                        <div className="animate-in slide-in-from-top-2 duration-200 mt-5 relative z-0">
                            {canViewProfit && (
                                <div className="text-center mb-5 relative z-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lợi nhuận ròng</p>
                                    <h3 className="text-4xl font-black tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-400">
                                        {formatN(financeStats.rev - financeStats.exp)}
                                    </h3>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 relative z-0">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tổng Doanh Thu</p>
                                    <p className="text-lg font-black text-emerald-400">+{formatN(financeStats.rev)}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tổng Chi Phí</p>
                                    <p className="text-lg font-black text-rose-400 mb-2">-{formatN(financeStats.exp)}</p>
                                    <div className="space-y-1 border-t border-white/10 pt-2">
                                        <div className="flex justify-between items-center text-[8px] font-bold">
                                            <span className="text-slate-400">Phí cố định</span>
                                            <span className="text-slate-300">{formatN(financeStats.fixedCosts)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[8px] font-bold">
                                            <span className="text-slate-400">Phát sinh</span>
                                            <span className="text-slate-300">{formatN(financeStats.txExp)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 space-y-2 px-1">
                {currentTransactions.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center mt-10">Chưa có giao dịch thu chi nào.</p>
                )}
                {currentTransactions.map(t => {
                    const openTransactionForm = () => {
                        if (!canManageTransactions) return;
                        setEditingTransaction(t);
                        setTxType(t.type);
                        const catKey = Object.keys(TRANSACTION_CATEGORIES).find(k => TRANSACTION_CATEGORIES[k].id === t.category) || 'OTHER';
                        setSelectedCat(catKey);
                        setIsAddTransactionModalOpen(true);
                    };

                    return (
                    <div
                        key={t.id}
                        onClick={openTransactionForm}
                        className={`bg-white px-2.5 py-2.5 rounded-xl border shadow-sm active:scale-[0.98] transition-all ${
                            t.type === 'in'
                                ? 'border-emerald-200 shadow-emerald-100/60'
                                : 'border-rose-200 shadow-rose-100/60'
                        } ${
                            canManageTransactions
                                ? t.type === 'in'
                                    ? 'cursor-pointer hover:border-emerald-400 hover:shadow-md'
                                    : 'cursor-pointer hover:border-rose-400 hover:shadow-md'
                                : ''
                        }`}
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center shadow-inner ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                <ArrowRight className={`w-4 h-4 ${t.type === 'in' ? 'rotate-[-45deg]' : 'rotate-[135deg]'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p
                                    title={t.note}
                                    className={`overflow-hidden whitespace-nowrap text-[9px] sm:text-[10px] font-black uppercase leading-tight tracking-[-0.02em] ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}
                                >
                                    {t.note}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-1.5">
                                    <p className="shrink-0 rounded-md bg-slate-50 px-1.5 py-0.5 text-[8px] font-bold leading-none tabular-nums text-slate-500 ring-1 ring-slate-100">
                                        {new Date(t.date).toLocaleDateString('vi-VN')}
                                    </p>
                                    <p className={`shrink-0 rounded-md border px-2 py-1 text-right text-[10px] sm:text-[11px] font-black leading-none tabular-nums shadow-sm ${
                                        t.type === 'in'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                    }`}>
                                        {t.type === 'in' ? '+' : '-'}{formatN(t.amount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FinanceView;
