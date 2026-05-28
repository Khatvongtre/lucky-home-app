import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Flame, Zap, Edit, Boxes, Receipt, ZapOff, Loader2, QrCode } from 'lucide-react';
import { api } from '../services/api';
import { formatN, parseN } from '../utils/formatters';
import MeterReadingLinkQrModal from '../components/common/MeterReadingLinkQrModal';

const FE_BASE_URL = (import.meta.env.VITE_FE_URL || window.location.origin).replace(/\/+$/g, '');

const getRoomLinkLabel = (room, fallbackLabel) => {
  const roomLabel = room.roomCode || room.code || room.name || fallbackLabel || room.id;
  const houseLabel = room.houseName || room.house?.name || room.house?.houseName || '';
  return `${houseLabel ? `${houseLabel} - ` : ''}Phòng ${roomLabel}`;
};

const copyMeterReadingLink = async (room, link, fallbackLabel) => {
  const label = getRoomLinkLabel(room, fallbackLabel);
  await navigator.clipboard.writeText(`${label}\n${link}`);
};

const getHouseLabel = (selectedHouse, config) => (
  selectedHouse?.houseName || selectedHouse?.name || selectedHouse?.title || config?.houseName || config?.name || ''
);

const MetersView = ({
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
  isSavingMeterReadings = false,
  savingMeterId,
  generatingRoomId,
  handleSaveMeterReading,
  handleGenerateBills,
  handleGenerateBillForRoom,
  showToast,
  viewDate,
  rooms,
  loadHouseData,
  selectedHouse,
  highlightedItemId,
  setHighlightedItemId,
}) => {
  const [copyingRoomId, setCopyingRoomId] = React.useState(null);
  const [qrLinkInfo, setQrLinkInfo] = React.useState(null);

  const resolvePublicLink = (result) => {
    const rawUrl = result?.url || result?.link || result?.publicUrl;
    if (rawUrl) {
      if (rawUrl.startsWith('http')) return rawUrl;
      if (rawUrl.startsWith('/')) return `${FE_BASE_URL}${rawUrl}`;
      if (rawUrl.startsWith('meter-reading/')) return `${FE_BASE_URL}/${rawUrl}`;
      if (!rawUrl.includes('/')) return `${FE_BASE_URL}/meter-reading/${encodeURIComponent(rawUrl)}`;
      return `${FE_BASE_URL}/${rawUrl}`;
    }

    if (result?.tokenHash || result?.hash) {
      throw new Error('API đang trả token hash nên link không mở được. BE cần trả url hoặc token gốc một lần khi tạo link.');
    }

    const token = result?.token || result?.publicToken;
    if (token) return `${FE_BASE_URL}/meter-reading/${encodeURIComponent(token)}`;

    throw new Error('Máy chủ chưa trả về link ghi điện.');
  };

  const handleShowMeterReadingQr = async (event, room, roomLabel) => {
    event.stopPropagation();

    try {
      setCopyingRoomId(room.id);
      const result = await api.post('/meter-reading/link', {
        roomId: room.id,
        houseId: room.houseId || room.houseID,
      });
      const link = resolvePublicLink(result);
      setQrLinkInfo({
        url: link,
        label: getRoomLinkLabel(room, roomLabel),
        houseLabel: getHouseLabel(selectedHouse, config),
        room,
        roomLabel,
      });
    } catch (error) {
      showToast?.(error.message || 'Không mở được QR link ghi điện.', 'error');
    } finally {
      setCopyingRoomId(null);
    }
  };

  useEffect(() => {
    if (selectedHouse?.id && (!rooms || rooms.length === 0)) {
      loadHouseData?.(selectedHouse.id, 'rooms').catch(error => {
        showToast?.(error.message || 'Không tải được danh sách phòng.', 'error');
      });
    }
  }, [loadHouseData, rooms, selectedHouse?.id, showToast]);

  useEffect(() => {
    if (highlightedItemId && currentMeters?.length > 0) {
      const hId = String(highlightedItemId);
      const targetMeter = currentMeters.find(m => String(m.id) === hId || m.roomIds?.map(String).includes(hId));
      if (targetMeter) {
        let attempts = 0;
        const scrollInterval = setInterval(() => {
          const element = document.getElementById(`meter-card-${targetMeter.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            clearInterval(scrollInterval);
          }
          attempts++;
          if (attempts >= 10) clearInterval(scrollInterval);
        }, 200);
        return () => clearInterval(scrollInterval);
      }
    }
  }, [highlightedItemId, currentMeters]);

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
          const isOldEmpty = m.oldVal === null || m.oldVal === '';
          const isNewEmpty = m.newVal === null || m.newVal === '';
          let consumption = 0;
          let totalPrice = 0;

          if (!isOldEmpty && !isNewEmpty) {
            const vOld = parseN(String(m.oldVal));
            const vNew = parseN(String(m.newVal));
            consumption = vNew >= vOld ? (vNew - vOld) : 0;
            totalPrice = consumption * (config.priceElec || 0);
          }

          const linkedRooms = rooms?.filter(r => m.roomIds?.includes(r.id)) || [];
          let minPaymentDay = null;
          linkedRooms.forEach(r => {
            if (r.paymentDate) {
              const pd = Number(r.paymentDate);
              if (!Number.isNaN(pd) && (minPaymentDay === null || pd < minPaymentDay)) minPaymentDay = pd;
            }
          });
          if (minPaymentDay === null && config?.paymentDay) minPaymentDay = Number(config.paymentDay);

          let daysPastDue = 0;
          if (minPaymentDay !== null && isNewEmpty && viewDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), minPaymentDay);
            const diffDaysVal = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            if (diffDaysVal > 0) daysPastDue = diffDaysVal;
          }

          const hId = highlightedItemId ? String(highlightedItemId) : null;
          const isHighlighted = hId && (String(m.id) === hId || m.roomIds?.map(String).includes(hId));
          const hasWarning = daysPastDue > 0;

          let cardClasses = 'p-5 rounded-xl border shadow-sm transition-all ';
          if (isHighlighted) cardClasses += 'border-red-500 shadow-red-200 animate-pulse bg-red-50 ring-2 ring-red-200';
          else if (hasWarning) cardClasses += 'bg-white border-red-300';
          else cardClasses += 'bg-white border-slate-100';

          return (
            <div id={`meter-card-${m.id}`} key={m.id} onClick={() => { if (isHighlighted && setHighlightedItemId) setHighlightedItemId(null); }} className={cardClasses}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === 'heater' ? (hasWarning || isHighlighted ? 'bg-red-100 text-red-600' : 'bg-orange-50 text-orange-500') : (hasWarning || isHighlighted ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600')}`}>
                    {m.type === 'heater' ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-[11px] font-black uppercase leading-none ${hasWarning || isHighlighted ? 'text-red-700' : 'text-rose-800'}`}>{m.name}</p>
                      {hasWarning && (
                        <span className="text-[7px] sm:text-[8px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded shadow-sm leading-none whitespace-nowrap">
                          Quá {daysPastDue} ngày
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] font-bold text-blue-400 mt-1">
                      Tổng: {formatN(consumption)} số - Tiền: {formatN(totalPrice)} đ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setEditingMeter(m); setIsAddMeterModalOpen(true); }} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-all"><Edit className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setMappingMeter(m)} className="p-2 bg-slate-50 text-slate-400 rounded-xl active:bg-orange-50 active:text-orange-500 transition-all"><Boxes className="w-4 h-4" /></button>
                </div>
              </div>

              {linkedRooms.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {linkedRooms.map(room => {
                    const roomLabel = room.roomCode || room.id;
                    const isCopying = copyingRoomId === room.id;
                    const isGeneratingRoom = generatingRoomId === room.id && isSavingMeterReadings;

                    return (
                      <div key={room.id} className="inline-flex overflow-hidden rounded-lg border border-rose-100 bg-rose-50">
                        <button
                          type="button"
                          disabled={isCopying}
                          onClick={(event) => handleShowMeterReadingQr(event, room, roomLabel)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black uppercase text-rose-700 active:scale-95 disabled:opacity-60"
                          title={`QR link ghi điện phòng ${roomLabel}`}
                        >
                          {isCopying ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                          QR {roomLabel}
                        </button>
                        <button
                          type="button"
                          disabled={isSavingMeterReadings}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleGenerateBillForRoom?.(room.id);
                          }}
                          className="inline-flex items-center gap-1.5 border-l border-rose-100 bg-white/70 px-2.5 py-1.5 text-[9px] font-black uppercase text-blue-700 active:scale-95 disabled:opacity-60"
                          title={`Lập hóa đơn phòng ${roomLabel}`}
                        >
                          {isGeneratingRoom ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />}
                          Lập HĐ
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block px-1">Số cũ</label>
                  <input type="number" value={m.oldVal || ''} onChange={(e) => handleUpdateOldMeterUI(m.id, e.target.value)} onBlur={() => handleSaveMeterReading?.(m.id)} className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-xl font-black text-slate-500 text-center text-sm outline-none focus:border-purple-200 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-rose-600 uppercase mb-1 block px-1">
                    Số mới
                    {savingMeterId === m.id && <span className="ml-2 text-blue-500">Đang lưu...</span>}
                  </label>
                  <input type="number" value={m.newVal || ''} onChange={(e) => handleUpdateMeterUI(m.id, e.target.value)} onBlur={() => handleSaveMeterReading?.(m.id)} className="w-full bg-blue-50/50 border-2 border-transparent p-3 rounded-xl font-black text-red-600 text-center text-sm outline-none focus:border-red-200 transition-all shadow-inner" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentMeters?.length > 0 && (
        <div className="fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
          <button
            type="button"
            onClick={handleGenerateBills}
            disabled={isSavingMeterReadings}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] border-b-1 border-blue-800 active:translate-y-1 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:border-slate-400 disabled:active:translate-y-0"
          >
            {isSavingMeterReadings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            {isSavingMeterReadings ? 'Đang lập hóa đơn...' : `Lập hóa đơn ${monthDisplay}`}
          </button>
        </div>
      )}

      <MeterReadingLinkQrModal
        linkInfo={qrLinkInfo}
        onClose={() => setQrLinkInfo(null)}
        onCopy={() => qrLinkInfo && copyMeterReadingLink(qrLinkInfo.room, qrLinkInfo.url, qrLinkInfo.roomLabel)}
      />
    </div>
  );
};

export default MetersView;
