import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Loader2, X } from 'lucide-react';
const CANVAS_FONT = '"Segoe UI", Arial, Helvetica, sans-serif';

const COLORS = {
  navy: '#082B63',
  navy2: '#0E3A7A',
  red: '#DC2626',
  gold: '#D9A441',
  bg: '#FFFDF8',
  white: '#FFFFFF',
  gray: '#64748B',
  lightGray: '#F4F6F8'
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawCenteredText = (
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight
) => {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);

  const lines = [];
  let line = '';

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (
      ctx.measureText(nextLine).width <= maxWidth ||
      !line
    ) {
      line = nextLine;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);

  lines.forEach((lineText, index) => {
    ctx.fillText(
      lineText,
      x,
      y + index * lineHeight
    );
  });

  return y + Math.max(lines.length, 1) * lineHeight;
};

const drawStar = (
  ctx,
  cx,
  cy,
  spikes,
  outerRadius,
  innerRadius
) => {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      cx + Math.cos(rot) * outerRadius,
      cy + Math.sin(rot) * outerRadius
    );

    rot += step;

    ctx.lineTo(
      cx + Math.cos(rot) * innerRadius,
      cy + Math.sin(rot) * innerRadius
    );

    rot += step;
  }

  ctx.closePath();
  ctx.fill();
};

const drawDecorations = (ctx, width, height) => {
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;

  roundRect(
    ctx,
    18,
    18,
    width - 36,
    height - 36,
    22
  );

  ctx.stroke();

  ctx.save();

  ctx.globalAlpha = 0.10;

  ctx.fillStyle = COLORS.red;

  ctx.beginPath();

  ctx.moveTo(0, height - 270);

  ctx.bezierCurveTo(
    135,
    height - 190,
    280,
    height - 150,
    455,
    height - 190
  );

  ctx.bezierCurveTo(
    570,
    height - 220,
    650,
    height - 280,
    width,
    height - 250
  );

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);

  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.14;

  ctx.fillStyle = COLORS.navy;

  ctx.beginPath();

  ctx.moveTo(width, height - 245);

  ctx.bezierCurveTo(
    620,
    height - 175,
    470,
    height - 120,
    280,
    height - 140
  );

  ctx.bezierCurveTo(
    140,
    height - 150,
    70,
    height - 190,
    0,
    height - 165
  );

  ctx.lineTo(0, height);
  ctx.lineTo(width, height);

  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.4;

  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.moveTo(0, height - 230);

  ctx.bezierCurveTo(
    190,
    height - 120,
    360,
    height - 95,
    width,
    height - 175
  );

  ctx.stroke();

  ctx.restore();
};

const drawTitleSection = (
  ctx,
  width,
  houseLabel,
  roomLabel,
  label
) => {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.fillStyle = COLORS.navy;
  ctx.font = `900 37px ${CANVAS_FONT}`;

  ctx.fillText(
    'QR NHẬP CÔNG TƠ HÀNG THÁNG',
    width / 2,
    52
  );

  const lineY = 118;

  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(155, lineY);
  ctx.lineTo(width / 2 - 24, lineY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width / 2 + 24, lineY);
  ctx.lineTo(width - 155, lineY);
  ctx.stroke();

  [width / 2, 145, width - 145].forEach((x) => {
    ctx.save();

    ctx.translate(x, lineY);
    ctx.rotate(Math.PI / 4);

    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-6, -6, 12, 12);

    ctx.restore();
  });

  ctx.fillStyle = COLORS.red;
  ctx.font = `900 40px ${CANVAS_FONT}`;

  let nextY = drawCenteredText(
    ctx,
    houseLabel || 'Lucky Home',
    width / 2,
    145,
    width - 100,
    46
  );

  ctx.fillStyle = COLORS.navy;
  ctx.font = `900 40px ${CANVAS_FONT}`;

  nextY = drawCenteredText(
    ctx,
    roomLabel || label || '',
    width / 2,
    nextY + 2,
    width - 100,
    46
  );

  return nextY;
};

