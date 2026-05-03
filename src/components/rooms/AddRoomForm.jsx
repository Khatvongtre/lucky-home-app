import React, { useState } from 'react';
import { formatN, parseN } from '../../utils/formatters';
import { getSafeDate } from '../../utils/date';

const AddRoomForm = ({ onSave, onDelete, editingRoom, sharedHeaters }) => {
    const [heaterType, setHeaterType] = useState(editingRoom?.heaterMeterId ? 'shared' : 'private');
    const [status, setStatus] = useState(editingRoom?.status || 'full');
    const [roomType, setRoomType] = useState(editingRoom?.roomType || 'room');

    return (
        <form onSubmit={onSave} className="space-y-4 text-left">
            <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">Trạng thái phòng</label>
                <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                    <button type="button" onClick={() => setStatus('full')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${status === 'full' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Đã chốt</button>
                    <button type="button" onClick={() => setStatus('empty')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${status === 'empty' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Đang trống</button>
                </div>
                <input type="hidden" name="status" value={status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Mã phòng / Tên MB</label><input name="rid" defaultValue={editingRoom?.roomCode || editingRoom?.id || ''} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Giá thuê</label><input name="price" type="text" defaultValue={formatN(editingRoom?.price || 0)} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-blue-600" onInput={(e) => e.target.value = formatN(parseN(e.target.value))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase px-1">Loại hình</label>
                    <select name="roomType" value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600 appearance-none">
                        <option value="room">Phòng trọ</option>
                        <option value="mbkd">Mặt bằng kinh doanh</option>
                    </select>
                </div>
                {roomType === 'mbkd' && (
                    <div className="space-y-1 animate-in zoom-in-95">
                        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Phí DV hàng tháng</label>
                        <input name="monthlyFee" type="text" defaultValue={formatN(editingRoom?.monthlyFee || 0)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-blue-600 text-blue-700" onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="Thu hàng tháng" />
                    </div>
                )}
            </div>

            <div className={`grid grid-cols-2 gap-3 text-left transition-all duration-300 ${status === 'empty' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Số cư dân</label><input name="people" type="number" defaultValue={editingRoom?.peopleCount ?? editingRoom?.people ?? 2} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Xe điện</label><input name="ebikes" type="number" defaultValue={editingRoom?.eBikeCount ?? editingRoom?.eBikes ?? 0} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            </div>

            <div className={`space-y-1 text-left transition-all duration-300 ${status === 'empty' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">Ngày ký HĐ</label>
                <input name="start" type="date" defaultValue={getSafeDate(editingRoom?.contractStart)} required={status === 'full'} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
            </div>

            <div className={`grid grid-cols-2 gap-3 text-left transition-all duration-300 ${status === 'empty' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Hạn đóng (Ngày)</label><input name="payDay" type="number" defaultValue={editingRoom?.paymentDate || 5} min="1" max="31" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Thời hạn (Tháng)</label><input name="months" type="number" defaultValue={editingRoom?.months || 12} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            </div>

            <div className="space-y-1 text-left">
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">Công tơ BNL</label>
                <select name="heaterType" value={heaterType} onChange={(e) => setHeaterType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600 appearance-none">
                    <option value="private">Dùng riêng / Không có</option>
                    <option value="shared">Dùng chung tổng</option>
                </select>
            </div>

            {heaterType === 'shared' && (
                <div className="space-y-1 animate-in slide-in-from-top-2 text-left">
                    <label className="text-[8px] font-black text-blue-600 uppercase px-1">Chọn công tơ tổng</label>
                    <select name="heaterMeterId" defaultValue={editingRoom?.heaterMeterId || ''} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-black text-xs outline-none focus:border-blue-600 text-blue-700">
                        {sharedHeaters && sharedHeaters.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
                        {(!sharedHeaters || sharedHeaters.length === 0) && <option value="">Không có công tơ BNL nào</option>}
                    </select>
                </div>
            )}

            <div className="flex gap-2 mt-4">
                {editingRoom && (
                    <button type="button" onClick={() => onDelete(editingRoom.id, editingRoom.roomCode)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-b-1 border-red-200 active:translate-y-1 transition-all text-center">
                        Xóa
                    </button>
                )}
                <button type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-b-1 border-blue-800 active:translate-y-1 transition-all text-center">
                    {status === 'full' ? 'Lưu phòng' : 'Lưu phòng trống'}
                </button>
            </div>
        </form>
    );
};

export default AddRoomForm;