import React, { useMemo, useState } from 'react';
import { Landmark } from 'lucide-react';
import { formatN, parseN } from '../../utils/formatters';
import { getSafeDate } from '../../utils/date';

const AddSavingForm = ({ onSave, onDelete, editingSaving, uniqueBankNames }) => {
    const calcKey = editingSaving?.id || 'new';
    const [calcDraftByKey, setCalcDraftByKey] = useState({});
    const baseSavingCalc = useMemo(() => ({
        amount: editingSaving?.amount || 0,
        rate: editingSaving?.interestRate || 0,
        months: editingSaving?.termMonths || 0
    }), [editingSaving]);
    const savingCalc = { ...baseSavingCalc, ...(calcDraftByKey[calcKey] || {}) };
    const updateSavingCalc = (patch) => {
        setCalcDraftByKey(prev => ({
            ...prev,
            [calcKey]: { ...(prev[calcKey] || {}), ...patch }
        }));
    };

    return (
        <form onSubmit={onSave} className="space-y-4 text-left p-1">
            {savingCalc.amount > 0 && savingCalc.rate > 0 && savingCalc.months > 0 && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tiền lãi dự tính</span>
                    <span className="text-base font-black text-emerald-600">+{formatN(Math.round((savingCalc.amount * (savingCalc.rate / 100) * (savingCalc.months / 12))))} đ</span>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ngân hàng / Tên sổ</label>
                <div className="relative group">
                    <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <input type="text" name="bankName" list="bank-names-list" required defaultValue={editingSaving?.bankName} placeholder="VD: Vietcombank, Sổ tiết kiệm 1..." className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" />
                    <datalist id="bank-names-list">
                        {uniqueBankNames.map((name, idx) => (
                            <option key={idx} value={name} />
                        ))}
                    </datalist>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền gửi (VNĐ)</label>
                <input type="text" name="amount" required defaultValue={editingSaving ? formatN(editingSaving.amount) : ''} onInput={(e) => { e.target.value = formatN(parseN(e.target.value)); updateSavingCalc({ amount: parseN(e.target.value) }); }} placeholder="0" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-800 outline-none focus:border-amber-500 shadow-inner" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lãi suất (%/năm)</label><input type="number" step="0.1" name="interestRate" required defaultValue={editingSaving?.interestRate} onChange={(e) => updateSavingCalc({ rate: Number(e.target.value) })} placeholder="VD: 5.5" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kỳ hạn (Tháng)</label><input type="number" step="any" name="termMonths" required defaultValue={editingSaving?.termMonths} onChange={(e) => updateSavingCalc({ months: Number(e.target.value) })} placeholder="VD: 6, hoặc 0.5..." className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" /></div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ngày gửi</label>
                <input type="date" name="startDate" required defaultValue={getSafeDate(editingSaving?.startDate)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ghi chú thêm</label>
                <textarea name="note" rows="2" defaultValue={editingSaving?.note} placeholder="Tùy chọn..." className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm outline-none focus:border-amber-500 shadow-inner resize-none"></textarea>
            </div>

            <div className="flex gap-2 pt-3">
                {editingSaving && (
                    <button type="button" onClick={() => onDelete(editingSaving.id)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[11px] active:scale-95 border-b-1 border-red-200 transition-all">Xóa sổ</button>
                )}
                <button type="submit" className={`flex-[2] text-white py-4 rounded-xl font-black uppercase text-[11px] shadow-lg transition-all active:scale-95 border-b-1 bg-slate-900 border-slate-950 hover:bg-slate-800`}>
                    {editingSaving ? 'Lưu thay đổi' : 'Thêm sổ tiết kiệm'}
                </button>
            </div>
        </form>
    );
};

export default AddSavingForm;
