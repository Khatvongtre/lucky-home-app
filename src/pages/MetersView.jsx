import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Flame, Zap, Boxes, Receipt, ZapOff, Loader2, QrCode, X } from 'lucide-react';
import { api } from '../services/api';
import { formatN, parseN } from '../utils/formatters';
import { getMeterReadingDueState } from '../utils/date';
import { estimateHeater } from '../utils/heaterEstimate';
import { getRoomInvoiceStatus } from '../utils/roomInvoiceStatus';
import { getMeterCardStatus } from '../utils/meterCardStatus';
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
  bills = [],
  onViewRoom,
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
  const [isRoomPickerOpen, setIsRoomPickerOpen] = React.useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState([]);
  const selectableRooms = rooms || [];
  const eligibleRooms = selectableRooms.filter(room => getRoomInvoiceStatus(room, bills) !== 'paid');
  const selectedRooms = eligibleRooms.filter(room => selectedRoomIds.includes(String(room.id)));
  const allRoomsSelected = eligibleRooms.length > 0 && selectedRooms.length === eligibleRooms.length;
  const invoiceBadge = room => {
    if (room.status === 'empty') return <span className="inline-flex shrink-0 items-center rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-600 ring-1 ring-inset ring-slate-300">Phòng trống</span>;
    const status = getRoomInvoiceStatus(room, bills);
    const style = status === 'paid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : status === 'created' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-amber-50 text-amber-700 ring-amber-200';
    return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[9px] font-bold ring-1 ring-inset ${style}`}>{status === 'paid' ? 'Đã thanh toán' : status === 'created' ? 'Đã lập hóa đơn' : 'Chưa lập hóa đơn'}</span>;
  };

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

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-[9px] font-bold text-slate-600">
        {[['bg-slate-200', 'Phòng trống'], ['bg-amber-200', 'Chưa lập hóa đơn'], ['bg-orange-300', 'Chưa nhập số điện'], ['bg-emerald-200', 'Đã thanh toán']].map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
        ))}
      </div>
      <div className="space-y-2 sm:space-y-3">
        {(!currentMeters || currentMeters.length === 0) && (
          <div className="py-20 text-center">
            <ZapOff className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400 italic">Chưa có dữ liệu kỳ này.</p>
          </div>
        )}
        {currentMeters?.map(m => {
          const isOldEmpty = m.oldVal == null || m.oldVal === '';
          const isNewEmpty = m.newVal == null || m.newVal === '';
          let consumption = 0;
          let totalPrice = 0;
          const linkedRooms = rooms?.filter(r => m.roomIds?.includes(r.id)) || [];
          const linkedRoom = linkedRooms.length === 1 ? linkedRooms[0] : null;
          const createdRoomCount = linkedRooms.filter(room => getRoomInvoiceStatus(room, bills) !== 'missing').length;
          const paidRoomCount = linkedRooms.filter(room => getRoomInvoiceStatus(room, bills) === 'paid').length;
          const electricityPrice = linkedRoom?.priceElecOverride ?? linkedRoom?.effectiveServicePrices?.priceElec ?? config.priceElec ?? 0;

          if (!isOldEmpty && !isNewEmpty) {
            const vOld = parseN(String(m.oldVal));
            const vNew = parseN(String(m.newVal));
            consumption = vNew >= vOld ? (vNew - vOld) : 0;
            totalPrice = consumption * electricityPrice;
          }

          const heaterEstimate = m.type === 'heater' ? estimateHeater(consumption, linkedRooms, config.priceElec ?? 0) : null;
          const isUnchanged = !isOldEmpty && !isNewEmpty && Number(m.oldVal) === Number(m.newVal);
          const isReadingIncomplete = isOldEmpty || isNewEmpty;
          const isReadingInvalid = !isReadingIncomplete && Number(m.newVal) < Number(m.oldVal);
          const showHeaterBreakdown = heaterEstimate && linkedRooms.length > 1 && !isUnchanged && !isReadingIncomplete && !isReadingInvalid;
          if (heaterEstimate) totalPrice = heaterEstimate.total;
          const displayNumber = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
          let daysPastDue = 0;
          if (isNewEmpty && viewDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            linkedRooms.forEach(room => {
              const dueState = getMeterReadingDueState(room, {
                targetDate: viewDate,
                today,
                fallbackDay: config?.paymentDay,
              });
              if (dueState.daysFromDue > daysPastDue) daysPastDue = dueState.daysFromDue;
            });
          }

          const hId = highlightedItemId ? String(highlightedItemId) : null;
          const isHighlighted = hId && (String(m.id) === hId || m.roomIds?.map(String).includes(hId));
          const hasWarning = daysPastDue > 0;
          const cardStatus = getMeterCardStatus(m, linkedRooms, bills);
          const accent = {
            empty: 'bg-white text-slate-600 ring-slate-200',
            unread: 'bg-white text-orange-700 ring-orange-200',
            unbilled: 'bg-white text-amber-800 ring-amber-200',
            paid: 'bg-white text-emerald-700 ring-emerald-200',
            created: 'bg-blue-50 text-blue-700 ring-blue-200',
            unmapped: 'bg-slate-50 text-slate-600 ring-slate-200',
          }[cardStatus];

          let cardClasses = 'p-3 sm:p-5 rounded-xl border shadow-sm transition-all ';
          if (isHighlighted) cardClasses += 'border-red-500 shadow-red-200 animate-pulse bg-red-50 ring-2 ring-red-200';
          else {
            const backgrounds = {
              empty: 'bg-slate-100 border-slate-300',
              unread: 'bg-orange-50 border-orange-300',
              unbilled: 'bg-amber-50 border-amber-300',
              paid: 'bg-emerald-50 border-emerald-300',
              created: 'bg-white border-slate-200',
              unmapped: 'bg-white border-slate-200',
            };
            cardClasses += backgrounds[cardStatus];
            if (hasWarning) cardClasses += ' ring-1 ring-red-300';
          }

          return (
            <div id={`meter-card-${m.id}`} key={m.id} onClick={() => { if (isHighlighted && setHighlightedItemId) setHighlightedItemId(null); }} className={cardClasses}>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ring-1 ring-inset ${hasWarning || isHighlighted ? 'bg-red-50 text-red-600 ring-red-200' : accent}`}>
                    {m.type === 'heater' ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setEditingMeter(m); setIsAddMeterModalOpen(true); }} title="Sửa công tơ" className={`rounded-md px-2 py-1.5 text-left text-[11px] font-black uppercase leading-snug ring-1 ring-inset transition-colors hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${hasWarning || isHighlighted ? 'bg-red-50 text-red-700 ring-red-200' : accent}`}>{m.name}</button>
                      {linkedRooms.length > 1 && linkedRooms.every(room => room.status === 'empty') ? invoiceBadge(linkedRooms[0]) : linkedRoom ? invoiceBadge(linkedRoom) : linkedRooms.length > 1 ? (
                        <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ring-1 ring-inset ${paidRoomCount === linkedRooms.length ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : createdRoomCount > 0 ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                          {paidRoomCount === linkedRooms.length ? 'Đã thanh toán tất cả' : createdRoomCount === 0 ? 'Chưa lập hóa đơn' : `Đã lập ${createdRoomCount}/${linkedRooms.length} phòng${paidRoomCount ? ` · Đã TT ${paidRoomCount}` : ''}`}
                        </span>
                      ) : null}
                      {hasWarning && (
                        <span className="text-[7px] sm:text-[8px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded shadow-sm leading-none whitespace-nowrap">
                          Quá {daysPastDue} ngày
                        </span>
                      )}
                    </div>

                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMappingMeter(m)} title={m.roomIds?.length ? 'Gán phòng cho công tơ' : 'Chưa gán phòng cho công tơ'} aria-label={m.roomIds?.length ? 'Gán phòng cho công tơ' : 'Chưa gán phòng cho công tơ'} className={`p-2 rounded-xl transition-all ${m.roomIds?.length ? 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 active:text-blue-700' : 'bg-red-50 text-red-600 ring-1 ring-red-200 active:bg-red-100'}`}><Boxes className="w-4 h-4" /></button>
                </div>
              </div>

              <div>
              {!showHeaterBreakdown && <div className="mb-4 flex w-full items-start justify-between gap-2 rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-2 text-[10px] font-black leading-relaxed text-slate-600 tabular-nums">
                <p className="min-w-0">
                {linkedRoom && <><button type="button" disabled={!onViewRoom} onClick={(event) => { event.stopPropagation(); onViewRoom?.(linkedRoom); }} className="inline-flex items-center rounded-md border border-blue-200 bg-white px-2 py-0.5 font-black text-blue-700 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60">P.{linkedRoom.roomCode || linkedRoom.id}</button>{' · '}</>}
                {isReadingIncomplete ? (
                  <span className="text-slate-500">Chưa đủ chỉ số để tạm tính</span>
                ) : isReadingInvalid ? (
                  <span className="text-red-600">Số mới nhỏ hơn số cũ · Vui lòng kiểm tra lại</span>
                ) : isUnchanged ? (
                        <span className="text-slate-600">Không phát sinh điện</span>
                ) : (
                  <>Tổng: <span className="text-red-600">{formatN(consumption)} số x {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(electricityPrice)} đ = {formatN(totalPrice)} đ</span></>
                )}
                </p>
              </div>}

              {showHeaterBreakdown && (
                <div className="mb-4 space-y-2 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2.5 text-[10px] font-bold leading-relaxed text-slate-600 tabular-nums">
                  <p className="font-black">Tổng BNL: <span className="text-red-600">{formatN(consumption)} số · {heaterEstimate.people} người</span></p>
                  {heaterEstimate.items.map(item => (
                    <div key={item.room.id} className="flex items-start justify-between gap-2">
                      <p className="min-w-0"><button type="button" disabled={!onViewRoom} onClick={(event) => { event.stopPropagation(); onViewRoom?.(item.room); }} className="inline-flex items-center rounded-md border border-blue-200 bg-white px-2 py-0.5 font-black text-blue-700 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60">P.{item.room.roomCode || item.room.id}</button> · {item.people} người: <span className="text-red-600">{displayNumber(item.quantity)} số × {displayNumber(item.price)} đ = {formatN(item.amount)} đ</span></p>
                    </div>
                  ))}
                  <p className="border-t border-slate-200 pt-2 font-black">Tổng tiền: <span className="text-red-600">{formatN(heaterEstimate.total)} đ</span></p>
                  <p className="text-[9px] font-medium text-slate-500">Tạm tính theo số người tháng trước (chưa có thì dùng hiện tại), làm tròn xuống 1.000đ/phòng.</p>
                </div>
              )}

              {linkedRooms.length > 0 && (
                <div className="mb-4 flex flex-wrap justify-end gap-2">
                  {linkedRooms.map(room => {
                    const roomLabel = room.roomCode || room.id;
                    const isCopying = copyingRoomId === room.id;
                    const isGeneratingRoom = generatingRoomId === room.id && isSavingMeterReadings;

                    return (
                      <div key={room.id} className="flex flex-col items-end gap-1.5">
                      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <button
                          type="button"
                          disabled={isCopying}
                          onClick={(event) => handleShowMeterReadingQr(event, room, roomLabel)}
                          className="inline-flex items-center gap-1.5 bg-sky-50 px-2.5 py-1.5 text-[9px] font-black uppercase text-sky-700 hover:bg-sky-100 active:scale-95 disabled:opacity-60"
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
                          className="inline-flex items-center gap-1.5 border-l border-slate-200 bg-blue-50/60 px-2.5 py-1.5 text-[9px] font-black uppercase text-blue-700 active:scale-95 disabled:opacity-60"
                          title={`Lập hóa đơn phòng ${roomLabel}`}
                        >
                          {isGeneratingRoom ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />}
                          Lập HĐ
                        </button>
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block px-1">Số cũ</label>
                  <input type="number" value={m.oldVal ?? ''} onChange={(e) => handleUpdateOldMeterUI(m.id, e.target.value)} onBlur={() => handleSaveMeterReading?.(m.id)} className="w-full bg-white border-2 border-slate-200 p-3 rounded-xl font-black text-slate-500 text-center text-sm outline-none focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase mb-1 block px-1 text-red-600">
                    Số mới
                    {savingMeterId === m.id && <span className="ml-2 text-blue-500">Đang lưu...</span>}
                  </label>
                  <input type="number" value={m.newVal ?? ''} onChange={(e) => handleUpdateMeterUI(m.id, e.target.value)} onBlur={() => handleSaveMeterReading?.(m.id)} className={`w-full bg-white border-2 p-3 rounded-xl font-black text-red-600 text-center text-sm outline-none transition-all focus:border-red-500 ${isReadingInvalid ? 'border-red-300' : 'border-red-200'}`} />
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
            onClick={() => { setSelectedRoomIds([]); setIsRoomPickerOpen(true); }}
            disabled={isSavingMeterReadings}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] border-b-1 border-blue-800 active:translate-y-1 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:border-slate-400 disabled:active:translate-y-0"
          >
            {isSavingMeterReadings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            {isSavingMeterReadings ? 'Đang lập hóa đơn...' : `Lập hóa đơn ${monthDisplay}`}
          </button>
        </div>
      )}

      {isRoomPickerOpen && (
        <div className="fixed inset-0 z-[700] flex items-end justify-center bg-slate-950/50 p-2 sm:items-center" onClick={() => { if (!isSavingMeterReadings) setIsRoomPickerOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bill-room-picker-title" className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h2 id="bill-room-picker-title" className="text-sm font-black text-slate-800">Chọn phòng lập hóa đơn</h2>
                <p className="mt-1 text-xs text-slate-500">Kỳ {monthDisplay} · Đã chọn {selectedRooms.length}/{selectableRooms.length} phòng</p>
              </div>
              <button type="button" aria-label="Đóng" disabled={isSavingMeterReadings} onClick={() => setIsRoomPickerOpen(false)} className="rounded-lg p-2 text-slate-500 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>
            <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-xs font-bold text-blue-700">
              <input type="checkbox" checked={allRoomsSelected} disabled={isSavingMeterReadings || !eligibleRooms.length} onChange={event => setSelectedRoomIds(event.target.checked ? eligibleRooms.map(room => String(room.id)) : [])} className="h-4 w-4 accent-blue-600" />Chọn tất cả phòng chưa thanh toán
            </label>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
              {selectableRooms.map(room => (
                <label key={room.id} className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-bold text-slate-700 transition-colors ${getRoomInvoiceStatus(room, bills) === 'paid' ? 'cursor-default border-slate-200 bg-slate-100' : selectedRoomIds.includes(String(room.id)) ? 'cursor-pointer border-blue-400 bg-blue-50 shadow-sm' : 'cursor-pointer border-slate-200 bg-white hover:border-blue-300'}`}>
                  <input type="checkbox" checked={selectedRooms.some(selected => selected.id === room.id)} disabled={isSavingMeterReadings || getRoomInvoiceStatus(room, bills) === 'paid'} onChange={event => setSelectedRoomIds(current => event.target.checked ? [...current, String(room.id)] : current.filter(id => id !== String(room.id)))} className="h-4 w-4 shrink-0 accent-blue-600" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">P.{room.roomCode || room.id}</p><p className="mt-1 text-[10px] font-medium text-slate-500">{getRoomInvoiceStatus(room, bills) === 'paid' ? 'Hóa đơn đã thanh toán, không lập lại' : getRoomInvoiceStatus(room, bills) === 'created' ? 'Có thể cập nhật hóa đơn chưa thanh toán' : 'Chưa có hóa đơn trong kỳ này'}</p></div>
                  {invoiceBadge(room)}
                </label>
              ))}
              {!selectableRooms.length && <p className="py-6 text-center text-xs text-slate-500">Chưa có phòng để lập hóa đơn.</p>}
            </div>
            <div className="space-y-3 border-t border-slate-100 p-4">
              <p className="text-[11px] leading-relaxed text-slate-500">Chỉ lập cho phòng có công tơ đã nhập số mới. Phòng đã thanh toán không thể chọn; hóa đơn chưa thanh toán sẽ được cập nhật.</p>
              <button type="button" disabled={!selectedRooms.length || isSavingMeterReadings} onClick={async () => {
                const saved = await handleGenerateBills(selectedRooms.map(room => room.id));
                if (saved) setIsRoomPickerOpen(false);
              }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-black text-white disabled:bg-slate-300">
                {isSavingMeterReadings && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSavingMeterReadings ? 'Đang xử lý...' : `Lập hóa đơn (${selectedRooms.length} phòng)`}
              </button>
            </div>
          </section>
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
