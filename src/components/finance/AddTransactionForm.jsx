import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { TRANSACTION_CATEGORIES } from '../../utils/constants';
import { formatN, parseN } from '../../utils/formatters';

const AddTransactionForm = ({
    onSave,
    onDelete,
    editingTransaction,
    canManageTransactions,
    txType,
    setTxType,
    selectedCat,
    setSelectedCat,
    isCatOpen,
    setIsCatOpen
}) => {
    return (
        <form onSubmit={onSave} className="space-y-5 text-left p-1">
            <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5">
                <button
                    type="button"
                    onClick={() => setTxType('in')}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${txType === 'in' ? 'bg-white text-emerald-600' : 'text-slate-400'}`}
                >
                    <div className={`w-2 h-2 rounded-full ${txType === 'in' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    Thu vào (+)
                </button>
                <button
                    type="button"
                    onClick={() => setTxType('out')}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${txType === 'out' ? 'bg-white text-rose-600' : 'text-slate-400'}`}
                >
                    <div className={`w-2 h-2 rounded-full ${txType === 'out' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
                    Chi ra (-)
                </button>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Số tiền (VND)</label>
                <div className="relative">
                    <input
                        type="text" name="amount" required placeholder="0"
                        defaultValue={editingTransaction ? formatN(editingTransaction.amount) : ''}
                        className={`w-full p-4 bg-slate-50 rounded-xl font-black text-2xl outline-none border-2 transition-all shadow-inner tabular-nums`}
                        onInput={(e) => { e.target.value = formatN(parseN(e.target.value)); }}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">đ</span>
                </div>
            </div>

            <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Danh mục</label>

                <button
                    type="button"
                    onClick={() => setIsCatOpen(!isCatOpen)}
                    className="w-full p-4 bg-slate-50 rounded-xl font-bold text-sm text-left flex justify-between items-center border-2 border-transparent hover:border-slate-200 transition-all shadow-inner active:scale-[0.99]"
                >
                    <span className="text-slate-700">
                        {TRANSACTION_CATEGORIES[selectedCat]?.label || TRANSACTION_CATEGORIES['RENT'].label}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isCatOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCatOpen && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsCatOpen(false)}></div>
                        <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                            <div className="max-h-60 overflow-y-auto p-1">
                                {Object.keys(TRANSACTION_CATEGORIES).map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => { setSelectedCat(key); setIsCatOpen(false); }}
                                        className={`w-full px-4 py-3.5 text-left text-sm font-bold flex justify-between items-center transition-colors rounded-xl mb-0.5 last:mb-0 ${selectedCat === key ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}
                                    >
                                        <span>{TRANSACTION_CATEGORIES[key].label}</span>
                                        {selectedCat === key && <Check className="w-4 h-4 text-blue-600" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Nội dung chi tiết</label>
                <textarea
                    name="note" rows="2" placeholder="Ghi chú thêm..."
                    defaultValue={editingTransaction?.note || ''}
                    className="w-full p-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-600/20 shadow-inner resize-none"
                />
            </div>

            <div className="flex gap-2 pt-3">
                {editingTransaction && canManageTransactions && (
                    <button type="button" onClick={() => onDelete(editingTransaction.id)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[11px] active:scale-95 border-b-1 border-red-200">Xóa</button>
                )}
                <button type="submit" className={`flex-[2] text-white py-4 rounded-xl font-black uppercase text-[11px] transition-all active:scale-95 border-b-1 ${txType === 'in' ? 'bg-emerald-600 border-emerald-800' : 'bg-rose-600 border-rose-800'}`}>
                    {editingTransaction ? 'Lưu thay đổi' : 'Xác nhận'}
                </button>
            </div>

            <input type="hidden" name="type" value={txType} />
            <input type="hidden" name="category" value={TRANSACTION_CATEGORIES[selectedCat]?.id ?? 0} />
        </form>
    );
};

export default AddTransactionForm;