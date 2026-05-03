import React from 'react';
import { Loader2, Image as ImageIcon, Trash2, CheckCircle2, X } from 'lucide-react';
import { formatN, parseN } from '../../utils/formatters';

const BillReceipt = ({
    bottomSheet,
    setBottomSheet,
    config,
    API_URL,
    isManagerOrAbove,
    isOwnerOrAdmin,
    isGeneratingImage,
    handleDiscountChange,
    handleDiscountBlur,
    handleShareZaloImage,
    handleDeleteBill,
    handlePayBill
}) => {
    if (!bottomSheet || bottomSheet.type !== 'bill') return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBottomSheet(null)} />
            <div className="bg-white w-full max-w-lg h-full sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-500 relative flex flex-col no-scrollbar overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div
                        key={`receipt-export-${bottomSheet.data.id}-${bottomSheet.data.total}-${bottomSheet.data.details.discount}`}
                        id={`receipt-export-${bottomSheet.data.id}`}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mx-auto"
                        style={{
                            width: '100%',
                            maxWidth: '420px',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            WebkitFontSmoothing: 'antialiased',
                        }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-4 text-center">
                            <div className="flex items-center justify-center gap-3 mb-0.5">
                                <h1 className="text-2xl font-black uppercase tracking-tight">
                                    Lucky Home
                                </h1>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                                Hóa đơn thanh toán
                            </p>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* 1. Thông tin phòng & Kỳ thanh toán */}
                            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-bold text-blue-500 uppercase mb-0.5 tracking-widest">Phòng</p>
                                    <p className="text-xl font-black text-blue-700 leading-none">{bottomSheet.data.roomId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-blue-500 uppercase mb-0.5 tracking-widest">Kỳ thanh toán</p>
                                    <p className="text-base font-black text-blue-700 leading-none">{bottomSheet.data.currentMonthFull}</p>
                                </div>
                            </div>

                            {/* 2. Chi tiết các khoản phí */}
                            <div className="border border-slate-200 rounded-xl px-3 py-1 bg-white">
                                <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Tiền phòng</span>
                                    <span className="text-[13px] font-black text-slate-800">{formatN(bottomSheet.data.details.rent)}</span>
                                </div>

                                <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Tiền điện riêng</span>
                                        <p className="text-[9px] text-blue-500 font-semibold leading-tight mt-0.5">
                                            Số: {bottomSheet.data.meter?.old} → {bottomSheet.data.meter?.new} <span className="text-blue-600">({bottomSheet.data.meter?.new - bottomSheet.data.meter?.old} số)</span>
                                        </p>
                                    </div>
                                    <span className="text-[13px] font-black text-slate-800">{formatN(bottomSheet.data.details.elec)}</span>
                                </div>

                                {bottomSheet.data.heaterMeter && (
                                    <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Điện BNL Chung</span>
                                            <p className="text-[9px] text-rose-500 font-semibold leading-tight mt-0.5">
                                                Số: {bottomSheet.data.heaterMeter.old} → {bottomSheet.data.heaterMeter.new} <span className="text-rose-600">({bottomSheet.data.heaterMeter.new - bottomSheet.data.heaterMeter.old} số)</span>
                                            </p>
                                        </div>
                                        <span className="text-[13px] font-black text-slate-800">{formatN(bottomSheet.data.details.heater)}</span>
                                    </div>
                                )}

                                {[
                                    { label: "Tiền nước", val: bottomSheet.data.details.water },
                                    { label: "Phí dịch vụ", val: bottomSheet.data.details.service || 0 },
                                    { label: "Internet", val: bottomSheet.data.details.internet || 0 },
                                    { label: "Xe điện", val: bottomSheet.data.details.ebikes || 0 }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                                        <span className="text-[13px] font-black text-slate-800">{formatN(item.val)}</span>
                                    </div>
                                ))}

                                {bottomSheet.data.details.monthlyFee > 0 && (
                                    <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Phí DV Hàng tháng (MBKD)</span>
                                        <span className="text-[13px] font-black text-slate-800">{formatN(bottomSheet.data.details.monthlyFee)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
                                    <span className="text-[11px] font-bold text-red-500 uppercase tracking-tight">Giảm giá</span>
                                    {bottomSheet.data.status === 'pending' && isManagerOrAbove && !isGeneratingImage ? (
                                        <div className="flex items-center space-x-1 border-b border-dashed border-red-200 pb-0.5">
                                            <span className="text-red-500 font-bold">-</span>
                                            <input
                                                type="text"
                                                value={formatN(bottomSheet.data.details.discount || 0)}
                                                onChange={(e) => handleDiscountChange(bottomSheet.data.id, e.target.value)}
                                                onBlur={(e) => handleDiscountBlur(bottomSheet.data.id, parseN(e.target.value))}
                                                className="w-16 text-right bg-transparent text-red-600 font-black outline-none text-[13px]"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-[13px] font-black text-red-600">-{formatN(bottomSheet.data.details.discount || 0)}</span>
                                    )}
                                </div>
                                <div className="bg-indigo-600 p-3 rounded-lg text-white mb-2 mt-2 shadow-sm flex items-center justify-between">
                                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">
                                        Tổng thanh toán
                                    </p>
                                    <p className="text-xl font-black leading-none tabular-nums">
                                        {formatN(bottomSheet.data.total)}
                                        <span className="text-[11px] opacity-80 font-bold ml-1">đ</span>
                                    </p>
                                </div>
                            </div>
                            {/* 3. Tổng tiền & Chuyển khoản (Cân bằng & Sát viền) */}
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-stretch gap-3">
                                <div className="flex-1 flex flex-col justify-between">

                                    <div className="px-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Thông tin chuyển khoản</p>
                                        <p className="text-[15px] font-black text-purple-700 uppercase leading-tight truncate mt-5">{config.bankName || "MB BANK"}</p>
                                        <p className="text-[20px] font-black text-blue-600 tracking-tighter leading-tight mt-1">{config.bankAcc || "0000"}</p>
                                    </div>
                                </div>
                                <div className="w-[100px] h-[100px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-sm self-end">
                                    <img
                                        key={`qr-${bottomSheet.data.id}`}
                                        src={`${API_URL}/vietqr/generate?bankBin=${config.bankBin || '970422'}&bankAcc=${config.bankAcc || '0'}&amount=${bottomSheet.data.total}&addInfo=${encodeURIComponent(`P${bottomSheet.data.roomId} ${bottomSheet.data.currentMonthFull}`)}&t=${bottomSheet.data.id}-${bottomSheet.data.total}`}
                                        className="w-full h-full object-contain rounded-md"
                                        crossOrigin="anonymous"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pb-3 text-center mt-1">
                            <p className="text-[10px] text-slate-400 font-semibold italic">Cảm ơn quý khách đã tin tưởng Lucky Home!</p>
                        </div>
                    </div>

                </div>

                {/* Các Nút Thao Tác (Cố định ở dưới cùng) */}
                <div className="grid grid-cols-1 gap-3 shrink-0 mt-4 p-2 pt-4 border-t border-slate-100 w-full max-w-[420px] mx-auto">
                    <button disabled={isGeneratingImage} onClick={() => handleShareZaloImage(bottomSheet.data)} className="w-full bg-[#0068FF] text-white py-3.5 rounded-xl font-black text-[11px] uppercase active:scale-95 border-b-2 border-[#004BBF] flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-sm">
                        {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        {isGeneratingImage ? 'ĐANG TẠO ẢNH...' : 'COPY ẢNH CHO ZALO'}
                    </button>

                    {isOwnerOrAdmin && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleDeleteBill(bottomSheet.data.id)}
                                className={`bg-red-500 text-white py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 border-b-2 border-red-700 flex items-center justify-center gap-1.5 transition-all shadow-sm ${bottomSheet.data.status === 'pending' ? 'w-1/3' : 'w-full'}`}
                            >
                                <Trash2 className="w-4 h-4" /> Xóa
                            </button>

                            {bottomSheet.data.status === 'pending' && (
                                <button
                                    onClick={() => handlePayBill(bottomSheet.data.id)}
                                    className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 border-b-2 border-emerald-800 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Xác Nhận Đã Thu
                                </button>
                            )}
                        </div>
                    )}
                    <button onClick={() => setBottomSheet(null)} className="w-full bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-[11px] uppercase active:scale-95 flex items-center justify-center gap-2 transition-all border border-slate-200 shadow-sm">
                        <X className="w-4 h-4" /> Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BillReceipt;