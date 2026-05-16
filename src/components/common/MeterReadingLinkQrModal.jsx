/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Copy, Download, ExternalLink, Loader2, RotateCcw, Share2, X } from 'lucide-react';
import { useSwipeBack } from '../../hooks/useSwipeBack';
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
    'QR NH\u1eacP C\u00d4NG T\u01a0 H\u00c0NG TH\u00c1NG',
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
    'Qu\u00e9t m\u00e3 \u0111\u1ec3 nh\u1eadp ch\u1ec9 s\u1ed1 c\u00f4ng t\u01a1 \u0111i\u1ec7n / n\u01b0\u1edbc',
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
    'C\u1ea3m \u01a1n qu\u00fd kh\u00e1ch \u0111\u00e3 tin t\u01b0\u1edfng',
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

export const buildQrCardDataUrl = async ({
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
    houseLabel || '79 Thanh \u0110\u00e0m - C\u0103n 1',
    roomLabel || label || 'Ph\u00f2ng 203',
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

export const buildMeterReadingQrCardDataUrl = async ({
  link,
  label,
  houseLabel,
  roomLabel
}) => {
  const qrDataUrl = await QRCode.toDataURL(link, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#dc2626',
      light: '#ffffff',
    },
  });

  const cardDataUrl = await buildQrCardDataUrl({
    qrDataUrl,
    label,
    houseLabel,
    roomLabel,
  });

  return { qrDataUrl, cardDataUrl };
};