const drawQrFrame = (
  ctx,
  qrImage,
  width,
  y,
  qrSize
) => {
  const cardW = qrSize + 92;
  const cardH = qrSize + 92;

  const cardX = (width - cardW) / 2;
  const cardY = y;

  // Shadow
  ctx.save();

  ctx.shadowColor = 'rgba(8, 43, 99, 0.28)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 16;

  ctx.fillStyle = COLORS.white;

  roundRect(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    32
  );

  ctx.fill();

  ctx.restore();

  // Border
  const border = ctx.createLinearGradient(
    cardX,
    cardY,
    cardX + cardW,
    cardY + cardH
  );

  border.addColorStop(0, COLORS.gold);
  border.addColorStop(0.45, COLORS.red);
  border.addColorStop(1, COLORS.navy);

  ctx.strokeStyle = border;
  ctx.lineWidth = 6;

  roundRect(
    ctx,
    cardX,
    cardY,
    cardW,
    cardH,
    32
  );

  ctx.stroke();

  // Inner
  const innerPad = 24;

  const innerX = cardX + innerPad;
  const innerY = cardY + innerPad;
  const innerW = cardW - innerPad * 2;
  const innerH = cardH - innerPad * 2;

  ctx.save();

  ctx.shadowColor = 'rgba(8, 43, 99, 0.18)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;

  ctx.fillStyle = COLORS.lightGray;

  roundRect(
    ctx,
    innerX,
    innerY,
    innerW,
    innerH,
    22
  );

  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = 'rgba(8, 43, 99, 0.16)';
  ctx.lineWidth = 2;

  roundRect(
    ctx,
    innerX,
    innerY,
    innerW,
    innerH,
    22
  );

  ctx.stroke();

  ctx.fillStyle = COLORS.white;

  roundRect(
    ctx,
    innerX + 10,
    innerY + 10,
    innerW - 20,
    innerH - 20,
    14
  );

  ctx.fill();

  const qrX = cardX + (cardW - qrSize) / 2;
  const qrY = cardY + (cardH - qrSize) / 2;

  ctx.drawImage(
    qrImage,
    qrX,
    qrY,
    qrSize,
    qrSize
  );

  return cardY + cardH;
};

