import React, { useState } from 'react';
import { Building2, Mail, User, Lock, Loader2 } from 'lucide-react';

const AuthView = ({ fetchApi, setIsLoggedIn, setUser, showToast }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({ fullName: '', username: '', password: '' });

  const handleAuth = async (e, type) => {
    e.preventDefault();
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    try {
      if (type === 'register') {
        await fetchApi('/auth/register', 'POST', authForm);
        showToast("Đăng ký thành công! Vui lòng đăng nhập.", "success");
        setIsRegistering(false);
      } else if (type === 'forgot') {
        await fetchApi('/auth/forgot-password', 'POST', { username: authForm.username });
        showToast("Đã gửi yêu cầu khôi phục mật khẩu. Vui lòng kiểm tra email/SĐT.", "success");
        setIsForgotPassword(false);
      } else {
        const res = await fetchApi('/auth/login', 'POST', authForm);
        localStorage.setItem('smartstay_token', res.token);
        localStorage.setItem('smartstay_user', JSON.stringify(res.user));
        setUser(res.user);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.log("Auth error:", error);
      showToast(error.message || "Lỗi xác thực", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm text-center">
      <div className="relative mb-7">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 mx-auto mb-5 active:scale-95 transition-all">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black text-blue-600 tracking-tighter uppercase mb-2">Lucky Home</h1>
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Quản lý trọ toàn diện</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/70 p-4 text-left">
        {!isForgotPassword && (
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-4">
            <button
              type="button"
              disabled={isAuthLoading}
              onClick={() => setIsRegistering(false)}
              className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              disabled={isAuthLoading}
              onClick={() => setIsRegistering(true)}
              className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Đăng ký
            </button>
          </div>
        )}

        {isForgotPassword ? (
          <form className="space-y-3 animate-in slide-in-from-bottom" onSubmit={(e) => handleAuth(e, 'forgot')}>
            <div className="text-center pb-2">
              <h2 className="text-base font-black text-slate-900 uppercase">Khôi phục mật khẩu</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Nhập SĐT hoặc tên đăng nhập của bạn</p>
            </div>
            <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="text" placeholder="SĐT / Tên đăng nhập" disabled={isAuthLoading} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} required /></div>

            <button type="submit" disabled={isAuthLoading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-100 active:scale-95 transition-all mt-4 border-b-1 border-blue-800 text-center disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2">
              {isAuthLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAuthLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button type="button" disabled={isAuthLoading} onClick={() => setIsForgotPassword(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 text-center hover:text-blue-600 transition-colors disabled:opacity-50">
              Quay lại đăng nhập
            </button>
          </form>
        ) : (
          <form className="space-y-3 animate-in slide-in-from-bottom" onSubmit={(e) => handleAuth(e, isRegistering ? 'register' : 'login')}>
            <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="text" placeholder="SĐT / Tên đăng nhập" disabled={isAuthLoading} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} required /></div>
            {isRegistering && (
              <div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="text" placeholder="Họ và tên" disabled={isAuthLoading} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400" value={authForm.fullName} onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })} required /></div>
            )}
            <div className="relative group"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="password" placeholder="Mật khẩu" disabled={isAuthLoading} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 focus:bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required /></div>

            {!isRegistering && (
              <div className="text-right">
                <button type="button" disabled={isAuthLoading} onClick={() => setIsForgotPassword(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline transition-all disabled:opacity-50">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button type="submit" disabled={isAuthLoading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-100 active:scale-95 transition-all mt-4 border-b-1 border-blue-800 text-center disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2">
              {isAuthLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAuthLoading ? (isRegistering ? "Đang tạo..." : "Đang đăng nhập...") : (isRegistering ? "Tạo tài khoản" : "Đăng nhập")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthView;