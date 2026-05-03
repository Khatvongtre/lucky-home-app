import React from 'react';
import {
  Building2, Bell, User, TrendingUp, Sparkles, ChevronRight,
  CircleDollarSign, PiggyBank, PlusCircle, LogOut
} from 'lucide-react';
import { formatN } from '../utils/formatters';
import ToastNotification from '../components/common/Toast';

const HubView = ({
  user, houses, setIsHubMode, setActiveTab, setSelectedHouse,
  setConfig, setSearchQuery, setEditingHouse, setIsAiCreateHouseOpen,
  setIsAiPromptModalOpen, setAiPrompt, setIsListening, showToast,
  handleLogout, toast
}) => {
  const hubStats = houses.reduce((acc, h) => {
    acc.totalHouses += 1;
    acc.totalRooms += h.totalRooms || 0;
    acc.emptyRooms += h.emptyRooms || 0;
    acc.revenue += h.revenue || 0;
    acc.profit += h.profit || ((h.revenue || 0) - (h.expense || 0));
    return acc;
  }, { totalHouses: 0, totalRooms: 0, emptyRooms: 0, revenue: 0, profit: 0 });

  const occupancyRate = hubStats.totalRooms > 0
    ? Math.round(((hubStats.totalRooms - hubStats.emptyRooms) / hubStats.totalRooms) * 100)
    : 0;
  const recentHouses = houses.slice(0, 3);

  return (
    <div className="h-screen bg-slate-100 text-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-200 shadow-2xl overflow-hidden">
      <ToastNotification toast={toast} />

      <div className="shrink-0 bg-white border-b border-slate-200 px-5 pt-8 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lucky Home</p>
            <h1 className="text-xl font-black text-indigo-700 tracking-tight truncate mt-1">
              {user?.fullName || 'Tài khoản quản lý'}
            </h1>
            <p className="text-[12px] font-semibold text-slate-500 mt-1">
              Tổng quan vận hành và lối vào nhanh
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center active:scale-95 transition-all" aria-label="Thông báo">
              <Bell className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => { setIsHubMode(false); setActiveTab('profile'); setSelectedHouse(null); }} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all" aria-label="Tài khoản">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Cơ sở', value: hubStats.totalHouses, tone: 'text-blue-700 bg-blue-50' },
            { label: 'Phòng', value: hubStats.totalRooms, tone: 'text-slate-700 bg-slate-50' },
            { label: 'Trống', value: hubStats.emptyRooms, tone: 'text-amber-700 bg-amber-50' },
            { label: 'Lấp đầy', value: `${occupancyRate}%`, tone: 'text-emerald-700 bg-emerald-50' }
          ].map(item => (
            <div key={item.label} className={`rounded-xl border border-slate-200 p-2.5 text-center ${item.tone}`}>
              <p className="text-[15px] font-black tabular-nums leading-none">{item.value}</p>
              <p className="text-[7px] font-black uppercase tracking-widest mt-1.5 opacity-70">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4 no-scrollbar">
        <section className="bg-slate-900 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vận hành tháng này</p>
              <h2 className="text-2xl font-black text-emerald-400 mt-2 tabular-nums">
                {formatN(hubStats.revenue)}
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Doanh thu ghi nhận từ các cơ sở</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Lợi nhuận</p>
              <p className="text-sm font-black text-blue-300 tabular-nums mt-1">{formatN(hubStats.profit)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Phòng đang thuê</p>
              <p className="text-sm font-black text-white tabular-nums mt-1">{hubStats.totalRooms - hubStats.emptyRooms}/{hubStats.totalRooms}</p>
            </div>
          </div>
        </section>

        {hubStats.totalHouses === 0 && (
          <section className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
                <div className="min-w-0"><h3 className="text-sm font-black text-blue-800 uppercase">Bắt đầu nhanh</h3><p className="text-[11px] font-semibold text-slate-500 mt-0.5">Thiết lập app theo đúng luồng quản lý</p></div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {[
                { icon: Building2, title: 'Tạo cơ sở đầu tiên', desc: 'Nhập thông tin nhà, hợp đồng và phí dịch vụ', action: () => { setActiveTab('dashboard'); setIsHubMode(false); setEditingHouse(null); setIsAiCreateHouseOpen(true); } },
                { icon: Sparkles, title: 'Tạo nhanh bằng AI', desc: 'Mô tả căn nhà để app tự dựng dữ liệu ban đầu', action: () => { setActiveTab('dashboard'); setIsHubMode(false); setIsAiPromptModalOpen(true); setAiPrompt(""); setIsListening(false); } },
                { icon: User, title: 'Cập nhật tài khoản', desc: 'Đổi mật khẩu để bảo vệ phiên đăng nhập', action: () => { setIsHubMode(false); setActiveTab('profile'); setSelectedHouse(null); } }
              ].map(item => (
                <button key={item.title} type="button" onClick={item.action} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-left active:scale-[0.99] transition-all">
                  <div className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-sm"><item.icon className="w-4.5 h-4.5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-[12px] font-black text-indigo-700 uppercase truncate">{item.title}</p><p className="text-[10px] font-semibold text-slate-500 mt-0.5 leading-snug">{item.desc}</p></div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          {[
            { label: 'Quản lý cơ sở', desc: `${hubStats.totalHouses} cơ sở`, icon: Building2, tone: 'bg-blue-600 text-white', action: () => { setIsHubMode(false); setActiveTab('dashboard'); } },
            { label: 'Sổ chi tiêu', desc: 'Đang phát triển', icon: CircleDollarSign, tone: 'bg-white text-orange-600', action: () => showToast('Chức năng sổ chi tiêu đang phát triển', 'success') },
            { label: 'Sổ tiết kiệm', desc: 'Theo dõi tiền gửi', icon: PiggyBank, tone: 'bg-white text-emerald-600', action: () => { setIsHubMode(false); setActiveTab('savings'); setSelectedHouse(null); } },
            { label: 'AI Chat', desc: 'Hỗ trợ thao tác', icon: Sparkles, tone: 'bg-white text-indigo-600', action: () => { setIsHubMode(false); setActiveTab('ai'); setSelectedHouse(null); } }
          ].map(item => (
            <button key={item.label} type="button" onClick={item.action} className={`${item.tone} min-h-[112px] rounded-xl border border-slate-200 p-4 text-left shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between`}>
              <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center"><item.icon className="w-5 h-5" /></div>
              <div><h3 className="text-[13px] font-black uppercase leading-tight">{item.label}</h3><p className="text-[10px] font-bold opacity-70 mt-1">{item.desc}</p></div>
            </button>
          ))}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <div><h3 className="text-sm font-black text-blue-700 uppercase">Cơ sở của bạn</h3><p className="text-[11px] font-semibold text-slate-500 mt-0.5">Chọn nhanh để vào dashboard</p></div>
            <button type="button" onClick={() => { setIsHubMode(false); setActiveTab('dashboard'); }} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">Tất cả <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentHouses.length === 0 && (
              <div className="p-5 text-center">
                <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-500">Bạn chưa có cơ sở nào.</p>
                <button type="button" onClick={() => { setActiveTab('dashboard'); setIsHubMode(false); setEditingHouse(null); setIsAiCreateHouseOpen(true); }} className="mt-4 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase">Tạo cơ sở đầu tiên</button>
              </div>
            )}
            {recentHouses.map(h => (
              <button key={h.id} type="button" onClick={() => { setSelectedHouse(h); setConfig({ ...h }); setIsHubMode(false); setActiveTab('dashboard'); setSearchQuery(''); }} className="w-full p-3.5 flex items-center gap-3 text-left active:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h4 className="text-[13px] font-black text-blue-800 uppercase truncate">{h.name}</h4><span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase shrink-0">{h.userRole || user?.role}</span></div><p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">{h.address || 'Chưa cập nhật địa chỉ'}</p></div>
                <div className="text-right shrink-0"><p className="text-[12px] font-black text-emerald-700 tabular-nums">{Math.max((h.totalRooms || 0) - (h.emptyRooms || 0), 0)}/{h.totalRooms || 0}</p><p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">đã thuê</p></div>
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3"><button type="button" onClick={() => { setActiveTab('dashboard'); setIsHubMode(false); setEditingHouse(null); setIsAiCreateHouseOpen(true); }} className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all"><div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><PlusCircle className="w-5 h-5" /></div><div><p className="text-[11px] font-black text-blue-700 uppercase">Thêm cơ sở</p><p className="text-[9px] font-bold text-slate-500 mt-0.5">Nhập thủ công</p></div></button><button type="button" onClick={() => { setActiveTab('dashboard'); setIsHubMode(false); setIsAiPromptModalOpen(true); setAiPrompt(""); setIsListening(false); }} className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all"><div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div><div><p className="text-[11px] font-black text-indigo-700 uppercase">Tạo bằng AI</p><p className="text-[9px] font-bold text-slate-500 mt-0.5">Từ mô tả nhà</p></div></button></section>
        <button type="button" onClick={handleLogout} className="w-full bg-white border border-red-100 text-red-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"><LogOut className="w-4 h-4" /> Đăng xuất</button>
      </div>
    </div>
  );
};
export default HubView;