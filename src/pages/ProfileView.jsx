import React from 'react';
import { User, Lock, LogOut } from 'lucide-react';
import AppUpdatePanel from '../components/common/AppUpdatePanel';

const ProfileView = ({
    user,
    getRoleLabel,
    handleLogout,
    changePasswordForm,
    setChangePasswordForm,
    handleChangePassword
}) => {
    return (
        <div className="min-h-[calc(100vh-170px)] flex flex-col animate-in fade-in pb-6">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <User className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-base text-slate-900 uppercase tracking-tight truncate">
                            {user?.fullName || user?.username || 'Tài khoản'}
                        </h3>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                            {getRoleLabel(user?.role)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-blue-600 px-5 py-4">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Đổi mật khẩu</h4>
                </div>
                <form onSubmit={handleChangePassword} className="p-5">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase px-1">Mật khẩu cũ</label>
                            <input type="password" value={changePasswordForm.oldPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, oldPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase px-1">Mật khẩu mới</label>
                            <input type="password" value={changePasswordForm.newPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase px-1">Xác nhận mật khẩu mới</label>
                            <input type="password" value={changePasswordForm.confirmNewPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, confirmNewPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
                        </div>
                        <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-rose-800 active:translate-y-1 transition-all">
                            <Lock className="w-4 h-4" /> Xác nhận đổi mật khẩu
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-4">
                <AppUpdatePanel />
            </div>

            <button
                type="button"
                onClick={handleLogout}
                className="mt-4 w-full bg-white border border-red-100 text-red-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            >
                <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
        </div>
    );
};

export default ProfileView;
