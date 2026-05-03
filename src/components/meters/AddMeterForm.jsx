import React from 'react';

const AddMeterForm = ({ onSave, onDelete, editingMeter }) => {
    return (
        <form onSubmit={onSave} className="space-y-4 text-left">
            <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Tên mô tả</label><input name="name" defaultValue={editingMeter?.name || ''} placeholder="VD: BNL Tầng 1" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Loại thiết bị</label><select name="type" defaultValue={editingMeter?.type || 'electric'} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none appearance-none focus:border-blue-600"><option value="electric">Điện phòng</option><option value="heater">Bình nóng lạnh chung</option></select></div>
            <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Chỉ số đầu</label><input name="val" type="number" defaultValue={editingMeter?.oldVal || '0'} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            <div className="flex gap-2 mt-4">
                {editingMeter && (
                    <button type="button" onClick={() => onDelete(editingMeter.id)} className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-black uppercase text-[10px] border-b-1 border-red-200 active:translate-y-1 transition-all text-center">Xóa</button>
                )}
                <button type="submit" className="flex-[2] bg-orange-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] border-b-1 border-orange-800 active:translate-y-1 transition-all text-center">{editingMeter ? 'Lưu thay đổi' : 'Tạo công tơ'}</button>
            </div>
        </form>
    );
};

export default AddMeterForm;