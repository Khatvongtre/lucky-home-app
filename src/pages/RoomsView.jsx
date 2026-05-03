import React from 'react';
import { LucideEdit, CreditCard, Calendar, Users2, Bike, PlusCircle } from 'lucide-react';
import { formatN } from '../utils/formatters';
import { diffDays, getDueInfo, endContract } from '../utils/date';

const RoomsView = ({
    currentRooms,
    setEditingRoom,
    setIsAddRoomModalOpen,
    isManagerOrAbove
}) => {
    return (
        <div className="space-y-4 pb-20 animate-in slide-in-from-right">
            <div className="grid grid-cols-2 gap-2">
                {currentRooms.length === 0 && <p className="text-xs text-slate-400 italic mt-5 col-span-2 text-center">Chưa có phòng nào. Bấm Thêm phòng mới bên dưới.</p>}
                {currentRooms.map(r => {
                    const payDays = getDueInfo(r.paymentDate)?.daysLeft || 0;
                    const contractEndDate = endContract(r.contractStart, r.months);
                    const endDays = diffDays(contractEndDate);
                    const isPayUrgent = r.status === 'full' && payDays <= 3;
                    const isPaySoon = r.status === 'full' && payDays > 3 && payDays <= 7;
                    const showContractWarning = r.status === 'full' && contractEndDate && endDays <= 30;
                    const cardStyle = r.status !== 'full'
                        ? 'bg-white/70 border-dashed border-slate-200 opacity-75'
                        : isPayUrgent
                            ? 'bg-red-50 border-red-200 shadow-red-100'
                            : isPaySoon
                                ? 'bg-amber-50 border-amber-200 shadow-amber-100'
                                : 'bg-white border-slate-200 shadow-slate-100';
                    const roomBadgeStyle = r.status !== 'full'
                        ? 'bg-slate-200 text-slate-600'
                        : isPayUrgent
                            ? 'bg-red-600 text-white'
                            : isPaySoon
                                ? 'bg-amber-500 text-white'
                                : 'bg-blue-600 text-white';
                    const payColor = isPayUrgent ? 'bg-red-100 text-red-700 border-red-200' : isPaySoon ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    const endColor = endDays <= 7 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';

                    return (
                        <div key={r.id} className={`p-3 rounded-xl border-2 shadow-sm relative transition-all flex flex-col active:scale-[0.99] ${cardStyle}`}>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`px-2 py-0.5 rounded-md font-black text-[10px] shadow-sm ${roomBadgeStyle}`}>
                                    {r.roomType === 'mbkd' ? 'MBKD ' : 'P.'}{r.roomCode || r.id} {r.status === 'empty' ? '- TRỐNG' : ''}
                                </span>
                                <button onClick={() => { setEditingRoom(r); setIsAddRoomModalOpen(true); }} className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:border-blue-600 hover:text-white active:scale-95 transition-all shadow-sm"><LucideEdit className="w-3 h-3" /></button>
                            </div>
                            <p className={`text-[14px] font-black leading-none mb-2 ${isPayUrgent ? 'text-red-700' : isPaySoon ? 'text-amber-700' : 'text-blue-800'}`}>{formatN(r.price)}</p>

                            {r.status === 'full' && (
                                <div className="space-y-1.5 border-t border-slate-200/70 pt-2 flex-1">
                                    <div className="flex justify-between items-center text-[8px] font-bold uppercase gap-2"><span className="text-slate-500 flex items-center"><CreditCard className="w-3 h-3 mr-1 text-blue-600" /> Đóng tiền</span><span className={`px-1.5 py-0.5 rounded-md border text-center font-black ${payColor}`}>Còn {payDays > 0 ? payDays : 0} ngày</span></div>
                                    {showContractWarning && (
                                        <div className="flex justify-between items-center text-[8px] font-bold uppercase gap-2"><span className="text-slate-500 flex items-center"><Calendar className="w-3 h-3 mr-1 text-amber-600" /> Hợp đồng</span><span className={`px-1.5 py-0.5 rounded-md border text-center font-black ${endColor}`}>Còn {endDays > 0 ? endDays : 0} ngày</span></div>
                                    )}
                                </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 pt-2">
                                <div className="flex items-center text-slate-600 font-bold text-[9px] bg-white/70 border border-slate-200 px-1.5 py-0.5 rounded-md"><Users2 className="w-3 h-3 mr-1 text-blue-600" />{r.peopleCount ?? r.people ?? 0} người</div>
                                {r.eBikeCount > 0 && <div className="flex items-center text-slate-600 font-bold text-[9px] bg-white/70 border border-slate-200 px-1.5 py-0.5 rounded-md"><Bike className="w-3 h-3 mr-1 text-amber-600" />{r.eBikeCount ?? r.ebikes ?? 0} xe điện</div>}
                            </div>
                        </div>
                    )
                })}
            </div>

            {isManagerOrAbove && (
                <button onClick={() => { setEditingRoom(null); setIsAddRoomModalOpen(true); }} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <PlusCircle className="w-4 h-4 text-white" /> Thêm Phòng Mới
                </button>
            )}
        </div>
    );
};

export default RoomsView;