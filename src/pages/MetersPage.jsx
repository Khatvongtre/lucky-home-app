import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Flame, Zap, Edit, Boxes, Receipt, ZapOff } from 'lucide-react';
import { formatN, parseN } from '../utils/formatters';

const MetersPage = ({
    handlePrevMonth,
    handleNextMonth,
    monthDisplay,
    summary,
    config,
    currentMeters,
    handleUpdateOldMeterUI,
    handleUpdateMeterUI,
    setEditingMeter,
    setIsAddMeterModalOpen,
    setMappingMeter,
    handleSaveMetersAndGenerateBills
}) => {
    return (
        <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="sticky top-0 z-30 bg-blue-600 rounded-xl border border-blue-600 backdrop-blur-md p-4 space-y-4">
                <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm flex items-center">
                    <button type="button" onClick={handlePrevMonth} className="p-3 hover:bg-slate-50 rounded-xl text-blue-600 active:scale-90 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex-1 text-center">
                        <p className="text-[8px] font-black uppercase text-blue-600">Kỳ chốt số điện</p>
                        <div className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-1.5 rounded-full w-fit mx-auto">
                            <Calendar className="w-3.5 h-3.5 text-white" />
                            <span className="text-xs font-black text-white uppercase">{monthDisplay}</span>
                        </div>
                    </div>
                    <button type="button" onClick={handleNextMonth} className="p-3 hover:bg-slate-50 rounded-xl text-blue-600 active:scale-90 transition-all"><ChevronRight className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-3 rounded-xl text-center">
                        <p className="text-[7px] font-black text-rose-400 uppercase mb-1">Tổng điện</p>
                        <div className="flex items-baseline gap-1 text-rose-600 justify-center">
                            <span className="text-sm font-black">{formatN(summary.kwh)}</span><span className="text-[7px] font-bold">kWh</span>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                        <p className="text-[7px] font-black text-orange-400 uppercase mb-1">Nóng lạnh</p>
                        <div className="flex items-baseline gap-1 text-orange-600 justify-center">
                            <span className="text-sm font-black">{formatN(summary.heater)}</span><span className="text-[7px] font-bold">kWh</span>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                        <p className="text-[7px] font-black text-emerald-500 uppercase mb-1">Tổng tiền</p>
                        <div className="flex items-baseline gap-0.5 text-emerald-600 justify-center">
                            <span className="text-sm font-black">{formatN(summary.money)}</span><span className="text-[7px] font-bold">đ</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 px-0.5">
                {(!currentMeters || currentMeters.length === 0) && (
                    <div className="py-20 text-center">
                        <ZapOff className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 italic">Chưa có dữ liệu kỳ này.</p>
                    </div>
                )}
                {currentMeters?.map(m => {
                    const isOldEmpty = m.oldVal === null || m.oldVal === "";
                    const isNewEmpty = m.newVal === null || m.newVal === "";
                    let consumption = 0;
                    let totalPrice = 0;

                    if (!isOldEmpty && !isNewEmpty) {
                        const vOld = parseN(String(m.oldVal));
                        const vNew = parseN(String(m.newVal));
                        consumption = vNew >= vOld ? (vNew - vOld) : 0;
                        totalPrice = consumption * (config.priceElec || 0);
                    }

                    return (
                        <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === 'heater' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-600'}`}>
                                        {m.type === 'heater' ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-rose-800 leading-none">{m.name}</p>
                                        <p className="text-[8px] font-bold text-blue-400 mt-1">
                                            Tổng: {formatN(consumption)} số - Tiền: {formatN(totalPrice)} đ
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setEditingMeter(m); setIsAddMeterModalOpen(true); }} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-all"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => setMappingMeter(m)} className="p-2 bg-slate-50 text-slate-400 rounded-xl active:bg-orange-50 active:text-orange-500 transition-all"><Boxes className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block px-1">Số cũ</label>
                                    <input type="number" value={m.oldVal || ''} onChange={(e) => handleUpdateOldMeterUI(m.id, e.target.value)} className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-xl font-black text-slate-500 text-center text-sm outline-none focus:border-purple-200 transition-all shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-[8px] font-black text-rose-600 uppercase mb-1 block px-1">Số mới</label>
                                    <input type="number" value={m.newVal || ''} onChange={(e) => handleUpdateMeterUI(m.id, e.target.value)} className="w-full bg-blue-50/50 border-2 border-transparent p-3 rounded-xl font-black text-red-600 text-center text-sm outline-none focus:border-red-200 transition-all shadow-inner" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {currentMeters?.length > 0 && (
                <div className="fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
                    <button
                        onClick={handleSaveMetersAndGenerateBills}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] border-b-1 border-blue-800 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                    >
                        <Receipt className="w-4 h-4" /> Xác nhận lưu & Lập hóa đơn {monthDisplay}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MetersPage;