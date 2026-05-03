import React from 'react';
import { Zap, TrendingUp, Droplets, Activity, Wifi } from 'lucide-react';
import { formatN } from '../utils/formatters';

const DashboardView = ({
    shouldShowMeterBanner,
    setActiveTab,
    dashboardSummary,
    canViewProfit,
    isOwnerOrAdmin,
    revenueChartData
}) => {
    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            {shouldShowMeterBanner && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-xl text-white shadow-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-lg"><Zap className="w-5 h-5" /></div>
                        <div><p className="font-black text-sm uppercase">Đến hạn chốt điện</p><p className="text-[9px] font-bold opacity-90">Kỳ chốt công tơ điện tháng này</p></div>
                    </div>
                    <button onClick={() => setActiveTab('meters_list')} className="px-4 py-2 bg-white text-orange-600 rounded-lg font-black text-[10px] active:scale-95">Ghi Số</button>
                </div>
            )}

            <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-blue-600">{dashboardSummary?.totalRooms || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Phòng</p></div>
                <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-emerald-600">{dashboardSummary?.emptyRooms || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Trống</p></div>
                <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-indigo-600">{dashboardSummary?.totalPeople || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Người</p></div>
                <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-orange-600">{dashboardSummary?.totalEbikes || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Xe điện</p></div>
            </div>

            {canViewProfit && (
                <div className="bg-slate-900 p-5 rounded-xl text-white shadow-xl relative overflow-hidden border-b-1 border-emerald-500">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Tổng doanh thu dự kiến</p>
                            <h3 className="text-3xl font-black text-emerald-400 tabular-nums leading-none">+{formatN(dashboardSummary?.revenue || 0)}</h3>
                        </div>
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-700/80 pt-3 mt-4 relative z-10">
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-400">Tổng chi phí</p>
                            <p className="text-sm font-black text-rose-400">-{formatN(dashboardSummary?.expense || 0)}</p>
                        </div>
                        <div className="text-right border-l border-slate-700/80 pl-4">
                            <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-400">Lợi nhuận ròng</p>
                            <p className="text-sm font-black text-blue-400">{formatN(dashboardSummary?.profit || 0)}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <div className="bg-orange-400 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Zap className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Điện dự tính</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedElecCost || 0)}</p></div>
                <div className="bg-sky-500 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Droplets className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Nước dự tính</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedWaterCost || 0)}</p></div>
                <div className="bg-purple-400 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Activity className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Dịch vụ</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedServiceCost || 0)}</p></div>
                <div className="bg-emerald-500 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Wifi className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Internet</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedInternetCost || 0)}</p></div>
            </div>

            {isOwnerOrAdmin && (
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <h4 className="font-black text-slate-400 uppercase text-[8px] mb-4 tracking-widest flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-2 text-blue-600" /> BIỂU ĐỒ DOANH THU</h4>
                    <div className="h-28 flex items-end justify-between px-1 gap-2.5 relative">
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-[33%]"></div>
                        <div className="absolute w-full h-[1px] bg-slate-50 bottom-[66%]"></div>
                        <div className="absolute w-full h-[1px] bg-slate-50 top-0"></div>
                        {revenueChartData.map((d, i) => (
                            <div key={i} className="flex-1 h-full flex flex-col items-center justify-end relative z-10 group cursor-pointer">
                                <div className="absolute -top-7 bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                                    {formatN(d.value)} đ
                                </div>
                                <div className="w-full flex-1 flex items-end">
                                    <div className={`w-full rounded-t-md transition-all duration-1000 ${d.isCurrent ? 'bg-gradient-to-t from-blue-600 to-sky-400 shadow-md' : 'bg-gradient-to-t from-slate-200 to-slate-100 group-hover:from-blue-300 group-hover:to-blue-200'}`} style={{ height: `${d.height}%`, minHeight: d.height > 0 ? '4px' : '0' }}></div>
                                </div>
                                <span className={`text-[6px] font-black mt-2 uppercase ${d.isCurrent ? 'text-blue-600' : 'text-slate-400'}`}>{d.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;