const MeterReadingLinkQrModal = ({ linkInfo, onClose, onCopy, onReset, onValidateLink }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrCardDataUrl, setQrCardDataUrl] = useState('');
  const [linkOverride, setLinkOverride] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState('');

  const link = linkOverride || linkInfo?.url || '';
  const swipeBackHandlers = useSwipeBack({ onBack: onClose });
  const currentLinkInfo = linkInfo ? { ...linkInfo, url: link } : null;
  const label = linkInfo?.label || 'Link ghi \u0111i\u1ec7n';
  const houseLabel = linkInfo?.houseLabel || '';
  const roomLabel = linkInfo?.roomLabel ? `Ph\u00f2ng ${linkInfo.roomLabel}` : label;

  useEffect(() => {
    setLinkOverride('');
  }, [linkInfo?.url]);

  useEffect(() => {
    let cancelled = false;

    const renderQr = async () => {
      if (!link) return;

      try {
        setIsRendering(true);
        const { qrDataUrl: dataUrl, cardDataUrl } = await buildMeterReadingQrCardDataUrl({
          link,
          label,
          houseLabel,
          roomLabel,
        });
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
      await onCopy?.(currentLinkInfo);
      setMessage('\u0110\u00e3 copy t\u00ean ph\u00f2ng v\u00e0 link.');
    } catch {
      setMessage('Kh\u00f4ng copy \u0111\u01b0\u1ee3c link. Vui l\u00f2ng th\u1eed l\u1ea1i.');
    }
  };

  const getSafeFileName = () => (
    label.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'link-ghi-dien'
  );

  const getDataUrlBase64 = (dataUrl) => dataUrl.split(',')[1] || '';

  const handleDownload = () => {
    const downloadDataUrl = qrCardDataUrl || qrDataUrl;
    if (!downloadDataUrl) return;

    const safeName = getSafeFileName();
    const anchor = document.createElement('a');
    anchor.href = downloadDataUrl;
    anchor.download = `${safeName}-QR.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMessage('\u0110\u00e3 l\u01b0u \u1ea3nh QR.');
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
      setMessage('\u0110\u00e3 copy \u1ea3nh QR v\u00e0o clipboard.');
    } catch {
      setMessage('Thi\u1ebft b\u1ecb kh\u00f4ng h\u1ed7 tr\u1ee3 copy \u1ea3nh QR. Vui l\u00f2ng l\u01b0u QR.');
    }
  };

  const handleShareQr = async () => {
    const shareDataUrl = qrCardDataUrl || qrDataUrl;
    if (!shareDataUrl) return;

    try {
      setIsSharing(true);
      const safeName = getSafeFileName();
      const fileName = `${safeName}-QR-${Date.now()}.png`;

      if (Capacitor.isNativePlatform()) {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: getDataUrlBase64(shareDataUrl),
          directory: Directory.Cache,
        });

        await Share.share({
          title: label,
          files: [savedFile.uri],
          dialogTitle: 'Chia sẻ QR qua Zalo',
        });
        setMessage('Đã mở chia sẻ. Chọn Zalo để gửi QR cho khách.');
        return;
      }

      const blob = await (await fetch(shareDataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          title: label,
          files: [file],
        });
        setMessage('Đã mở chia sẻ QR.');
        return;
      }

      if (false && navigator.share) {
        await navigator.share({ title: label, url: link });
        setMessage('Đã mở chia sẻ link QR.');
        return;
      }

      await handleCopy();
      setMessage('Thiết bị chưa hỗ trợ chia sẻ ảnh QR. Đã copy link để gửi thủ công.');
    } catch (error) {
      if (error?.message?.toLowerCase?.().includes('cancel')) {
        setMessage('');
      } else {
        setMessage('Không chia sẻ được QR. Vui lòng thử lại hoặc dùng nút Lưu.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const getResetUrl = (result) => {
    if (typeof result === 'string') return result;
    return result?.url || '';
  };
  const handlePreview = async () => {
    if (!link) return;

    try {
      setIsOpening(true);
      let openLink = link;

      if (onValidateLink) {
        setMessage('\u0110ang ki\u1ec3m tra link ghi \u0111i\u1ec7n...');
        const isValid = await onValidateLink(currentLinkInfo);

        if (isValid === false) {
          if (!onReset) {
            setMessage('Link \u0111\u00e3 h\u1ecfng. Vui l\u00f2ng reset link.');
            return;
          }

          setMessage('Link \u0111\u00e3 h\u1ecfng, \u0111ang t\u1ea1o link m\u1edbi...');
          const resetResult = await onReset(currentLinkInfo, { skipConfirm: true, autoOpen: true });
          const resetUrl = getResetUrl(resetResult);
          if (!resetUrl) {
            setMessage('Kh\u00f4ng l\u1ea5y \u0111\u01b0\u1ee3c link m\u1edbi. Vui l\u00f2ng th\u1eed l\u1ea1i.');
            return;
          }
          setQrDataUrl('');
          setQrCardDataUrl('');
          setIsRendering(true);
          setLinkOverride(resetUrl);
          openLink = resetUrl;
          setMessage('Link c\u0169 b\u1ecb h\u1ecfng. \u0110\u00e3 t\u1ea1o link m\u1edbi v\u00e0 copy v\u00e0o clipboard, h\u00e3y g\u1eedi l\u1ea1i cho kh\u00e1ch.');
        } else {
          setMessage('');
        }
      }

      window.open(openLink, '_blank', 'noopener,noreferrer');
    } catch {
      setMessage('Kh\u00f4ng ki\u1ec3m tra ho\u1eb7c m\u1edf \u0111\u01b0\u1ee3c link. Vui l\u00f2ng th\u1eed l\u1ea1i.');
    } finally {
      setIsOpening(false);
    }
  };
  const handleReset = async () => {
    if (!onReset) return;

    try {
      setIsResetting(true);
      const resetResult = await onReset(currentLinkInfo);
      const resetUrl = getResetUrl(resetResult);
      if (resetResult !== false) {
        if (resetUrl) {
          setQrDataUrl('');
          setQrCardDataUrl('');
          setIsRendering(true);
          setLinkOverride(resetUrl);
        }
        setMessage('\u0110\u00e3 reset link v\u00e0 c\u1eadp nh\u1eadt QR m\u1edbi.');
      }
    } catch {
      setMessage('Kh\u00f4ng reset \u0111\u01b0\u1ee3c link. Vui l\u00f2ng th\u1eed l\u1ea1i.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div {...swipeBackHandlers} className="fixed inset-0 z-[850] flex items-end justify-center bg-slate-950/55 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">QR link ghi {'\u0111i\u1ec7n'}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95"
            aria-label="\u0110\u00f3ng"
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

          <div className="mt-3 grid grid-cols-6 gap-1.5">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isOpening}
              className="flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-blue-100 bg-blue-50 px-1 text-[8px] font-black uppercase leading-none text-blue-700 shadow-sm active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 [-webkit-tap-highlight-color:transparent]"
            >
              {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              <span className="whitespace-nowrap">{"M\u1edf"}</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-sky-100 bg-sky-50 px-1 text-[8px] font-black uppercase leading-none text-sky-700 shadow-sm active:scale-95 [-webkit-tap-highlight-color:transparent]"
            >
              <Copy className="h-4 w-4" />
              <span className="whitespace-nowrap">Link</span>
            </button>
            <button
              type="button"
              onClick={handleCopyQr}
              disabled={isRendering || (!qrCardDataUrl && !qrDataUrl)}
              className="flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-rose-100 bg-rose-50 px-1 text-[8px] font-black uppercase leading-none text-rose-700 shadow-sm active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 [-webkit-tap-highlight-color:transparent]"
            >
              <Copy className="h-4 w-4" />
              <span className="whitespace-nowrap">{"\u1ea2nh"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isRendering || (!qrCardDataUrl && !qrDataUrl)}
              className="flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-100 bg-emerald-50 px-1 text-[8px] font-black uppercase leading-none text-emerald-700 shadow-sm active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 [-webkit-tap-highlight-color:transparent]"
            >
              <Download className="h-4 w-4" />
              <span className="whitespace-nowrap">{"L\u01b0u"}</span>
            </button>
            <button
              type="button"
              onClick={handleShareQr}
              disabled={isSharing || isRendering || (!qrCardDataUrl && !qrDataUrl)}
              className="flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-teal-100 bg-teal-50 px-1 text-[8px] font-black uppercase leading-none text-teal-700 shadow-sm active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 [-webkit-tap-highlight-color:transparent]"
            >
              {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              <span className="whitespace-nowrap">Zalo</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting || !onReset}
              className="flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-100 bg-amber-50 px-1 text-[8px] font-black uppercase leading-none text-amber-700 shadow-sm active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 [-webkit-tap-highlight-color:transparent]"
            >
              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span className="whitespace-nowrap">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterReadingLinkQrModal;