const drawInstruction = (ctx, width, y) => {
  const iconX = 185;
  const iconY = y + 2;
  const iconR = 25;

  // Lines
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(70, y + 30);
  ctx.lineTo(iconX - 42, y + 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 70, y + 30);
  ctx.lineTo(width - 120, y + 30);
  ctx.stroke();

  // Dots
  ctx.fillStyle = COLORS.gold;

  ctx.beginPath();
  ctx.arc(70, y + 30, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(width - 70, y + 30, 4, 0, Math.PI * 2);
  ctx.fill();

  // Icon
  ctx.fillStyle = COLORS.navy;

  ctx.beginPath();
  ctx.arc(
    iconX,
    iconY + iconR,
    iconR,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;

  roundRect(
    ctx,
    iconX - 9,
    iconY + 9,
    18,
    31,
    4
  );

  ctx.stroke();

  ctx.fillStyle = COLORS.white;

  ctx.beginPath();
  ctx.arc(
    iconX,
    iconY + 37,
    2,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 18px ${CANVAS_FONT}`;

  ctx.fillText(
    'Quét mã để nhập chỉ số công tơ điện / nước',
    iconX + 38,
    y + 20
  );
};

const drawFooter = (ctx, width, height) => {
  const footerX = 70;
  const footerY = height - 122;
  const footerW = width - 140;
  const footerH = 88;

  const gradient = ctx.createLinearGradient(
    footerX,
    footerY,
    footerX + footerW,
    footerY
  );

  gradient.addColorStop(0, COLORS.navy);
  gradient.addColorStop(1, COLORS.navy2);

  // Shadow
  ctx.save();

  ctx.shadowColor = 'rgba(8, 43, 99, 0.30)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  ctx.fillStyle = gradient;

  roundRect(
    ctx,
    footerX,
    footerY,
    footerW,
    footerH,
    20
  );

  ctx.fill();

  ctx.restore();

  // Border
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3;

  roundRect(
    ctx,
    footerX,
    footerY,
    footerW,
    footerH,
    20
  );

  ctx.stroke();

  // Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.fillStyle = COLORS.white;
  ctx.font = `900 25px ${CANVAS_FONT}`;

  ctx.fillText(
    'Cảm ơn quý khách đã tin tưởng',
    width / 2,
    footerY + 12
  );

  ctx.fillStyle = COLORS.gold;
  ctx.font = `900 32px ${CANVAS_FONT}`;

  ctx.fillText(
    'Lucky Home',
    width / 2,
    footerY + 45
  );

};

const buildQrCardDataUrl = async ({
  qrDataUrl,
  label,
  houseLabel,
  roomLabel
}) => {
  const qrImage = await loadImage(qrDataUrl);

  const canvas =
    document.createElement('canvas');

  const width = 760;
  const height = 930;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  drawDecorations(ctx, width, height);

  const headerEndY = drawTitleSection(
    ctx,
    width,
    houseLabel || '79 Thanh Đàm - Căn 1',
    roomLabel || label || 'Phòng 203',
    label
  );

  // QR smaller
  const qrSize = 350;
  const qrCardH = qrSize + 92;

  const footerTop = height - 138;
  const instructionH = 70;

  const mainTop = headerEndY + 22;
  const mainBottom =
    footerTop - instructionH - 30;

  const available = mainBottom - mainTop;

  const qrCardY =
    mainTop +
    Math.max(
      0,
      (available - qrCardH) / 2
    );

  const qrBottom = drawQrFrame(
    ctx,
    qrImage,
    width,
    qrCardY,
    qrSize
  );

  drawInstruction(
    ctx,
    width,
    qrBottom + 34
  );

  drawFooter(ctx, width, height);

  return canvas.toDataURL('image/png');
};

const MeterReadingLinkQrModal = ({ linkInfo, onClose, onCopy }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrCardDataUrl, setQrCardDataUrl] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [message, setMessage] = useState('');

  const link = linkInfo?.url || '';
  const label = linkInfo?.label || 'Link ghi điện';
  const houseLabel = linkInfo?.houseLabel || '';
  const roomLabel = linkInfo?.roomLabel ? `Phòng ${linkInfo.roomLabel}` : label;

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
            dark: '#dc2626',
            light: '#ffffff',
          },
        });
        const cardDataUrl = await buildQrCardDataUrl({ qrDataUrl: dataUrl, label, houseLabel, roomLabel });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setQrCardDataUrl(cardDataUrl);
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    renderQr();
    return () => {
      cancelled = true;
    };
  }, [houseLabel, label, link, roomLabel]);

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
    const downloadDataUrl = qrCardDataUrl || qrDataUrl;
    if (!downloadDataUrl) return;

    const safeName = label.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'link-ghi-dien';
    const anchor = document.createElement('a');
    anchor.href = downloadDataUrl;
    anchor.download = `${safeName}-QR.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMessage('Đã lưu ảnh QR.');
  };

  const handleCopyQr = async () => {
    const copyDataUrl = qrCardDataUrl || qrDataUrl;
    if (!copyDataUrl) return;

    try {
      if (!navigator.clipboard?.write || !window.ClipboardItem) {
        throw new Error('Clipboard image is not supported');
      }

      const blob = await (await fetch(copyDataUrl)).blob();
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob })
      ]);
      setMessage('Đã copy ảnh QR vào clipboard.');
    } catch {
      setMessage('Thiết bị không hỗ trợ copy ảnh QR. Vui lòng lưu QR.');
    }
  };

  return (
    <div className="fixed inset-0 z-[850] flex items-end justify-center bg-slate-950/55 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">QR link ghi điện</p>
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
          <div className="mx-auto flex w-full max-w-[18rem] items-center justify-center rounded-2xl border border-rose-100 bg-white p-3 shadow-sm">
            {isRendering ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
              </div>
            ) : (
              <img src={qrCardDataUrl || qrDataUrl} alt={`QR ${label}`} className="max-h-[22rem] w-full object-contain" />
            )}
          </div>

          {message ? (
            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] font-bold text-emerald-700">
              {message}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95"
            >
              <Copy className="h-4 w-4" />
              Link
            </button>
            <button
              type="button"
              onClick={handleCopyQr}
              disabled={!qrCardDataUrl && !qrDataUrl}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95 disabled:bg-slate-300"
            >
              <Copy className="h-4 w-4" />
              QR
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrCardDataUrl && !qrDataUrl}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-[10px] font-black uppercase text-white shadow-sm active:scale-95 disabled:bg-slate-300"
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
