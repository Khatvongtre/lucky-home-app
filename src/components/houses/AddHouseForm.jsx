import React from 'react';
import { Save, FileText } from 'lucide-react';
import { formatN, parseN } from '../../utils/formatters';
import { getSafeDate } from '../../utils/date';

const AddHouseForm = ({ editingHouse, onSubmit }) => {
    return (
        <form onSubmit={onSubmit} className="space-y-4 text-left">
            <div className="space-y-3">
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Tên Cơ Sở</label><input name="name" defaultValue={editingHouse?.name || ''} required placeholder="VD: Lucky Cầu Giấy" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Địa chỉ</label><input name="address" defaultValue={editingHouse?.address || ''} required placeholder="VD: Số 10, Ngõ 12..." className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200">
                <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 flex items-center tracking-widest"><FileText className="w-3.5 h-3.5 mr-1" /> Thông tin hợp đồng thuê</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase px-1">1. Giá thuê nhà / tháng</label><input name="rentPrice" defaultValue={formatN(editingHouse?.rentPrice || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 15.000.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-blue-600 text-blue-700" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">2. Ngày bắt đầu</label><input type="date" name="startDate" defaultValue={getSafeDate(editingHouse?.startDate || '')} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">3. Thời hạn thuê (Tháng)</label><input type="number" name="leaseTerm" defaultValue={editingHouse?.leaseTerm || ''} placeholder="VD: 60" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">4. Tiền cọc</label><input name="deposit" defaultValue={formatN(editingHouse?.deposit || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 30.000.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">5. Đóng tiền mấy tháng/lần</label><input type="number" name="paymentPeriod" defaultValue={editingHouse?.paymentPeriod || 1} placeholder="VD: 3" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">6. Ngày đóng hàng tháng</label><input type="number" name="paymentDay" min="1" max="31" defaultValue={editingHouse?.paymentDay || 5} placeholder="VD: 5" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">7. Phí Internet / tháng</label><input name="internetFee" defaultValue={formatN(editingHouse?.internetFee || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 250.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                    <div className="space-y-1 col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase px-1">8. Chi phí khác</label><input name="otherFees" defaultValue={formatN(editingHouse?.otherFees || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 100.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                    <div className="space-y-1 col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase px-1">9. Ghi chú</label><textarea name="notes" defaultValue={editingHouse?.notes || ''} rows="2" placeholder="Ghi chú thêm..." className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600 resize-none" /></div>
                </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-2 border-b-1 border-blue-800 text-center mt-4">
                <Save className="w-4 h-4" /> {editingHouse ? "Lưu thay đổi" : "Khởi tạo cơ sở"}
            </button>
        </form>
    );
};

export default AddHouseForm;