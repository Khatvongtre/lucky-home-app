import React, { useState } from 'react';
import { Loader2, Image as ImageIcon, Trash2, CheckCircle2, X } from 'lucide-react';
import { formatN, parseN } from '../../utils/formatters';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { applyBillAdjustments, getBillAdditionalCost, getBillElectricMeters, getBillWaivedItems } from '../../utils/bills';

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

const getMeterUsage = meter => {
    const usage = Number(meter?.usage);
    if (Number.isFinite(usage)) return usage;

    const oldValue = Number(meter?.old);
    const newValue = Number(meter?.new);
    return Number.isFinite(oldValue) && Number.isFinite(newValue) ? newValue - oldValue : 0;
};

const BillReceipt = ({
    bottomSheet,
    setBottomSheet,
    config,
    API_URL,
    isManagerOrAbove,
    isOwnerOrAdmin,
    isGeneratingImage,
    handleBillUpdate,
    handleShareZaloImage,
    handleDeleteBill,
    handlePayBill
}) => {
    // Local state quản lý riêng input giảm giá khi người dùng đang gõ
    const [discountDraftByBill, setDiscountDraftByBill] = useState({});
    const [additionalCostDraftByBill, setAdditionalCostDraftByBill] = useState({});
    const [waivedItemsDraftByBill, setWaivedItemsDraftByBill] = useState({});
    const [failedMeterImages, setFailedMeterImages] = useState({});
    const billKey = bottomSheet?.data?.id || 'none';
    const localDiscount = discountDraftByBill[billKey] ?? formatN(bottomSheet?.data?.details?.discount || 0);
    const localAdditionalCost = additionalCostDraftByBill[billKey] ?? formatN(getBillAdditionalCost(bottomSheet?.data?.details));
    const localWaivedItems = waivedItemsDraftByBill[billKey] ?? getBillWaivedItems(bottomSheet?.data?.details);
    const swipeBackHandlers = useSwipeBack({
        onBack: () => setBottomSheet(null),
        enabled: Boolean(bottomSheet && bottomSheet.type === 'bill'),
    });
    const setLocalDiscount = (value) => {
        setDiscountDraftByBill(prev => ({ ...prev, [billKey]: value }));
    };
    const setLocalAdditionalCost = (value) => {
        setAdditionalCostDraftByBill(prev => ({ ...prev, [billKey]: value }));
    };


    if (!bottomSheet || bottomSheet.type !== 'bill') return null;

    const bill = bottomSheet.data;
    const details = bill.details || {};
    const savedAdditionalCost = getBillAdditionalCost(details);
    const previewDiscount = parseN(localDiscount);
    const previewAdditionalCost = parseN(localAdditionalCost);
    const previewBill = applyBillAdjustments(bill, {
        discount: previewDiscount,
        additionalCost: previewAdditionalCost,
        waivedItems: localWaivedItems,
    });
    const previewTotal = previewBill.total;
    const isRefund = previewTotal < 0;
    const saveAdjustments = () => handleBillUpdate(bill.id, {
        discount: previewDiscount,
        additionalCost: previewAdditionalCost,
        waivedItems: localWaivedItems,
    });
    const periodMonths = Number(details.periodMonths) || 1;
    const isMultiMonthBill = periodMonths > 1;
    const hasMonthlyFee = Number(details.monthlyFee) > 0;
    const feeItems = hasMonthlyFee ? [] : [
        { key: 'water', label: "Tiền nước", val: details.water },
        { key: 'service', label: "Phí dịch vụ", val: details.service || 0 },
        { key: 'internet', label: "Internet", val: details.internet || 0 },
        { key: 'ebikes', label: "Xe điện", val: details.ebikes || 0 }
    ];
    const isBillPaid = ['paid', 'completed', 'done'].includes(String(bill.status || '').toLowerCase());
    const canEditPendingBill = !isBillPaid;
    const canToggleFee = canEditPendingBill && isManagerOrAbove && !isGeneratingImage;
    const isWaived = key => localWaivedItems.includes(key);
    const electricMeters = getBillElectricMeters(bill);
    const toggleWaivedItem = async key => {
        if (!canToggleFee) return;
        const nextWaivedItems = isWaived(key)
            ? localWaivedItems.filter(item => item !== key)
            : [...localWaivedItems, key];
        setWaivedItemsDraftByBill(prev => ({ ...prev, [billKey]: nextWaivedItems }));
        const didSave = await handleBillUpdate(bill.id, {
            discount: previewDiscount,
            additionalCost: previewAdditionalCost,
            waivedItems: nextWaivedItems,
        });
        if (!didSave) {
            setWaivedItemsDraftByBill(prev => ({ ...prev, [billKey]: localWaivedItems }));
        }
    };
    const feeRowClass = key => `flex w-full justify-between items-center py-2.5 border-b border-dashed border-slate-200 text-left transition-colors ${canToggleFee ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100' : ''} ${isWaived(key) ? 'opacity-60' : ''}`;
    const feeAmount = (key, amount) => (
        <div className="text-right">
            <span className={`text-[13px] font-black text-slate-800 ${isWaived(key) ? 'line-through decoration-2' : ''}`}>{formatN(amount)}</span>
            {isWaived(key) && <p className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-600">Không tính tiền</p>}
        </div>
    );
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
        previewTotal,
        details.discount || 0,
        savedAdditionalCost,
        localWaivedItems.join(',')
    ].join('|');
    const qrSrc = `${API_URL}/vietqr/generate?bankBin=${bankBin}&bankAcc=${bankAcc}&amount=${Math.max(previewTotal, 0)}&addInfo=${encodeURIComponent(qrAddInfo)}&t=${encodeURIComponent(qrFingerprint)}`;

    return (
        <div {...swipeBackHandlers} className="fixed inset-0 z-[600] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBottomSheet(null)} />
            <div className="bg-white w-full max-w-lg h-full sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-500 relative flex flex-col no-scrollbar overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div
                        key={`receipt-export-${bill.id}`}
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
                                {isRefund ? 'Phiếu chi hoàn cọc' : 'Hóa đơn thanh toán'}
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

                            {isMultiMonthBill && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Kỳ hóa đơn</p>
                                        <p className="mt-1 text-[12px] font-black text-indigo-700">{details.periodFrom} - {details.periodTo}</p>
                                    </div>
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-right">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Chu kỳ thanh toán</p>
                                        <p className="mt-1 text-[12px] font-black text-indigo-700">{periodMonths} tháng</p>
                                    </div>
                                </div>
                            )}

                            {/* 2. Chi tiết các khoản phí */}
                            <div className="border border-slate-200 rounded-xl px-3 py-1 bg-white">
                                {canToggleFee && (
                                    <p className="border-b border-dashed border-slate-200 py-2 text-center text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                        Chạm vào khoản phí để bật/tắt tính tiền
                                    </p>
                                )}
                                <button type="button" onClick={() => toggleWaivedItem('rent')} className={feeRowClass('rent')}>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Tiền phòng</span>
                                        {isMultiMonthBill && details.monthlyRent ? (
                                            <p className="text-[9px] text-blue-500 font-semibold leading-tight mt-0.5">
                                                {formatN(details.monthlyRent)} x {periodMonths} tháng = {formatN(details.rent)}
                                            </p>
                                        ) : null}
                                    </div>
                                    {feeAmount('rent', details.rent)}
                                </button>

                                <button type="button" onClick={() => toggleWaivedItem('elec')} className={feeRowClass('elec')}>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Tiền điện riêng</span>
                                        {electricMeters.map((meter, index) => (
                                            <p key={meter.id || meter.name || index} className="text-[9px] text-blue-500 font-semibold leading-tight mt-0.5">
                                                {electricMeters.length > 1 && <span className="font-black">{meter.name || `Công tơ ${index + 1}`}: </span>}
                                                Số: {meter.old} → {meter.new} <span className="text-blue-600">({getMeterUsage(meter)} số)</span>
                                            </p>
                                        ))}
                                    </div>
                                    {feeAmount('elec', details.elec)}
                                </button>

                                {bottomSheet.data.heaterMeter && Number(details.heater) > 0 && (
                                    <button type="button" onClick={() => toggleWaivedItem('heater')} className={feeRowClass('heater')}>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Điện BNL Chung</span>
                                            <p className="text-[9px] text-rose-500 font-semibold leading-tight mt-0.5">
                                                Số: {bottomSheet.data.heaterMeter.old} → {bottomSheet.data.heaterMeter.new} <span className="text-rose-600">({bottomSheet.data.heaterMeter.new - bottomSheet.data.heaterMeter.old} số)</span>
                                            </p>
                                        </div>
                                        {feeAmount('heater', details.heater)}
                                    </button>
                                )}

                                {feeItems.map(item => (
                                    <button type="button" onClick={() => toggleWaivedItem(item.key)} key={item.key} className={`${feeRowClass(item.key)} last:border-0`}>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                                        {feeAmount(item.key, item.val)}
                                    </button>
                                ))}

                                {hasMonthlyFee && (
                                    <button type="button" onClick={() => toggleWaivedItem('monthlyFee')} className={`${feeRowClass('monthlyFee')} last:border-0`}>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Phí DV Hàng tháng (MBKD)</span>
                                        {feeAmount('monthlyFee', details.monthlyFee)}
                                    </button>
                                )}

                                {(!isGeneratingImage || previewAdditionalCost > 0) && <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
                                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-tight">Chi phí phát sinh</span>
                                    {canEditPendingBill && isManagerOrAbove && !isGeneratingImage ? (
                                        <div className="flex items-center space-x-1 border-b border-dashed border-amber-200 pb-0.5">
                                            <span className="text-amber-600 font-bold">+</span>
                                            <input
                                                type="text"
                                                value={localAdditionalCost}
                                                onChange={(e) => setLocalAdditionalCost(formatN(parseN(e.target.value)))}
                                                onBlur={saveAdjustments}
                                                className="w-24 sm:w-28 text-right bg-transparent text-amber-700 font-black outline-none text-[13px] tabular-nums"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-[13px] font-black text-amber-700">+{formatN(savedAdditionalCost)}</span>
                                    )}
                                </div>}
                                {(!isGeneratingImage || previewDiscount > 0) && <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
                                    <span className="text-[11px] font-bold text-red-500 uppercase tracking-tight">Giảm giá</span>
                                    {canEditPendingBill && isManagerOrAbove && !isGeneratingImage ? (
                                        <div className="flex items-center space-x-1 border-b border-dashed border-red-200 pb-0.5">
                                            <span className="text-red-500 font-bold">-</span>
                                            <input
                                                type="text"
                                                value={localDiscount}
                                                onChange={(e) => setLocalDiscount(formatN(parseN(e.target.value)))}
                                                onBlur={saveAdjustments}
                                                className="w-24 sm:w-28 text-right bg-transparent text-red-600 font-black outline-none text-[13px] tabular-nums"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-[13px] font-black text-red-600">-{formatN(details.discount || 0)}</span>
                                    )}
                                </div>}
                                <div className={`${isRefund ? 'bg-rose-600' : 'bg-indigo-600'} p-3 rounded-lg text-white mb-2 mt-2 shadow-sm flex items-center justify-between`}>
                                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">
                                        {isRefund ? 'Cần trả lại khách' : 'Tổng thanh toán'}
                                    </p>
                                    <p className="text-xl font-black leading-none tabular-nums">
                                        {formatN(isRefund ? Math.abs(previewTotal) : previewTotal)}
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

                            {!isRefund && <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-stretch gap-3">
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
                            </div>}
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
                        {isGeneratingImage ? 'ĐANG TẠO ẢNH...' : 'CHIA SẺ ZALO'}
                    </button>

                    {isOwnerOrAdmin && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleDeleteBill(bottomSheet.data.id)}
                                className={`bg-red-500 text-white py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 border-b-2 border-red-700 flex items-center justify-center gap-1.5 transition-all shadow-sm ${canEditPendingBill ? 'w-1/3' : 'w-full'}`}
                            >
                                <Trash2 className="w-4 h-4" /> Xóa
                            </button>

                            {canEditPendingBill && (
                                <button
                                    onClick={async () => {
                                        const didSave = await saveAdjustments();
                                        if (!didSave) return;
                                        await handlePayBill(bottomSheet.data.id);
                                    }}
                                    className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase active:scale-95 border-b-2 border-emerald-800 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> {isRefund ? 'Xác nhận phiếu chi' : 'Xác nhận đã thu'}
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
