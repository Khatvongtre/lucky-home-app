import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Loader2, X } from 'lucide-react';

const MeterReadingLinkQrModal = ({ linkInfo, onClose, onCopy }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [message, setMessage] = useState('');

  const link = linkInfo?.url || '';
  const label = linkInfo?.label || 'Link ghi điện';

  useEffect(() => {
    let cancelled = false;

    const renderQr = async () => {
      if (!link) return;

      try {
        setIsRendering(true);
        const dataUrl = await QRCode.toDataURL(link, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 320,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    renderQr();
    return () => {
      cancelled = true;
    };
  }, [link]);

  if (!linkInfo) return null;

  const handleCopy = async () => {
    try {
      await onCopy?.();
      setMessage('Đã copy tên phòng và link.');
    } catch {
      setMessage('Không copy được link. Vui lòng thử lại.');
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const safeName = label.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'link-ghi-dien';
    const anchor = document.createElement('a');
    anchor.href = qrDataUrl;
    anchor.download = `${safeName}-QR.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMessage('Đã lưu ảnh QR.');
  };

  return (
    <div className="fixed inset-0 z-[850] flex items-end justify-center bg-slate-950/55 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">QR link ghi điện</p>
            <h2 className="mt-1 truncate text-lg font-black text-slate-950">{label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {isRendering ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            ) : (
              <img src={qrDataUrl} alt={`QR ${label}`} className="h-full w-full object-contain" />
            )}
          </div>

          <p className="mt-3 break-all rounded-xl bg-slate-50 p-3 text-center text-[11px] font-semibold leading-relaxed text-slate-500">
            {link}
          </p>

          {message ? (
            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] font-bold text-emerald-700">
              {message}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95"
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95 disabled:bg-slate-300"
            >
              <Download className="h-4 w-4" />
              Lưu QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterReadingLinkQrModal;
