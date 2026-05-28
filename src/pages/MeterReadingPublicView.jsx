import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Flashlight,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Send,
  Upload,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { formatN, parseN } from '../utils/formatters';
import { authStorage } from '../services/authStorage';
import { fetchFromApi, getApiBaseUrl } from '../services/apiServer';

const getRoomTokenFromPath = () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const index = parts.indexOf('meter-reading');
  return index >= 0 ? decodeURIComponent(parts[index + 1] || '') : '';
};

const currentPeriod = () => {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
};

const looksLikeTechnicalId = (value = '') =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  || /^[0-9a-f]{24}$/i.test(value)
  || value.length > 18;

const isPaidStatus = (status) => ['paid', 'completed', 'done'].includes(String(status || '').toLowerCase());

const getFriendlyRoomCode = (room = {}) => {
  const roomCode = room.roomCode || room.code || room.name || '';
  return roomCode && !looksLikeTechnicalId(String(roomCode)) ? roomCode : '';
};

const normalizeSession = (data, roomToken) => {
  if (!data) throw new Error('Không có dữ liệu phiên ghi điện.');

  const source = data;
  const room = source.room || {};
  const friendlyRoomCode = getFriendlyRoomCode({
    roomCode: room.roomCode || source.roomCode,
    code: room.code || source.code,
    name: room.name || source.roomName,
  });

  return {
    room: {
      id: room.id || source.roomId || roomToken,
      roomCode: friendlyRoomCode,
      houseName: room.houseName || source.houseName || 'Lucky Home',
      tenantName: room.tenantName || source.tenantName || '',
    },
    houseId: source.houseId || room.houseId || source.house?.id || '',
    period: source.period || currentPeriod(),
    priceElec: source.priceElec || source.config?.priceElec || 3500,
    config: source.config || {},
    status: source.status || 'open',
    meters: (source.meters || []).map((meter, index) => ({
      id: meter.id || meter.meterId || `meter-${index}`,
      name: meter.name || (meter.type === 'heater' ? 'Công tơ bình nóng lạnh' : 'Công tơ phòng'),
      type: meter.type || 'electric',
      oldVal: meter.oldVal ?? meter.old ?? 0,
      newVal: meter.newVal ?? meter.new ?? '',
      confidence: meter.confidence ?? null,
      imageDataUrl: meter.imageDataUrl || meter.imageUrl || '',
      imageUrl: meter.imageUrl || '',
      hasFreshImage: false,
      warnings: meter.warnings || [],
    })),
    invoice: normalizeBill(source.invoice),
  };
};

