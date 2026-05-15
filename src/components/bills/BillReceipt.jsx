import React, { useState } from 'react';
import { Loader2, Image as ImageIcon, Trash2, CheckCircle2, X } from 'lucide-react';
import { formatN, parseN } from '../../utils/formatters';

const resolveBackendAssetUrl = (src, API_URL) => {
    if (!src || typeof src !== 'string') return src;
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;

    try {
        return new URL(src, API_URL || 'http://localhost:3000/api').toString();
    } catch {
        return src;
    }
};

const buildMeterImages = (bill, API_URL) => {
    const fromMeterList = Array.isArray(bill.meters)
        ? bill.meters.map((meter, index) => ({
            label: meter.name || `Công tơ ${index + 1}`,
            src: resolveBackendAssetUrl(meter.imageUrl || meter.imageDataUrl, API_URL),
        }))
        : [];

    if (fromMeterList.length > 0) return fromMeterList;

    return [
        {
            label: 'Công tơ điện',
            src: resolveBackendAssetUrl(bill.meter?.imageUrl || bill.meter?.imageDataUrl || bill.meterImageUrl, API_URL),
        },
        {
            label: 'Công tơ BNL',
            src: resolveBackendAssetUrl(bill.heaterMeter?.imageUrl || bill.heaterMeter?.imageDataUrl || bill.heaterImageUrl, API_URL),
        },
    ];
};

const BillReceipt = ({
    bottomSheet,
    setBottomSheet,
    config,
    API_URL,
    isManagerOrAbove,
    isOwnerOrAdmin,
    isGeneratingImage,
    handleDiscountUpdate,
    handleShareZaloImage,
    handleDeleteBill,
    handlePayBill
}) => {
    // Local state quản lý riêng input giảm giá khi người dùng đang gõ
    const [discountDraftByBill, setDiscountDraftByBill] = useState({});
    const [failedMeterImages, setFailedMeterImages] = useState({});
    const billKey = bottomSheet?.data?.id || 'none';
    const localDiscount = discountDraftByBill[billKey] ?? formatN(bottomSheet?.data?.details?.discount || 0);
    const setLocalDiscount = (value) => {
        setDiscountDraftByBill(prev => ({ ...prev, [billKey]: value }));
    };


    if (!bottomSheet || bottomSheet.type !== 'bill') return null;

    const bill = bottomSheet.data;
    const meterImages = buildMeterImages(bill, API_URL)
        .filter(item => item.src && !failedMeterImages[item.src]);
    const bankBin = config.bankBin || '970422';
    const bankAcc = config.bankAcc || '0';
    const qrAddInfo = `P${bill.roomId} ${bill.currentMonthFull}`;
    const qrFingerprint = [
        API_URL,
        bankBin,
        bankAcc,
        bill.id,
        bill.roomId,
        bill.currentMonthFull,
        bill.total,
        bill.details.discount || 0
    ].join('|');
    const qrSrc = `${API_URL}/vietqr/generate?bankBin=${bankBin}&bankAcc=${bankAcc}&amount=${bill.total}&addInfo=${encodeURIComponent(qrAddInfo)}&t=${encodeURIComponent(qrFingerprint)}`;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBottomSheet(null)} />
            <div className="bg-white w-full max-w-lg h-full sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-500 relative flex flex-col no-scrollbar overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div
                        key={`receipt-export-${qrFingerprint}`}
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
                                                value={localDiscount}
                                                onChange={(e) => setLocalDiscount(formatN(parseN(e.target.value)))}
                                                onBlur={() => handleDiscountUpdate(bottomSheet.data.id, parseN(localDiscount))}
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
                            {meterImages.length > 0 && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="mb-2 flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-blue-600" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ảnh công tơ đã gửi</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {meterImages.map((item, index) => (
                                            <a
                                                key={`${item.label}-${index}`}
                                                href={item.src}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                                            >
                                                <img
                                                    src={item.src}
                                                    alt={item.label}
                                                    className="aspect-video w-full object-cover"
                                                    onError={() => setFailedMeterImages(prev => ({ ...prev, [item.src]: true }))}
                                                />
                                                <p className="truncate px-2 py-1.5 text-[10px] font-black text-slate-600">{item.label}</p>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                        key={`qr-${qrFingerprint}`}
                                        src={qrSrc}
                                        alt="QR chuyển khoản"
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
