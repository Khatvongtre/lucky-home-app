import React from 'react';
import { User, UserCheck } from 'lucide-react';
import Modal from '../common/Modal';

const ShareHouseModal = ({ isShareModalOpen, setIsShareModalOpen, sharingHouse, setSharingHouse, assignForm, setAssignForm, handleAssignRole }) => {
    if (!isShareModalOpen) return null;

    return (
        <Modal title="PHÂN QUYỀN & CHIA SẺ CƠ SỞ" onClose={() => { setIsShareModalOpen(false); setSharingHouse(null); }}>
            <form onSubmit={handleAssignRole} className="space-y-4 text-left">
                <p className="text-[10px] font-bold text-slate-500 mb-2">Thêm tài khoản quản lý cho cơ sở <span className="text-blue-600 font-black">{sharingHouse?.name}</span></p>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tài khoản (SĐT/Username)</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text" required value={assignForm.username} onChange={(e) => setAssignForm({ ...assignForm, username: e.target.value })}
                            placeholder="Nhập SĐT hoặc tên đăng nhập..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vai trò (Role)</label>
                    <select
                        value={assignForm.role} onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-all appearance-none"
                    >
                        <option value="Manager">Quản lý (Manager)</option>
                        <option value="Staff">Nhân viên (Staff)</option>
                    </select>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-2 border-b-1 border-blue-800 text-center mt-4 active:scale-95 transition-all">
                    <UserCheck className="w-4 h-4" /> Xác nhận cấp quyền
                </button>
            </form>
        </Modal>
    );
};

export default ShareHouseModal;