const requestPublicJson = async (url, options = {}) => {
  const token = authStorage.getToken();
  const res = await fetchFromApi(url, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const text = await res.text();
  const result = text ? JSON.parse(text) : null;
  if (res.status === 404) throw new Error('Link không hợp lệ hoặc đã bị reset.');
  if (res.status === 410) throw new Error('Link đã hết hạn, vui lòng liên hệ chủ nhà.');
  if (res.status === 409) throw new Error('Hóa đơn kỳ này đã thanh toán, không thể cập nhật chỉ số.');
  if (!res.ok) throw new Error(result?.message || `Lỗi máy chủ (${res.status})`);
  return result;
};

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeBill = (bill) => {
  if (!bill) return null;

  return {
    ...bill,
    roomId: bill.roomId || bill.roomCode,
    currentMonthFull: bill.currentMonthFull || bill.period,
    details: parseJsonField(bill.detailsJson, bill.details || {}),
    meter: parseJsonField(bill.meterInfoJson, bill.meter || {}),
    heaterMeter: bill.heaterInfoJson ? parseJsonField(bill.heaterInfoJson, bill.heaterMeter || null) : (bill.heaterMeter || null),
  };
};

const extractBillFromResponse = (result) => {
  const directBill = result?.bill
    || result?.invoice
    || result?.data?.bill
    || result?.data?.invoice
    || result?.generatedBill
    || result?.createdBill
    || result?.billData;
  if (directBill) return normalizeBill(directBill);

  return null;
};

const compressImageFile = (file, { maxSize = 1400, quality = 0.82 } = {}) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Ảnh không hợp lệ.'));
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(Math.round(image.width * scale), 1);
      canvas.height = Math.max(Math.round(image.height * scale), 1);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const buildReceiptModel = (session, invoice) => {
  const invoiceDetails = !Array.isArray(invoice?.details) && typeof invoice?.details === 'object' ? invoice.details : {};

  return {
    id: invoice.id || `public-${session.room.id}-${session.period}`,
    roomId: session.room.roomCode || invoice.roomCode || '...',
    currentMonthFull: invoice.period || session.period,
    total: invoice.total || 0,
    status: invoice.status || 'pending',
    meter: invoice.meter || {},
    heaterMeter: invoice.heaterMeter || null,
    details: {
      rent: invoiceDetails.rent || 0,
      elec: invoiceDetails.elec || 0,
      heater: invoiceDetails.heater || 0,
      water: invoiceDetails.water || 0,
      service: invoiceDetails.service || 0,
      internet: invoiceDetails.internet || 0,
      ebikes: invoiceDetails.ebikes || 0,
      monthlyFee: invoiceDetails.monthlyFee || 0,
      discount: invoiceDetails.discount || 0,
    },
  };
};

const PublicInvoiceReceipt = ({
  session,
  invoice,
  isPaymentNotifying = false,
  paymentNoticeMessage = '',
  isTransferOpen = false,
  transferCopyMessage = '',
  onTransferClick,
  onTransferClose,
  onCopyTransfer,
  onDownloadQr,
  onPaymentNotice,
}) => {
  const API_URL = getApiBaseUrl();
  const bill = buildReceiptModel(session, invoice);
  const config = session.config || {};
  const bankBin = config.bankBin || '970422';
  const bankAcc = config.bankAcc || '0';
  const bankName = config.bankName || 'MB BANK';
  const qrAddInfo = `P${bill.roomId} ${bill.currentMonthFull}`;
  const qrFingerprint = [
    API_URL,
    bankBin,
    bankAcc,
    bill.id,
    bill.roomId,
    bill.currentMonthFull,
    bill.total,
    bill.details.discount || 0,
  ].join('|');
  const qrSrc = `${API_URL}/vietqr/generate?bankBin=${bankBin}&bankAcc=${bankAcc}&amount=${bill.total}&addInfo=${encodeURIComponent(qrAddInfo)}&t=${encodeURIComponent(qrFingerprint)}`;

  return (
    <div
      className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div className="p-4 space-y-3">
        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-[9px] font-bold text-blue-500 uppercase mb-0.5 tracking-widest">Phòng</p>
            <p className="text-xl font-black text-blue-700 leading-none">{bill.roomId}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-blue-500 uppercase mb-0.5 tracking-widest">Kỳ thanh toán</p>
            <p className="text-base font-black text-blue-700 leading-none">{bill.currentMonthFull}</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl px-3 py-1 bg-white">
          <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Tiền phòng</span>
            <span className="text-[13px] font-black text-slate-800">{formatN(bill.details.rent)}</span>
          </div>

          <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Tiền điện riêng</span>
              <p className="text-[9px] text-blue-500 font-semibold leading-tight mt-0.5">
                Số: {bill.meter?.old} → {bill.meter?.new} <span className="text-blue-600">({bill.meter?.usage} số)</span>
              </p>
            </div>
            <span className="text-[13px] font-black text-slate-800">{formatN(bill.details.elec)}</span>
          </div>

          {bill.heaterMeter && (
            <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Điện BNL Chung</span>
                <p className="text-[9px] text-rose-500 font-semibold leading-tight mt-0.5">
                  Số: {bill.heaterMeter.old} → {bill.heaterMeter.new} <span className="text-rose-600">({bill.heaterMeter.usage} số)</span>
                </p>
              </div>
              <span className="text-[13px] font-black text-slate-800">{formatN(bill.details.heater)}</span>
            </div>
          )}

          {[
            { label: 'Tiền nước', val: bill.details.water },
            { label: 'Phí dịch vụ', val: bill.details.service || 0 },
            { label: 'Internet', val: bill.details.internet || 0 },
            { label: 'Xe điện', val: bill.details.ebikes || 0 },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
              <span className="text-[13px] font-black text-slate-800">{formatN(item.val)}</span>
            </div>
          ))}

          {bill.details.monthlyFee > 0 && (
            <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Phí DV Hàng tháng (MBKD)</span>
              <span className="text-[13px] font-black text-slate-800">{formatN(bill.details.monthlyFee)}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 last:border-0">
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-tight">Giảm giá</span>
            <span className="text-[13px] font-black text-red-600">-{formatN(bill.details.discount || 0)}</span>
          </div>

          <div className="bg-indigo-600 p-3 rounded-lg text-white mb-2 mt-2 shadow-sm flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">
              Tổng thanh toán
            </p>
            <p className="text-xl font-black leading-none tabular-nums">
              {formatN(bill.total)}
              <span className="text-[11px] opacity-80 font-bold ml-1">đ</span>
            </p>
          </div>
        </div>

        <div id="public-invoice-transfer" className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-stretch gap-3">
          <div className="flex-1 flex flex-col justify-between">
            <div className="px-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Thông tin chuyển khoản</p>
              <p className="text-[15px] font-black text-purple-700 uppercase leading-tight truncate mt-5">{config.bankName || 'MB BANK'}</p>
              <p className="text-[20px] font-black text-blue-600 tracking-tighter leading-tight mt-1">{config.bankAcc || '0000'}</p>
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

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onTransferClick}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95"
          >
            <WalletCards className="h-4 w-4" />
            Chuyển khoản
          </button>
          <button
            type="button"
            onClick={onPaymentNotice}
            disabled={isPaymentNotifying || ['paid', 'completed', 'done'].includes(String(bill.status || '').toLowerCase())}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95 disabled:bg-slate-300"
          >
            {isPaymentNotifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Đã thanh toán
          </button>
        </div>

        {paymentNoticeMessage ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] font-bold text-emerald-700">
            {paymentNoticeMessage}
          </p>
        ) : null}
      </div>

      {isTransferOpen ? (
        <div className="fixed inset-0 z-[900] flex items-end justify-center bg-slate-950/55 px-4 pb-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Chuyển khoản</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Quét QR thanh toán</h2>
              </div>
              <button
                type="button"
                onClick={onTransferClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <img
                  src={qrSrc}
                  alt="QR chuyển khoản"
                  className="h-full w-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>

              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400">Ngân hàng</span>
                  <span className="max-w-[190px] truncate text-sm font-black uppercase text-purple-700">{bankName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400">STK</span>
                  <span className="text-sm font-black text-blue-700">{bankAcc}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400">Số tiền</span>
                  <span className="text-sm font-black text-emerald-700">{formatN(bill.total)} đ</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400">Nội dung</span>
                  <span className="text-sm font-black text-slate-900">{qrAddInfo}</span>
                </div>
              </div>

              {transferCopyMessage ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] font-bold text-emerald-700">
                  {transferCopyMessage}
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onCopyTransfer?.('stk', bankAcc)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[10px] font-black uppercase text-slate-700 active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" />
                  STK
                </button>
                <button
                  type="button"
                  onClick={() => onCopyTransfer?.('amount', String(bill.total))}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[10px] font-black uppercase text-slate-700 active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Số tiền
                </button>
                <button
                  type="button"
                  onClick={() => onCopyTransfer?.('content', qrAddInfo)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[10px] font-black uppercase text-slate-700 active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Nội dung
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onCopyTransfer?.('all', { bankName, bankAcc, amount: bill.total, addInfo: qrAddInfo })}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95"
                >
                  <Copy className="h-4 w-4" />
                  Copy tất cả
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadQr?.({ qrSrc, roomId: bill.roomId, period: bill.currentMonthFull })}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  Lưu QR
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pb-3 text-center mt-1">
        <p className="text-[10px] text-slate-400 font-semibold italic">Cảm ơn quý khách đã tin tưởng Lucky Home!</p>
      </div>
    </div>
  );
};

const MeterReadingPublicView = () => {
  const roomToken = useMemo(getRoomTokenFromPath, []);
  const [session, setSession] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isCorrectionSubmitting, setIsCorrectionSubmitting] = useState(false);
  const [isPaymentNotifying, setIsPaymentNotifying] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [correctionImageDataUrl, setCorrectionImageDataUrl] = useState('');
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [paymentNoticeMessage, setPaymentNoticeMessage] = useState('');
  const [transferCopyMessage, setTransferCopyMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const cameraFileRef = useRef(null);
  const fileRef = useRef(null);
  const correctionFileRef = useRef(null);

  const activeMeter = session?.meters?.[activeIndex];
  const completedCount = session?.meters?.filter(meter => meter.hasFreshImage && meter.newVal !== '' && meter.newVal !== null).length || 0;
  const allDone = session?.meters?.length > 0 && completedCount === session.meters.length;
  const invoicePreview = session?.invoice || null;
  const roomDisplayName = session?.room?.roomCode ? `P.${session.room.roomCode}` : 'Phòng cần ghi điện';
  const currentDone = Boolean(activeMeter?.hasFreshImage && activeMeter?.newVal !== '' && activeMeter?.newVal !== null);
  const activeUsage = activeMeter
    ? Math.max(parseN(String(activeMeter.newVal || 0)) - parseN(String(activeMeter.oldVal || 0)), 0)
    : 0;
  const isSubmitted = session?.status === 'submitted';
  const statusLabel = invoicePreview || isSubmitted ? 'Đã gửi' : 'Đang ghi';
  const statusPill = invoicePreview || isSubmitted ? 'Hoàn tất' : 'Chưa hoàn tất';

  const isInvoicePaid = isPaidStatus(invoicePreview?.status);

  const handleTransferClick = useCallback(() => {
    setTransferCopyMessage('');
    setIsTransferOpen(true);
  }, []);

  const handleCopyTransfer = useCallback(async (type, value) => {
    const copyConfig = {
      stk: { text: String(value || ''), message: 'Đã copy số tài khoản.' },
      amount: { text: String(value || ''), message: 'Đã copy số tiền.' },
      content: { text: String(value || ''), message: 'Đã copy nội dung chuyển khoản.' },
      all: {
        text: `Ngan hang: ${value?.bankName || ''}\nSTK: ${value?.bankAcc || ''}\nSo tien: ${formatN(value?.amount || 0)} d\nNoi dung: ${value?.addInfo || ''}`,
        message: 'Đã copy đầy đủ thông tin chuyển khoản.',
      },
    };
    const selected = copyConfig[type] || copyConfig.all;

    try {
      await navigator.clipboard.writeText(selected.text);
      setTransferCopyMessage(selected.message);
    } catch {
      setTransferCopyMessage('Không copy tự động được. Vui lòng copy thủ công thông tin bên trên.');
    }
  }, []);

  const handleDownloadQr = useCallback(async ({ qrSrc, roomId, period }) => {
    try {
      const response = await fetch(qrSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR-P${roomId}-${String(period || '').replace('/', '-')}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setTransferCopyMessage('Đã lưu ảnh QR.');
    } catch {
      setTransferCopyMessage('Không lưu được QR. Bạn có thể chụp màn hình QR để thanh toán.');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await requestPublicJson(`/meter-reading/session/${encodeURIComponent(roomToken)}`);
        if (isMounted) setSession(normalizeSession(data, roomToken));
      } catch (loadError) {
        if (isMounted) {
          setSession(null);
          setError(loadError.message || 'Không tải được thông tin ghi điện.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSession();
    return () => {
      isMounted = false;
    };
  }, [roomToken]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => () => {
    stream?.getTracks().forEach(track => track.stop());
  }, [stream]);

  const updateMeter = useCallback((meterId, patch) => {
    setSession(prev => ({
      ...prev,
      meters: prev.meters.map(meter => (meter.id === meterId ? { ...meter, ...patch } : meter)),
    }));
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraOn(true);
    } catch {
      setCameraError('Không mở được camera. Bạn có thể chọn ảnh từ thư viện.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCameraOn(false);
    setTorchOn(false);
  }, [stream]);

  const openImagePicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const processMeterImage = useCallback(async (meter, imageDataUrl) => {
    if (!meter || !imageDataUrl) return;

    setError('');
    updateMeter(meter.id, {
      imageDataUrl,
      imageUrl: '',
      hasFreshImage: true,
      warnings: [],
      confidence: null,
      newVal: meter.newVal || '',
    });

    try {
      const result = await requestPublicJson(
        `/meter-reading/session/${encodeURIComponent(roomToken)}/meters/${encodeURIComponent(meter.id)}/ocr`,
        {
          method: 'POST',
          body: JSON.stringify({ imageDataUrl }),
        },
      );
      updateMeter(meter.id, {
        newVal: result.detectedValue ?? meter.newVal,
        confidence: result.confidence ?? 0.8,
        imageUrl: result.imageUrl || '',
        warnings: result.warnings || [],
      });
    } catch (ocrError) {
      updateMeter(meter.id, { confidence: 0 });
      setError(ocrError.message || 'Không nhận diện được chỉ số. Vui lòng nhập tay.');
    }
  }, [roomToken, updateMeter]);

  const toggleTorch = useCallback(async () => {
    const track = stream?.getVideoTracks?.()[0];
    const capabilities = track?.getCapabilities?.();
    if (!track || !capabilities?.torch) return;

    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(prev => !prev);
    } catch {
      setCameraError('Thiết bị này không hỗ trợ bật đèn flash trong trình duyệt.');
    }
  }, [stream, torchOn]);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !overlayRef.current || !activeMeter) return;

    const video = videoRef.current;
    const frame = overlayRef.current.getBoundingClientRect();
    const videoBox = video.getBoundingClientRect();
    const scaleX = video.videoWidth / videoBox.width;
    const scaleY = video.videoHeight / videoBox.height;
    const sx = Math.max((frame.left - videoBox.left) * scaleX, 0);
    const sy = Math.max((frame.top - videoBox.top) * scaleY, 0);
    const sw = Math.min(frame.width * scaleX, video.videoWidth - sx);
    const sh = Math.min(frame.height * scaleY, video.videoHeight - sy);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(Math.round(sw), 1);
    canvas.height = Math.max(Math.round(sh), 1);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.88);

    stopCamera();
    await processMeterImage(activeMeter, imageDataUrl);
  }, [activeMeter, processMeterImage, stopCamera]);

  const handleFilePicked = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeMeter) return;

    try {
      const imageDataUrl = await compressImageFile(file);
      stopCamera();
      await processMeterImage(activeMeter, imageDataUrl);
    } catch (imageError) {
      setError(imageError.message || 'Không xử lý được ảnh.');
    }
    event.target.value = '';
  }, [activeMeter, processMeterImage, stopCamera]);

  const handleCorrectionImagePicked = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageDataUrl = await compressImageFile(file, { maxSize: 1200, quality: 0.78 });
      setCorrectionImageDataUrl(imageDataUrl);
    } catch (imageError) {
      setError(imageError.message || 'Không xử lý được ảnh.');
    }
    event.target.value = '';
  }, []);

  const runOcr = useCallback(async () => {
    if (!activeMeter?.imageDataUrl) return;

    try {
      updateMeter(activeMeter.id, { confidence: null });
      const result = await requestPublicJson(
        `/meter-reading/session/${encodeURIComponent(roomToken)}/meters/${encodeURIComponent(activeMeter.id)}/ocr`,
        {
          method: 'POST',
          body: JSON.stringify({ imageDataUrl: activeMeter.imageDataUrl }),
        },
      );
      updateMeter(activeMeter.id, {
        newVal: result.detectedValue ?? activeMeter.newVal,
        confidence: result.confidence ?? 0.8,
        imageUrl: result.imageUrl || activeMeter.imageUrl || '',
        warnings: result.warnings || [],
      });
    } catch (ocrError) {
      updateMeter(activeMeter.id, { confidence: 0 });
      setError(ocrError.message || 'Không nhận diện được chỉ số. Vui lòng nhập tay.');
    }
  }, [activeMeter, roomToken, updateMeter]);

  const submitReading = useCallback(async () => {
    if (!session || !allDone) return;

    if (isInvoicePaid) {
      setIsConfirmOpen(false);
      setError('Hóa đơn kỳ này đã được thanh toán, không thể cập nhật chỉ số trong kỳ này nữa.');
      return;
    }

    const missingImageMeter = session.meters.find(meter => !meter.hasFreshImage);
    if (missingImageMeter) {
      setError(`${missingImageMeter.name}: vui lòng chụp hoặc chọn ảnh công tơ mới trước khi gửi.`);
      return;
    }

    const invalidMeter = session.meters.find(meter => parseN(String(meter.newVal)) < parseN(String(meter.oldVal)));
    if (invalidMeter) {
      setError(`${invalidMeter.name}: chỉ số mới đang nhỏ hơn chỉ số cũ.`);
      return;
    }

    try {
      setError('');
      setIsConfirmOpen(false);
      setIsSubmitting(true);
      const payload = {
        roomId: session.room.id,
        roomCode: session.room.roomCode,
        period: session.period,
        meters: session.meters.map(meter => ({
          id: meter.id,
          name: meter.name,
          type: meter.type,
          oldVal: parseN(String(meter.oldVal || 0)),
          newVal: parseN(String(meter.newVal || 0)),
          confidence: meter.confidence,
          imageUrl: meter.imageUrl || '',
          imageDataUrl: meter.imageUrl ? undefined : meter.imageDataUrl,
        })),
      };
      const result = await requestPublicJson(`/meter-reading/session/${encodeURIComponent(roomToken)}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const refreshed = await requestPublicJson(`/meter-reading/session/${encodeURIComponent(roomToken)}?t=${Date.now()}`);
      const refreshedSession = normalizeSession(refreshed, roomToken);
      const returnedBill = refreshedSession.invoice || extractBillFromResponse(result);
      if (!returnedBill) {
        throw new Error('Đã lưu chỉ số nhưng chưa nhận được hóa đơn từ máy chủ.');
      }

      setSession({ ...refreshedSession, invoice: returnedBill, status: 'submitted' });
    } catch (submitError) {
      setError(submitError.message || 'Không lấy được hóa đơn. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }, [allDone, isInvoicePaid, roomToken, session]);

  const submitCorrectionRequest = useCallback(async () => {
    if (!session || !invoicePreview || isInvoicePaid) return;

    const cleanNote = correctionNote.trim();
    if (cleanNote.length < 10) {
      setError('Vui lòng nhập lý do cần sửa chỉ số rõ hơn.');
      return;
    }

    try {
      setError('');
      setIsCorrectionSubmitting(true);
      await requestPublicJson(`/meter-reading/session/${encodeURIComponent(roomToken)}/correction-request`, {
        method: 'POST',
        body: JSON.stringify({
          billId: invoicePreview.id,
          roomId: session.room.id,
          roomCode: session.room.roomCode,
          period: session.period,
          note: cleanNote,
          imageDataUrl: correctionImageDataUrl || undefined,
        }),
      });

      setCorrectionMessage('Đã gửi yêu cầu kiểm tra lại chỉ số. Chủ nhà sẽ xử lý và phản hồi sau.');
      setCorrectionNote('');
      setCorrectionImageDataUrl('');
      setIsCorrectionOpen(false);
    } catch (correctionError) {
      setError(correctionError.message || 'Không gửi được yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsCorrectionSubmitting(false);
    }
  }, [correctionImageDataUrl, correctionNote, invoicePreview, isInvoicePaid, roomToken, session]);

  const notifyPaymentCompleted = useCallback(async () => {
    if (!session || !invoicePreview || isInvoicePaid) return;

    try {
      setError('');
      setPaymentNoticeMessage('');
      setIsPaymentNotifying(true);
      await requestPublicJson(`/meter-reading/session/${encodeURIComponent(roomToken)}/payment-confirmation`, {
        method: 'POST',
        body: JSON.stringify({
          billId: invoicePreview.id,
          houseId: session.houseId,
          roomId: session.room.id,
          roomCode: session.room.roomCode,
          period: invoicePreview.currentMonthFull || invoicePreview.period || session.period,
          total: invoicePreview.total || 0,
        }),
      });
      setPaymentNoticeMessage('Đã báo chủ nhà kiểm tra thanh toán. Cảm ơn bạn!');
    } catch (paymentError) {
      setError(paymentError.message || 'Không gửi được thông báo thanh toán. Vui lòng thử lại.');
    } finally {
      setIsPaymentNotifying(false);
    }
  }, [invoicePreview, isInvoicePaid, roomToken, session]);

  const moveNext = () => setActiveIndex(index => Math.min(index + 1, (session?.meters?.length || 1) - 1));

  const handlePrimaryAction = () => {
    if (isInvoicePaid) {
      setError('Hóa đơn kỳ này đã được thanh toán, không thể cập nhật chỉ số trong kỳ này nữa.');
      return;
    }
    if (isSubmitted) return;
    if (allDone) {
      setIsConfirmOpen(true);
      return;
    }
    if (currentDone) moveNext();
  };

  const primaryLabel = (() => {
    if (isSubmitting) return 'Đang gửi chỉ số';
    if (allDone) return 'Kiểm tra lại và gửi';
    if (currentDone) return activeIndex === session?.meters?.length - 1 ? 'Sẵn sàng gửi chỉ số' : 'Tiếp tục công tơ kế tiếp';
    return 'Nhập chỉ số mới để tiếp tục';
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Đang tải thông tin ghi điện</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-5">
        <div className="w-full max-w-sm rounded-xl border border-red-100 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-black text-slate-950">Không tải được thông tin ghi điện</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            {error || 'Link không hợp lệ, đã hết hạn hoặc máy chủ chưa trả dữ liệu.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-xs font-black uppercase text-white active:scale-95"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900">
      <style>{`
        button, input, textarea { -webkit-tap-highlight-color: transparent; }
        button { -webkit-appearance: none; appearance: none; }
      `}</style>
      <div className="mx-auto flex h-screen w-full max-w-lg flex-col overflow-hidden bg-[#f6f8fb] shadow-2xl">
        <header className="relative z-30 shrink-0 bg-[#f6f8fb] px-4 pt-3 pb-1.5">
          <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-blue-800 via-blue-600 to-sky-400 px-4 py-4 text-white shadow-xl shadow-blue-900/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.24),transparent_26%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.28),transparent_30%)]" />
            <div className="relative flex min-h-[76px] items-center">
              <div className="min-w-0 flex-1 text-center">
                {session.room.houseName ? (
                  <p className="truncate text-[10px] font-black uppercase tracking-widest text-blue-100">
                    {session.room.houseName}
                  </p>
                ) : null}
                <h1 className="mt-1 truncate text-[28px] font-black leading-none tracking-tight text-white drop-shadow-sm">
                  {roomDisplayName}
                </h1>
                {session.room.tenantName ? (
                  <p className="mt-2 truncate text-xs font-semibold text-blue-100/90">
                    {session.room.tenantName}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-blue-700 shadow-sm ring-1 ring-white/70">
                    {session.period}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${invoicePreview || isSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {statusLabel} - {statusPill}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-32 pt-1.5 space-y-2 no-scrollbar">
          {!invoicePreview && (
            <section className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                  {completedCount}/{session.meters.length}
                </div>
                {session.meters.map((meter, index) => {
                  const done = meter.hasFreshImage && meter.newVal !== '' && meter.newVal !== null;
                  const selected = index === activeIndex;

                  return (
                    <button
                      key={meter.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-all ${selected ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-100' : 'border-slate-100 bg-slate-50/70 hover:bg-white'
                        }`}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : selected ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                      </div>
                      <span className={`max-w-[136px] truncate text-xs font-black ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                        {meter.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {!invoicePreview && activeMeter ? (
            <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Bước {activeIndex + 1} / {session.meters.length}</p>
                    <h2 className="mt-0.5 truncate text-sm font-black text-slate-950">{activeMeter.name}</h2>
                  </div>
                  <div className="w-[112px] shrink-0 rounded-lg bg-white px-2 py-1.5 text-right shadow-sm ring-1 ring-blue-100">
                    <p className="text-[8px] font-black uppercase tracking-wider text-blue-400">Tiêu thụ</p>
                    <p className="text-base font-black leading-tight text-blue-700">{formatN(activeUsage)}</p>
                  </div>
                </div>

                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Chỉ số cũ</p>
                    <p className="text-sm font-black text-slate-700">{formatN(activeMeter.oldVal)}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-white px-2 py-1 shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-widest text-blue-500">Chỉ số mới</p>
                    <p className="text-sm font-black text-blue-700">{activeMeter.newVal ? formatN(activeMeter.newVal) : '...'}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <div className="overflow-hidden rounded-xl border-2 border-blue-200 bg-slate-950 shadow-lg shadow-blue-100">
                  {isCameraOn ? (
                    <div className="relative aspect-video">
                      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/35" />
                      <div
                        ref={overlayRef}
                        className="absolute left-1/2 top-1/2 h-16 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white shadow-[0_0_0_999px_rgba(2,6,23,0.58)]"
                      >
                        <div className="absolute -top-7 left-0 right-0 text-center text-[10px] font-black uppercase tracking-wider text-white">
                          Căn dãy số vào khung
                        </div>
                        <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-semibold text-white/90">
                          Chụp rõ vùng số, tránh lóa sáng
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
                        <button type="button" onClick={toggleTorch} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                          <Flashlight className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={captureFrame} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-xl">
                          <Camera className="h-6 w-6" />
                        </button>
                        <button type="button" onClick={stopCamera} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : activeMeter.imageDataUrl ? (
                    <button
                      type="button"
                      onClick={openImagePicker}
                      className="relative block w-full bg-white text-left transition active:scale-[0.99]"
                      aria-label="Đổi ảnh chỉ số công tơ"
                    >
                      <img src={activeMeter.imageDataUrl} alt="Ảnh chỉ số công tơ" className="aspect-video w-full object-cover" />
                      <div className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase text-white">
                        Đã có ảnh
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openImagePicker}
                      className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300 transition active:scale-[0.99]"
                      aria-label="Chụp hoặc chọn ảnh chỉ số công tơ"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/25">
                        <Camera className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-white">Chụp vùng chỉ số công tơ</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Canh rõ dãy số trong khung.</p>
                      </div>
                    </button>
                  )}
                </div>

                {cameraError ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs font-semibold">{cameraError}</p>
                  </div>
                ) : null}

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={startCamera} className="flex min-w-0 appearance-none items-center justify-center gap-1 rounded-xl bg-blue-600 px-1.5 py-3 text-[10px] font-black uppercase leading-none text-white shadow-sm active:scale-95 whitespace-nowrap [-webkit-tap-highlight-color:transparent]">
                    <Camera className="h-4 w-4" /> Canh dòng
                  </button>
                  <button type="button" onClick={() => cameraFileRef.current?.click()} className="flex min-w-0 appearance-none items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-1.5 py-3 text-[10px] font-black uppercase leading-none text-blue-700 active:scale-95 whitespace-nowrap [-webkit-tap-highlight-color:transparent]">
                    <Camera className="h-4 w-4" /> Chụp ảnh
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex min-w-0 appearance-none items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-3 text-[10px] font-black uppercase leading-none text-slate-700 active:scale-95 whitespace-nowrap [-webkit-tap-highlight-color:transparent]">
                    <ImageIcon className="h-4 w-4" /> Chọn ảnh
                  </button>
                </div>
                <input ref={cameraFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFilePicked} />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFilePicked} />

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Xác nhận chỉ số mới</label>
                    <button type="button" onClick={runOcr} disabled={!activeMeter.imageDataUrl} className="text-[10px] font-black uppercase text-blue-700 disabled:text-slate-300">
                      Nhận diện lại
                    </button>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={activeMeter.newVal}
                    onChange={event => updateMeter(activeMeter.id, { newVal: event.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl font-black text-slate-950 outline-none transition-all focus:border-blue-500 focus:bg-white"
                    placeholder="Nhập số"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-500">
                      OCR: {activeMeter.confidence === null ? 'đang xử lý' : activeMeter.confidence ? `${Math.round(activeMeter.confidence * 100)}%` : 'chưa có'}
                    </span>
                    <span className={`font-black ${parseN(String(activeMeter.newVal || 0)) < parseN(String(activeMeter.oldVal || 0)) ? 'text-red-600' : 'text-emerald-600'}`}>
                      {currentDone ? `${formatN(activeUsage)} kWh` : 'Chưa nhập'}
                    </span>
                  </div>
                  {activeMeter.warnings?.length > 0 && (
                    <div className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3">
                      {activeMeter.warnings.map((warning, index) => (
                        <p key={`${warning}-${index}`} className="text-[11px] font-semibold text-amber-800">
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {invoicePreview ? (
            <PublicInvoiceReceipt
              session={session}
              invoice={invoicePreview}
              isPaymentNotifying={isPaymentNotifying}
              paymentNoticeMessage={paymentNoticeMessage}
              isTransferOpen={isTransferOpen}
              transferCopyMessage={transferCopyMessage}
              onTransferClick={handleTransferClick}
              onTransferClose={() => setIsTransferOpen(false)}
              onCopyTransfer={handleCopyTransfer}
              onDownloadQr={handleDownloadQr}
              onPaymentNotice={notifyPaymentCompleted}
            />
          ) : null}

          {invoicePreview ? (
            <section className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Cần kiểm tra lại?</p>
                  <h2 className="mt-0.5 text-sm font-black text-slate-950">Báo sai chỉ số công tơ</h2>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    Gửi ghi chú để chủ nhà đối soát trước khi điều chỉnh hóa đơn.
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
              </div>
              {isInvoicePaid ? (
                <p className="mt-3 rounded-xl bg-white p-3 text-xs font-bold leading-relaxed text-slate-600 ring-1 ring-slate-100">
                  Hóa đơn đã thanh toán. Vui lòng liên hệ chủ nhà để được hỗ trợ điều chỉnh thủ công.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setCorrectionMessage('');
                    setIsCorrectionOpen(true);
                  }}
                  className="mt-3 w-full rounded-xl bg-amber-600 py-3 text-xs font-black uppercase text-white shadow-sm active:scale-95"
                >
                  Báo sai chỉ số
                </button>
              )}
            </section>
          ) : null}

          {correctionMessage ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Đã gửi yêu cầu</p>
                <p className="mt-0.5 text-xs font-bold leading-relaxed text-emerald-800">
                  {correctionMessage}
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/80 p-3 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 ring-1 ring-red-100">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Cần kiểm tra</p>
                <p className="mt-0.5 text-xs font-bold leading-relaxed text-red-800">
                  {error}
                </p>
              </div>
            </div>
          ) : null}

          {session?.previousInvoice ? (
            <section className="rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm">
              <button
                type="button"
                onClick={() => setShowPreviousInvoice(prev => !prev)}
                className="flex w-full items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Kỳ trước</p>
                    <p className="text-xs font-bold text-slate-700">Xem hóa đơn đã thanh toán</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${showPreviousInvoice ? 'rotate-90' : ''}`} />
              </button>

              {showPreviousInvoice && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <PublicInvoiceReceipt
                    session={session}
                    invoice={session.previousInvoice}
                    isPaymentNotifying={false}
                    onTransferClick={handleTransferClick}
                    onTransferClose={() => setIsTransferOpen(false)}
                    onCopyTransfer={handleCopyTransfer}
                    onDownloadQr={handleDownloadQr}
                    onPaymentNotice={() => { }}
                  />
                </div>
              )}
            </section>
          ) : null}
        </main>

        {isConfirmOpen && (
          <div className="fixed inset-0 z-[800] flex items-end justify-center bg-slate-950/45 px-4 pb-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
              <div className="border-b border-slate-100 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Kiểm tra trước khi gửi</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Xác nhận chỉ số công tơ</h2>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  Vui lòng kiểm tra lại các chỉ số. Sau khi gửi, hệ thống sẽ tạo hóa đơn cho kỳ {session.period}.
                </p>
              </div>

              <div className="max-h-[42vh] overflow-y-auto p-4 no-scrollbar">
                <div className="space-y-2">
                  {session.meters.map(meter => {
                    const oldValue = parseN(String(meter.oldVal || 0));
                    const newValue = parseN(String(meter.newVal || 0));
                    const usage = Math.max(newValue - oldValue, 0);

                    return (
                      <div key={meter.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{meter.name}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              {formatN(oldValue)} → {formatN(newValue)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white px-3 py-2 text-right shadow-sm">
                            <p className="text-[9px] font-black uppercase text-slate-400">Tiêu thụ</p>
                            <p className="mt-0.5 text-sm font-black text-blue-700">{formatN(usage)} kWh</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-black uppercase text-slate-600 active:scale-95"
                >
                  Quay lại sửa
                </button>
                <button
                  type="button"
                  onClick={submitReading}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-xs font-black uppercase text-white shadow-lg active:scale-95 disabled:bg-slate-300"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Xác nhận gửi
                </button>
              </div>
            </div>
          </div>
        )}

        {isCorrectionOpen && (
          <div className="fixed inset-0 z-[850] flex items-end justify-center bg-slate-950/45 px-4 pb-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Yêu cầu kiểm tra</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Báo sai chỉ số</h2>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    Mô tả chỉ số đúng hoặc vấn đề bạn gặp phải. Chủ nhà sẽ xem lại trước khi cập nhật hóa đơn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCorrectionOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 p-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lý do cần sửa</span>
                  <textarea
                    value={correctionNote}
                    onChange={event => setCorrectionNote(event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                    placeholder="Ví dụ: Công tơ phòng đang là 12890, em đã nhập nhầm 12980..."
                  />
                </label>

                <div>
                  <input
                    ref={correctionFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCorrectionImagePicked}
                  />
                  <button
                    type="button"
                    onClick={() => correctionFileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-black uppercase text-slate-700 active:scale-95"
                  >
                    <Upload className="h-4 w-4" />
                    {correctionImageDataUrl ? 'Đổi ảnh minh chứng' : 'Thêm ảnh minh chứng'}
                  </button>
                  {correctionImageDataUrl ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                      <img src={correctionImageDataUrl} alt="Ảnh minh chứng chỉ số" className="max-h-48 w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
                <button
                  type="button"
                  onClick={() => setIsCorrectionOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-black uppercase text-slate-600 active:scale-95"
                >
                  Để sau
                </button>
                <button
                  type="button"
                  onClick={submitCorrectionRequest}
                  disabled={isCorrectionSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-xs font-black uppercase text-white shadow-lg active:scale-95 disabled:bg-slate-300"
                >
                  {isCorrectionSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          </div>
        )}

        {!invoicePreview && !isSubmitted ? (
          <footer className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={(!currentDone && !allDone) || isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-4 text-xs font-black uppercase tracking-wide text-white shadow-lg disabled:bg-slate-300"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : allDone ? <Send className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {primaryLabel}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
};

export default MeterReadingPublicView;
