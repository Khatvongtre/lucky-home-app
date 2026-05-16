import React from 'react';
import {
  Building2, User, TrendingUp, Sparkles, ChevronRight,
  CircleDollarSign, PiggyBank, PlusCircle, LogOut,
  AlertTriangle, Zap, Receipt, FileText, QrCode, Loader2, Download, ChevronDown, X, Hexagon, CheckCircle2
} from 'lucide-react';
import { formatN, parseN } from '../utils/formatters';
import ToastNotification from '../components/common/Toast';
import NotificationBell from '../components/notifications/NotificationBell';
import MeterReadingLinkQrModal, { buildMeterReadingQrCardDataUrl } from '../components/common/MeterReadingLinkQrModal';
import BillReceipt from '../components/bills/BillReceipt';
import { api } from '../services/api';
import { shareElementImage } from '../utils/imageExport';

const API_URL = import.meta.env.VITE_API_URL;
const FE_BASE_URL = (import.meta.env.VITE_FE_URL || window.location.origin).replace(/\/+$/g, '');

const LINK_CACHE_KEY = 'lucky_home_meter_links';

const readLinkCache = () => {
  try {
    return JSON.parse(localStorage.getItem(LINK_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeLinkCache = (links) => {
  localStorage.setItem(LINK_CACHE_KEY, JSON.stringify(links));
};

const getHouseLabel = (house) => (
  house?.houseName || house?.name || house?.title || ''
);

const getRoomCode = (room) => (
  room?.roomCode || room?.code || room?.name || room?.id || ''
);

const isPaidStatus = (status) => ['paid', 'completed', 'done'].includes(String(status || '').toLowerCase());

const getRoomLinkLabel = (room, house) => {
  const houseLabel = room.houseName || room.house?.name || getHouseLabel(house);
  return `${houseLabel ? `${houseLabel} - ` : ''}Phòng ${getRoomCode(room)}`;
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

  const token = result?.token || result?.publicToken;
  if (token) return `${FE_BASE_URL}/meter-reading/${encodeURIComponent(token)}`;

  throw new Error('Máy chủ chưa trả về link công tơ.');
};

const copyMeterReadingLink = async (room, house, link) => {
  await navigator.clipboard.writeText(`${getRoomLinkLabel(room, house)}\n${link}`);
};

const getMeterReadingTokenFromLink = (link) => {
  try {
    const url = new URL(link, FE_BASE_URL);
    const parts = url.pathname.split('/').filter(Boolean);
    const index = parts.indexOf('meter-reading');
    return index >= 0 ? decodeURIComponent(parts[index + 1] || '') : '';
  } catch {
    return '';
  }
};

const getSafeFileName = (...parts) => (
  parts
    .filter(Boolean)
    .join('-')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  || 'qr-ghi-dien'
);

const downloadDataUrl = (dataUrl, fileName) => {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const parseBills = (billsData = []) =>
  billsData.map(bill => ({
    ...bill,
    roomId: bill.roomCode || bill.roomId,
    details: typeof bill.details === 'object' && bill.details
      ? bill.details
      : JSON.parse(bill.detailsJson || '{}'),
    meter: typeof bill.meter === 'object' && bill.meter
      ? bill.meter
      : JSON.parse(bill.meterInfoJson || '{}'),
    heaterMeter: bill.heaterMeter || (bill.heaterInfoJson ? JSON.parse(bill.heaterInfoJson) : null),
  }));

const billBaseTotal = (details = {}) => (
  (details.rent || 0)
  + (details.elec || 0)
  + (details.heater || 0)
  + (details.water || 0)
  + (details.internet || 0)
  + (details.service || 0)
  + (details.ebikes || 0)
);

const billTimestamp = (bill = {}) => {
  const candidates = [bill.updatedAt, bill.createdAt, bill.paidAt, bill.date, bill.generatedAt];
  const timestamp = candidates
    .map(value => (value ? new Date(value).getTime() : 0))
    .find(value => Number.isFinite(value) && value > 0);
  return timestamp || 0;
};

const shouldReplaceBill = (current, candidate) => {
  if (!current) return true;
  const currentPaid = isPaidStatus(current.status);
  const candidatePaid = isPaidStatus(candidate.status);
  if (currentPaid !== candidatePaid) return candidatePaid;

  const currentTime = billTimestamp(current);
  const candidateTime = billTimestamp(candidate);
  if (candidateTime !== currentTime) return candidateTime >= currentTime;

  return String(candidate.id || '') >= String(current.id || '');
};

const dedupeBills = (billList = []) => {
  const billMap = new Map();

  billList.forEach(bill => {
    const roomKey = String(bill.roomCode || bill.roomId || '');
    const periodKey = String(bill.currentMonthFull || bill.period || '');
    const key = `${roomKey}|${periodKey}`;
    if (!roomKey) return;
    if (shouldReplaceBill(billMap.get(key), bill)) billMap.set(key, bill);
  });

  return Array.from(billMap.values());
};

const HubView = ({
  user, houses, setIsHubMode, setActiveTab, setSelectedHouse,
  setConfig, setSearchQuery, setEditingHouse, setIsAiCreateHouseOpen,
  setIsAiPromptModalOpen, setAiPrompt, setIsListening, showToast,
  handleLogout, toast, dashboardWarnings = [],
  setHighlightedItemId,
  setViewDate,
  viewDate,
  isManagerOrAbove = false,
  requestConfirm,
}) => {
  const [quickHouseId, setQuickHouseId] = React.useState(houses[0]?.id || '');
  const [roomsByHouse, setRoomsByHouse] = React.useState({});
  const [metersByHouse, setMetersByHouse] = React.useState({});
  const [billsByHouse, setBillsByHouse] = React.useState({});
  const [roomsLoadingHouseId, setRoomsLoadingHouseId] = React.useState(null);
  const [metersLoadingHouseId, setMetersLoadingHouseId] = React.useState(null);
  const [meterLinks, setMeterLinks] = React.useState(() => readLinkCache());
  const [linkLoadingRoomId, setLinkLoadingRoomId] = React.useState(null);
  const [readingLoadingRoomId, setReadingLoadingRoomId] = React.useState(null);
  const [billLoadingRoomId, setBillLoadingRoomId] = React.useState(null);
  const [downloadLoadingRoomId, setDownloadLoadingRoomId] = React.useState(null);
  const [isDownloadingHouseQr, setIsDownloadingHouseQr] = React.useState(false);
  const [isGeneratingBillImage, setIsGeneratingBillImage] = React.useState(false);
  const [isQuickQrExpanded, setIsQuickQrExpanded] = React.useState(false);
  const [isWarningsExpanded, setIsWarningsExpanded] = React.useState(false);
  const [isRecentHousesExpanded, setIsRecentHousesExpanded] = React.useState(false);
  const [isQuickHousePickerOpen, setIsQuickHousePickerOpen] = React.useState(false);
  const [showAllQuickRooms, setShowAllQuickRooms] = React.useState(false);
  const [quickMeterRoom, setQuickMeterRoom] = React.useState(null);
  const [quickMeterDrafts, setQuickMeterDrafts] = React.useState({});
  const [isQuickMeterSaving, setIsQuickMeterSaving] = React.useState(false);
  const [quickBillSheet, setQuickBillSheet] = React.useState(null);
  const [qrLinkInfo, setQrLinkInfo] = React.useState(null);

  const hubStats = houses.reduce((acc, h) => {
    acc.totalHouses += 1;
    acc.totalRooms += Number(h.totalRooms) || 0;
    acc.emptyRooms += Number(h.emptyRooms) || 0;
    acc.revenue += Number(h.revenue) || 0;
    acc.profit += Number(h.profit ?? ((Number(h.revenue) || 0) - (Number(h.expense) || 0)));
    return acc;
  }, { totalHouses: 0, totalRooms: 0, emptyRooms: 0, revenue: 0, profit: 0 });

  const rentedRooms = Math.max(0, hubStats.totalRooms - hubStats.emptyRooms);
  const occupancyRate = hubStats.totalRooms > 0
    ? Math.round((rentedRooms / hubStats.totalRooms) * 100)
    : 0;
  const canManageHouseQr = (house) => (
    ['SuperAdmin', 'Owner', 'Manager'].includes(house?.userRole || user?.role)
    || ['SuperAdmin', 'Owner'].includes(user?.role)
  );
  const quickQrHouses = houses.filter(canManageHouseQr);
  const selectedQuickHouse = quickQrHouses.find(h => String(h.id) === String(quickHouseId)) || quickQrHouses[0] || null;
  const quickRooms = selectedQuickHouse ? roomsByHouse[selectedQuickHouse.id] || [] : [];
  const quickMeters = selectedQuickHouse ? metersByHouse[selectedQuickHouse.id] || [] : [];
  const quickBills = selectedQuickHouse ? billsByHouse[selectedQuickHouse.id] || [] : [];
  const activeQuickRoomMeters = quickMeterRoom
    ? quickMeters.filter(meter => (meter.roomIds || []).map(String).includes(String(quickMeterRoom.id)))
    : [];
  const quickBillCanManage = ['SuperAdmin', 'Owner'].includes(selectedQuickHouse?.userRole || user?.role)
    || ['SuperAdmin', 'Owner'].includes(user?.role);
  const quickBillCanEdit = ['SuperAdmin', 'Owner', 'Manager'].includes(selectedQuickHouse?.userRole || user?.role)
    || ['SuperAdmin', 'Owner'].includes(user?.role);

  const getQuickRoomBill = (room) => {
    const roomCode = String(getRoomCode(room));
    return quickBills.find(item => String(item.roomCode || item.roomId) === roomCode || String(item.roomId) === String(room.id));
  };

  const getQuickBillButtonClass = (bill) => {
    if (!bill) return 'border-slate-200 bg-slate-50 text-slate-400';
    return isPaidStatus(bill.status)
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border-rose-100 bg-rose-50 text-rose-700';
  };

  const getQuickRoomMeters = (room) => (
    quickMeters.filter(meter => (meter.roomIds || []).map(String).includes(String(room.id)))
  );

  const getQuickMeterButtonClass = (roomMeters) => {
    if (metersLoadingHouseId === selectedQuickHouse?.id) return 'border-slate-200 bg-slate-50 text-slate-400';
    if (!roomMeters.length) return 'border-slate-200 bg-slate-50 text-slate-400';
    const hasMissingValue = roomMeters.some(meter => meter.newVal === null || meter.newVal === '' || meter.newVal === undefined);
    return hasMissingValue
      ? 'border-amber-100 bg-amber-50 text-amber-700'
      : 'border-emerald-100 bg-emerald-50 text-emerald-700';
  };

  const getQuickMissingStatusBadges = ({ roomMeters, bill }) => {
    const badges = [];
    const hasNoMeters = !roomMeters.length;
    const hasMissingMeter = hasNoMeters || roomMeters.some(meter => meter.newVal === null || meter.newVal === '' || meter.newVal === undefined);
    const isPaid = bill && isPaidStatus(bill.status);

    if (metersLoadingHouseId === selectedQuickHouse?.id) {
      badges.push({ label: 'Đang tải công tơ', className: 'bg-slate-100 text-slate-500' });
    } else if (hasNoMeters) {
      badges.push({ label: 'Chưa gắn công tơ', className: 'bg-slate-100 text-slate-500' });
    } else if (hasMissingMeter) {
      badges.push({ label: 'Chưa chốt điện', className: 'bg-amber-100 text-amber-700' });
    }

    if (bill && !isPaid) {
      badges.push({ label: 'Chưa thanh toán', className: 'bg-rose-100 text-rose-700' });
    }

    if (badges.length === 0) {
      badges.push({ label: 'Đã hoàn tất', className: 'bg-emerald-100 text-emerald-700' });
    }

    return badges;
  };

  const isQuickRoomIncomplete = (room) => {
    const roomMeters = getQuickRoomMeters(room);
    const bill = getQuickRoomBill(room);
    const hasMissingMeter = !roomMeters.length
      || roomMeters.some(meter => meter.newVal === null || meter.newVal === '' || meter.newVal === undefined);
    const hasUnpaidBill = bill && !isPaidStatus(bill.status);
    return hasMissingMeter || hasUnpaidBill;
  };

  const incompleteQuickRooms = quickRooms.filter(isQuickRoomIncomplete);
  const visibleQuickRooms = showAllQuickRooms ? quickRooms : incompleteQuickRooms;
  const hasQuickRoomsToProcess = incompleteQuickRooms.length > 0;

  const getQuickRoomStatusStyle = ({ roomMeters, bill }) => {
    const hasMissingMeter = !roomMeters.length || roomMeters.some(meter => meter.newVal === null || meter.newVal === '' || meter.newVal === undefined);
    const isPaid = bill && isPaidStatus(bill.status);

    if (hasMissingMeter) return {
      row: 'bg-amber-50/60 border-l-4 border-l-amber-400',
      icon: 'bg-amber-100 text-amber-700',
      text: 'text-amber-700',
    };

    if (!bill || !isPaid) return {
      row: 'bg-rose-50/60 border-l-4 border-l-rose-400',
      icon: 'bg-rose-100 text-rose-700',
      text: 'text-rose-700',
    };

    return {
      row: 'bg-emerald-50/60 border-l-4 border-l-emerald-400',
      icon: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-700',
    };
  };

  React.useEffect(() => {
    if (!quickQrHouses.length) return;
    if (!quickQrHouses.some(house => String(house.id) === String(quickHouseId))) {
      setQuickHouseId(quickQrHouses[0].id);
    }
  }, [quickHouseId, quickQrHouses]);

  React.useEffect(() => {
    if (!selectedQuickHouse?.id || roomsByHouse[selectedQuickHouse.id]) return;

    let cancelled = false;
    const loadRooms = async () => {
      try {
        setRoomsLoadingHouseId(selectedQuickHouse.id);
        const data = await api.get(`/room/${selectedQuickHouse.id}`);
        if (!cancelled) {
          setRoomsByHouse(prev => ({
            ...prev,
            [selectedQuickHouse.id]: (data || []).map(room => ({
              ...room,
              houseId: room.houseId || selectedQuickHouse.id,
              houseName: room.houseName || getHouseLabel(selectedQuickHouse),
            })),
          }));
        }
      } catch (error) {
        if (!cancelled) showToast?.(error.message || 'Không tải được danh sách phòng.', 'error');
      } finally {
        if (!cancelled) setRoomsLoadingHouseId(null);
      }
    };

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [roomsByHouse, selectedQuickHouse, showToast]);

  const loadQuickMeters = async (houseId = selectedQuickHouse?.id, force = false) => {
    if (!houseId) return [];
    if (!force && metersByHouse[houseId]) return metersByHouse[houseId];

    const meterDate = viewDate || new Date();
    const month = meterDate.getMonth() + 1;
    const year = meterDate.getFullYear();

    try {
      setMetersLoadingHouseId(houseId);
      const data = await api.get(`/meter/${houseId}?year=${year}&month=${month}`);
      const parsedMeters = (data || []).map(meter => ({
        ...meter,
        roomIds: JSON.parse(meter.roomIdsJson || '[]'),
      }));
      setMetersByHouse(prev => ({ ...prev, [houseId]: parsedMeters }));
      return parsedMeters;
    } catch (error) {
      showToast?.(error.message || 'Không tải được danh sách công tơ.', 'error');
      return [];
    } finally {
      setMetersLoadingHouseId(null);
    }
  };

  const loadQuickBills = async (houseId = selectedQuickHouse?.id, force = false) => {
    if (!houseId) return [];
    if (!force && billsByHouse[houseId]) return billsByHouse[houseId];

    const billDate = viewDate || new Date();
    const month = billDate.getMonth() + 1;
    const year = billDate.getFullYear();

    try {
      const result = await api.get(`/bill/${houseId}?year=${year}&month=${month}`);
      const billsData = Array.isArray(result) ? result : (result?.bills || []);
      const parsedBills = dedupeBills(parseBills(billsData));
      setBillsByHouse(prev => ({ ...prev, [houseId]: parsedBills }));
      return parsedBills;
    } catch (error) {
      showToast?.(error.message || 'Không tải được hóa đơn.', 'error');
      return [];
    }
  };

  React.useEffect(() => {
    if (!selectedQuickHouse?.id || !quickRooms.length || billsByHouse[selectedQuickHouse.id]) return;
    loadQuickBills(selectedQuickHouse.id);
  }, [billsByHouse, quickRooms.length, selectedQuickHouse]);

  React.useEffect(() => {
    if (!selectedQuickHouse?.id || !quickRooms.length || metersByHouse[selectedQuickHouse.id]) return;
    loadQuickMeters(selectedQuickHouse.id);
  }, [metersByHouse, quickRooms.length, selectedQuickHouse]);

  const saveMeterLink = (roomId, result) => {
    const fullUrl = resolvePublicLink(result);
    const nextValue = {
      url: fullUrl,
      expiresAt: result?.expiresAt || null,
      recurring: result?.recurring ?? true,
      reset: Boolean(result?.reset),
      updatedAt: new Date().toISOString(),
    };

    setMeterLinks(prev => {
      const next = { ...prev, [roomId]: nextValue };
      writeLinkCache(next);
      return next;
    });

    return fullUrl;
  };

  const getMeterReadingLink = async (room) => (
    meterLinks[room.id]?.url || saveMeterLink(room.id, await api.post('/meter-reading/link', {
      roomId: room.id,
      houseId: room.houseId || selectedQuickHouse?.id,
    }))
  );

  const handleShowMeterLinkQr = async (room) => {
    try {
      setLinkLoadingRoomId(room.id);
      const link = await getMeterReadingLink(room);
      setQrLinkInfo({
        url: link,
        label: getRoomLinkLabel(room, selectedQuickHouse),
        houseLabel: getHouseLabel(selectedQuickHouse),
        roomLabel: getRoomCode(room),
        room,
        house: selectedQuickHouse,
      });
    } catch (error) {
      showToast?.(error.message || 'Không mở được QR link công tơ.', 'error');
    } finally {
      setLinkLoadingRoomId(null);
    }
  };

  const handleOpenMeterReading = async (room) => {
    try {
      setReadingLoadingRoomId(room.id);
      const bills = await loadQuickBills(room.houseId || selectedQuickHouse?.id, true);
      const roomCode = String(getRoomCode(room));
      const paidBill = bills.find(item => (
        isPaidStatus(item.status)
        && (String(item.roomCode || item.roomId) === roomCode || String(item.roomId) === String(room.id))
      ));

      if (paidBill) {
        showToast?.(`Hóa đơn phòng ${roomCode} kỳ này đã thanh toán, không thể cập nhật chỉ số trong kỳ này.`, 'error');
        return;
      }

      const meters = await loadQuickMeters(room.houseId || selectedQuickHouse?.id);
      const roomMeters = meters.filter(meter => (meter.roomIds || []).map(String).includes(String(room.id)));

      if (roomMeters.length === 0) {
        showToast?.('Phòng này chưa được gắn công tơ.', 'error');
        return;
      }

      setQuickMeterDrafts(roomMeters.reduce((acc, meter) => ({
        ...acc,
        [meter.id]: meter.newVal ?? '',
      }), {}));
      setQuickMeterRoom(room);
    } finally {
      setReadingLoadingRoomId(null);
    }
  };

  const handleSaveQuickMeterReading = async () => {
    if (isQuickMeterSaving) return;
    if (!quickMeterRoom || !selectedQuickHouse) return;

    const meterDate = viewDate || new Date();
    const monthSelected = meterDate.getMonth() + 1;
    const yearSelected = meterDate.getFullYear();

    const updates = activeQuickRoomMeters
      .filter(meter => quickMeterDrafts[meter.id] !== null && quickMeterDrafts[meter.id] !== '' && quickMeterDrafts[meter.id] !== undefined)
      .map(meter => ({
        id: meter.id,
        houseId: meter.houseId || selectedQuickHouse.id,
        name: meter.name,
        type: meter.type,
        oldVal: parseN(String(meter.oldVal)),
        newVal: parseN(String(quickMeterDrafts[meter.id])),
        roomIdsJson: JSON.stringify(meter.roomIds || []),
        year: yearSelected,
        month: monthSelected,
      }));

    if (updates.length === 0) {
      showToast?.('Chưa nhập chỉ số mới nào.', 'error');
      return;
    }

    const invalidMeter = activeQuickRoomMeters.find(meter => {
      const value = quickMeterDrafts[meter.id];
      return value !== null && value !== '' && value !== undefined
        && parseN(String(value)) < parseN(String(meter.oldVal));
    });

    if (invalidMeter) {
      showToast?.('Có chỉ số mới nhỏ hơn chỉ số cũ.', 'error');
      return;
    }

    try {
      setIsQuickMeterSaving(true);
      const houseId = quickMeterRoom.houseId || selectedQuickHouse.id;
      const bills = await loadQuickBills(houseId, true);
      const roomCode = String(getRoomCode(quickMeterRoom));
      const paidBill = bills.find(item => (
        isPaidStatus(item.status)
        && (String(item.roomCode || item.roomId) === roomCode || String(item.roomId) === String(quickMeterRoom.id))
      ));

      if (paidBill) {
        showToast?.(`Hóa đơn phòng ${roomCode} kỳ này đã thanh toán, không thể cập nhật chỉ số trong kỳ này.`, 'error');
        return;
      }

      await api.post('/meter/update', updates);
      const result = await api.post('/bill/generate', {
        houseId,
        roomId: quickMeterRoom.id,
        month: monthSelected,
        year: yearSelected,
        overwrite: true,
      });
      const generatedCount = Number(result?.generatedCount ?? result?.count ?? 0);
      showToast?.(`Đã lưu chỉ số & lập ${generatedCount || ''} hóa đơn phòng ${getRoomCode(quickMeterRoom)}.`.replace('  ', ' '), 'success');
      await loadQuickMeters(houseId, true);
      await loadQuickBills(houseId, true);
      setQuickMeterRoom(null);
      setQuickMeterDrafts({});
    } catch (error) {
      showToast?.(error.message || 'Không lưu được chỉ số công tơ.', 'error');
    } finally {
      setIsQuickMeterSaving(false);
    }
  };

  const handleOpenQuickBill = async (room) => {
    try {
      setBillLoadingRoomId(room.id);
      const bills = await loadQuickBills(room.houseId || selectedQuickHouse?.id);
      const roomCode = String(getRoomCode(room));
      const bill = bills.find(item => String(item.roomCode || item.roomId) === roomCode || String(item.roomId) === String(room.id));

      if (!bill) {
        showToast?.('Phòng này chưa có hóa đơn tháng hiện tại.', 'error');
        return;
      }

      setQuickBillSheet({ type: 'bill', data: { ...bill, roomId: roomCode, roomCode } });
    } finally {
      setBillLoadingRoomId(null);
    }
  };

  const handleQuickDiscountUpdate = async (billId, discount) => {
    const houseId = selectedQuickHouse?.id;
    const houseBills = billsByHouse[houseId] || [];
    const targetBill = houseBills.find(bill => bill.id === billId) || quickBillSheet?.data;
    if (!targetBill) return;

    const newTotal = Math.max(0, billBaseTotal(targetBill.details) - discount);
    const updatedBillData = {
      ...targetBill,
      total: newTotal,
      details: { ...targetBill.details, discount },
    };

    setBillsByHouse(prev => ({
      ...prev,
      [houseId]: (prev[houseId] || []).map(bill => bill.id === billId ? updatedBillData : bill),
    }));
    setQuickBillSheet(prev => prev?.data?.id === billId ? { ...prev, data: updatedBillData } : prev);

    try {
      await api.put(`/bill/${billId}/discount`, {
        discount,
        total: newTotal,
        details: updatedBillData.details,
      });
      await loadQuickBills(houseId, true);
      showToast?.('Đã cập nhật giảm giá hóa đơn.', 'success');
    } catch (error) {
      showToast?.(error.message || 'Không cập nhật được hóa đơn.', 'error');
    }
  };

  const handleQuickShareBillImage = async (billData) => {
    if (!billData) return;

    setIsGeneratingBillImage(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const roomLabel = billData.roomId || billData.roomCode || billData.id;
      const shareMode = await shareElementImage({
        elementId: `receipt-export-${billData.id}`,
        fileName: `hoa-don-phong-${roomLabel}.png`,
        title: `Hóa đơn phòng ${roomLabel}`,
        dialogTitle: 'Chia sẻ hóa đơn qua Zalo',
      });
      showToast?.(
        shareMode === 'clipboard' ? 'Đã copy ảnh hóa đơn vào clipboard.' : 'Đã mở chia sẻ. Chọn Zalo để gửi hóa đơn.',
        'success'
      );
    } catch (error) {
      showToast?.(error.message || 'Lỗi khi xuất ảnh hóa đơn.', 'error');
    } finally {
      setIsGeneratingBillImage(false);
    }
  };

  const handleQuickPayBill = async (billId) => {
    try {
      await api.post(`/bill/pay/${billId}`);
      await loadQuickBills(selectedQuickHouse?.id, true);
      showToast?.('Gạch nợ & ghi sổ thành công.', 'success');
      setQuickBillSheet(null);
    } catch (error) {
      showToast?.(error.message || 'Không xác nhận thu được hóa đơn.', 'error');
      setQuickBillSheet(null);
    }
  };

  const handleQuickDeleteBill = async (billId) => {
    const confirmed = await requestConfirm?.({
      title: 'Xóa hóa đơn',
      message: 'Bạn có chắc chắn muốn xóa hóa đơn này không? Các chỉ số công tơ đã nhập sẽ không bị thay đổi.',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/bill/${billId}`);
      await loadQuickBills(selectedQuickHouse?.id, true);
      showToast?.('Đã xóa hóa đơn thành công.', 'success');
      setQuickBillSheet(null);
    } catch (error) {
      showToast?.(error.message || 'Không xóa được hóa đơn.', 'error');
    }
  };

  const downloadRoomQr = async (room) => {
    try {
      setDownloadLoadingRoomId(room.id);
      const link = await getMeterReadingLink(room);
      const houseLabel = getHouseLabel(selectedQuickHouse);
      const roomLabel = getRoomCode(room);
      const { cardDataUrl } = await buildMeterReadingQrCardDataUrl({
        link,
        label: getRoomLinkLabel(room, selectedQuickHouse),
        houseLabel,
        roomLabel: `Phòng ${roomLabel}`,
      });
      downloadDataUrl(cardDataUrl, `${getSafeFileName(houseLabel, `Phòng ${roomLabel}`)}-QR.png`);
      showToast?.(`Đã tải QR phòng ${roomLabel}.`, 'success');
    } catch (error) {
      showToast?.(error.message || 'Không tải được QR phòng này.', 'error');
    } finally {
      setDownloadLoadingRoomId(null);
    }
  };

  const downloadAllHouseQr = async () => {
    if (!quickRooms.length || !selectedQuickHouse) return;

    try {
      setIsDownloadingHouseQr(true);
      const houseLabel = getHouseLabel(selectedQuickHouse);

      for (const room of quickRooms) {
        const roomLabel = getRoomCode(room);
        const link = await getMeterReadingLink(room);
        const { cardDataUrl } = await buildMeterReadingQrCardDataUrl({
          link,
          label: getRoomLinkLabel(room, selectedQuickHouse),
          houseLabel,
          roomLabel: `Phòng ${roomLabel}`,
        });
        downloadDataUrl(cardDataUrl, `${getSafeFileName(houseLabel, `Phòng ${roomLabel}`)}-QR.png`);
        await new Promise(resolve => setTimeout(resolve, 180));
      }

      showToast?.(`Đã tải ${quickRooms.length} QR của ${houseLabel || 'cơ sở'}.`, 'success');
    } catch (error) {
      showToast?.(error.message || 'Không tải được toàn bộ QR của cơ sở.', 'error');
    } finally {
      setIsDownloadingHouseQr(false);
    }
  };

  const handleValidateMeterLink = async (linkInfo) => {
    const token = getMeterReadingTokenFromLink(linkInfo?.url || '');
    if (!token) return false;

    try {
      await api.get(`/meter-reading/session/${encodeURIComponent(token)}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleResetMeterLink = async (linkInfo, options = {}) => {
    const room = linkInfo?.room;
    if (!room) return false;

    if (!options.skipConfirm) {
      const confirmed = await requestConfirm?.({
        title: 'Reset link công tơ',
        message: 'Reset link sẽ làm link cũ không còn truy cập được. Chỉ dùng khi phòng có khách thuê mới hoặc nghi link bị lộ.',
      });
      if (!confirmed) return false;
    }

    try {
      setLinkLoadingRoomId(room.id);
      const result = await api.post('/meter-reading/link/reset', {
        roomId: room.id,
        houseId: room.houseId || linkInfo?.house?.id || selectedQuickHouse?.id,
      });
      const fullUrl = saveMeterLink(room.id, result);
      setQrLinkInfo(prev => prev ? { ...prev, url: fullUrl } : prev);
      if (!options.autoOpen) {
        await copyMeterReadingLink(room, linkInfo?.house || selectedQuickHouse, fullUrl);
      } else {
        await copyMeterReadingLink(room, linkInfo?.house || selectedQuickHouse, fullUrl).catch(() => null);
      }
      showToast?.(options.autoOpen ? `Link phòng ${getRoomCode(room)} bị hỏng. Đã tạo link mới, hãy gửi lại cho khách.` : `Đã reset và copy link mới phòng ${getRoomCode(room)}`, 'success');
      return fullUrl;
    } catch (error) {
      showToast?.(error.message || 'Không reset được link công tơ.', 'error');
      throw error;
    } finally {
      setLinkLoadingRoomId(null);
    }
  };

  const handleWarningClick = (warning) => {
    if (warning.type === 'SAVING' || warning.type === 'SAVING_OVERDUE') {
      setIsHubMode(false);
      setActiveTab('savings');
      setSelectedHouse(null);
      if (setHighlightedItemId) setHighlightedItemId(warning.savingId || warning.targetId || warning.id);
    } else if (warning.houseId) {
      const house = houses.find(h => h.id === warning.houseId);
      if (house) {
        setSelectedHouse(house);
        setConfig({ ...house });
        setIsHubMode(false);
        switch (warning.type) {
          case 'METER':
            setActiveTab('meters_list');
            if (setHighlightedItemId) setHighlightedItemId(warning.meterId || warning.targetId || warning.roomId || warning.id);
            break;
          case 'BILL':
            setActiveTab('bills');
            if (setHighlightedItemId) setHighlightedItemId(warning.billId || warning.targetId || warning.roomId || warning.id);
            break;
          case 'CONTRACT':
            setActiveTab('rooms');
            if (setHighlightedItemId) setHighlightedItemId(warning.roomId || warning.targetId || warning.id);
            break;
          default: setActiveTab('dashboard');
        }
      } else {
        showToast("Không tìm thấy thông tin cơ sở tương ứng", "error");
      }
    }
  };

  const getWarningConfig = (type) => {
    switch (type) {
      case 'SAVING': return { icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', borderL: 'border-l-emerald-500', lightBg: 'bg-emerald-50/50' };
      case 'SAVING_OVERDUE': return { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', borderL: 'border-l-rose-500', lightBg: 'bg-rose-50/50' };
      case 'METER': return { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', borderL: 'border-l-amber-500', lightBg: 'bg-amber-50/50' };
      case 'BILL': return { icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', borderL: 'border-l-rose-500', lightBg: 'bg-rose-50/50' };
      case 'CONTRACT': return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', borderL: 'border-l-blue-500', lightBg: 'bg-blue-50/50' };
      default: return { icon: AlertTriangle, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', borderL: 'border-l-slate-400', lightBg: 'bg-slate-50/50' };
    }
  };

  return (
    <div className="h-screen bg-slate-100 text-slate-700 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-200 shadow-2xl overflow-hidden">
      <ToastNotification toast={toast} />

      <div className="shrink-0 bg-white border-b border-slate-200 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Lucky Home</p>
            <h1 className="text-base font-black text-indigo-700 tracking-tight truncate mt-1">
              {user?.fullName || 'Tài khoản quản lý'}
            </h1>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5 leading-tight">
              Tổng quan vận hành và lối vào nhanh
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell
              houses={houses}
              setSelectedHouse={setSelectedHouse}
              setConfig={setConfig}
              setIsHubMode={setIsHubMode}
              setActiveTab={setActiveTab}
              setHighlightedItemId={setHighlightedItemId}
              setViewDate={setViewDate}
              buttonClassName="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center active:scale-95 transition-all"
              panelAlign="right-0"
            />
            <button type="button" onClick={() => { setIsHubMode(false); setActiveTab('profile'); setSelectedHouse(null); }} className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all" aria-label="Tài khoản">
              <User className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[
            { label: 'Cơ sở', value: hubStats.totalHouses, tone: 'text-blue-700 bg-blue-50' },
            { label: 'Phòng', value: hubStats.totalRooms, tone: 'text-slate-700 bg-slate-50' },
            { label: 'Trống', value: Math.max(0, hubStats.emptyRooms), tone: 'text-amber-700 bg-amber-50' },
            { label: 'Lấp đầy', value: `${occupancyRate}%`, tone: 'text-emerald-700 bg-emerald-50' }
          ].map(item => (
            <div key={item.label} className={`rounded-lg border border-slate-200 px-1.5 py-2 text-center ${item.tone}`}>
              <p className="text-[13px] font-black tabular-nums leading-none">{item.value}</p>
              <p className="mt-1 text-[6.5px] font-black uppercase leading-none opacity-70 whitespace-nowrap">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-4 no-scrollbar">
        <section className="bg-slate-900 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vận hành tháng này</p>
              <h2 className="text-2xl font-black text-emerald-400 mt-2 tabular-nums">
                {formatN(hubStats.revenue)}
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Doanh thu ghi nhận từ các cơ sở</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Lợi nhuận</p>
              <p className="text-sm font-black text-blue-300 tabular-nums mt-1">{formatN(hubStats.profit)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Phòng đang thuê</p>
              <p className="text-sm font-black text-white tabular-nums mt-1">{rentedRooms}/{hubStats.totalRooms}</p>
            </div>
          </div>
        </section>

        {hubStats.totalHouses === 0 && (
          <section className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
                <div className="min-w-0"><h3 className="text-sm font-black text-blue-800 uppercase">Bắt đầu nhanh</h3><p className="text-[11px] font-semibold text-slate-500 mt-0.5">Thiết lập app theo đúng luồng quản lý</p></div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {[
                { icon: Building2, title: 'Tạo cơ sở đầu tiên', desc: 'Nhập thông tin nhà, hợp đồng và phí dịch vụ', action: () => { setActiveTab('dashboard'); setIsHubMode(false); setEditingHouse(null); setIsAiCreateHouseOpen(true); } },
                { icon: Sparkles, title: 'Tạo nhanh bằng AI', desc: 'Mô tả căn nhà để app tự dựng dữ liệu ban đầu', action: () => { setActiveTab('dashboard'); setIsHubMode(false); setIsAiPromptModalOpen(true); setAiPrompt(""); setIsListening(false); } },
                { icon: User, title: 'Cập nhật tài khoản', desc: 'Đổi mật khẩu để bảo vệ phiên đăng nhập', action: () => { setIsHubMode(false); setActiveTab('profile'); setSelectedHouse(null); } }
              ].map(item => (
                <button key={item.title} type="button" onClick={item.action} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-left active:scale-[0.99] transition-all">
                  <div className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-sm"><item.icon className="w-4.5 h-4.5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-[12px] font-black text-indigo-700 uppercase truncate">{item.title}</p><p className="text-[10px] font-semibold text-slate-500 mt-0.5 leading-snug">{item.desc}</p></div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          {[
            { label: 'Quản lý cơ sở', desc: `${hubStats.totalHouses} cơ sở`, icon: Building2, tone: 'bg-blue-600 text-white', action: () => { setIsHubMode(false); setActiveTab('dashboard'); } },
            { label: 'Sổ chi tiêu', desc: 'Quản lý sổ quỹ', icon: CircleDollarSign, tone: 'bg-white text-orange-600', action: () => { setIsHubMode(false); setActiveTab('fund'); setSelectedHouse(null); } },
            { label: 'Sổ tiết kiệm', desc: 'Theo dõi tiền gửi', icon: PiggyBank, tone: 'bg-white text-emerald-600', action: () => { setIsHubMode(false); setActiveTab('savings'); setSelectedHouse(null); } },
            { label: 'AI Chat', desc: 'Hỗ trợ thao tác', icon: Sparkles, tone: 'bg-white text-indigo-600', action: () => { setIsHubMode(false); setActiveTab('ai'); setSelectedHouse(null); } }
          ].map(item => (
            <button key={item.label} type="button" onClick={item.action} className={`${item.tone} min-h-[112px] rounded-xl border border-slate-200 p-4 text-left shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between`}>
              <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center"><item.icon className="w-5 h-5" /></div>
              <div><h3 className="text-[13px] font-black uppercase leading-tight">{item.label}</h3><p className="text-[10px] font-bold opacity-70 mt-1">{item.desc}</p></div>
            </button>
          ))}
        </section>

        {(isManagerOrAbove || quickQrHouses.length > 0) && quickQrHouses.length > 0 && (
          <section className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
            <div className="p-3 border-b border-slate-100">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsQuickQrExpanded(prev => !prev)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setIsQuickQrExpanded(prev => !prev);
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg active:bg-slate-50"
                aria-expanded={isQuickQrExpanded}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-800" />
                  <h3 className="text-[13px] font-black text-green-700 uppercase tracking-wide">
                    Thao tác nhanh
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      setIsQuickQrExpanded(prev => !prev);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 active:scale-95"
                    aria-label={isQuickQrExpanded ? 'Thu gọn QR ghi điện nhanh' : 'Mở rộng QR ghi điện nhanh'}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isQuickQrExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2 ${hasQuickRoomsToProcess ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    {hasQuickRoomsToProcess ? (
                      <Hexagon className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    )}
                    <p className={`truncate text-[10px] font-black uppercase ${hasQuickRoomsToProcess ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {hasQuickRoomsToProcess ? (showAllQuickRooms ? 'Hiển thị tất cả' : 'Cần xử lý') : 'Hoàn thành'}
                    </p>
                    {hasQuickRoomsToProcess && (
                      <span className="shrink-0 rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                        {incompleteQuickRooms.length}
                      </span>
                    )}
                  </div>
                  {(hasQuickRoomsToProcess || showAllQuickRooms) && (
                    <p className={`shrink-0 text-[9px] font-bold ${hasQuickRoomsToProcess ? 'text-rose-400' : 'text-emerald-500'}`}>{visibleQuickRooms.length}/{quickRooms.length}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllQuickRooms(prev => !prev)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showAllQuickRooms ? 'bg-emerald-600' : 'bg-rose-600'}`}
                  aria-pressed={showAllQuickRooms}
                >
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${showAllQuickRooms ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="mt-2 flex items-end gap-2">
                <div className="relative z-40 min-w-0 flex-1">
                  {quickQrHouses.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setIsQuickHousePickerOpen(prev => !prev)}
                    className={`flex h-12 w-full items-center gap-2 rounded-xl border px-2.5 text-left shadow-inner active:scale-[0.99] ${hasQuickRoomsToProcess ? 'border-rose-100 bg-rose-50/70' : 'border-emerald-100 bg-emerald-50/80'}`}
                    aria-expanded={isQuickHousePickerOpen}
                    aria-haspopup="listbox"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ${hasQuickRoomsToProcess ? 'text-rose-600' : 'text-emerald-600'}`}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black uppercase text-blue-800">
                        {getHouseLabel(selectedQuickHouse) || 'Cơ sở'}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                        {quickRooms.length} phòng trong cơ sở đang chọn
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${hasQuickRoomsToProcess ? 'text-rose-500' : 'text-emerald-600'} ${isQuickHousePickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  ) : (
                    <div className={`flex h-12 w-full items-center gap-2 rounded-xl border px-2.5 text-left ${hasQuickRoomsToProcess ? 'border-slate-100 bg-slate-50' : 'border-emerald-100 bg-emerald-50/80'}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ${hasQuickRoomsToProcess ? 'text-slate-500' : 'text-emerald-600'}`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black uppercase text-blue-800">
                          {getHouseLabel(selectedQuickHouse) || 'Cơ sở'}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold text-slate-500">
                          {quickRooms.length} phòng
                        </p>
                      </div>
                    </div>
                  )}

                  {isQuickHousePickerOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg no-scrollbar" role="listbox">
                      {quickQrHouses.map(house => {
                        const isSelected = String(house.id) === String(selectedQuickHouse?.id);
                        return (
                          <button
                            key={house.id}
                            type="button"
                            onClick={() => {
                              setQuickHouseId(house.id);
                              setIsQuickHousePickerOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left active:scale-[0.99] ${isSelected ? 'bg-rose-50 text-rose-700' : 'text-slate-700 active:bg-slate-50'}`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-white text-rose-600 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-black uppercase">
                                {getHouseLabel(house) || 'Cơ sở'}
                              </p>
                              <p className="mt-0.5 text-[9px] font-bold text-slate-400">
                                {house.totalRooms || 0} phòng
                              </p>
                            </div>
                            {isSelected && (
                              <span className="rounded-md bg-rose-600 px-2 py-1 text-[8px] font-black uppercase text-white">
                                Đang chọn
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={downloadAllHouseQr}
                  disabled={!quickRooms.length || isDownloadingHouseQr || roomsLoadingHouseId === selectedQuickHouse?.id}
                  className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 active:scale-95 disabled:opacity-50"
                  aria-label="Tải toàn bộ QR"
                  title="Tải toàn bộ QR"
                >
                  {isDownloadingHouseQr || roomsLoadingHouseId === selectedQuickHouse?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isQuickQrExpanded && <div className="max-h-[240px] overflow-y-auto divide-y divide-slate-200 no-scrollbar">
              {roomsLoadingHouseId === selectedQuickHouse?.id && visibleQuickRooms.length === 0 ? (
                <div className="flex items-center justify-center gap-2 p-5 text-xs font-bold text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải phòng
                </div>
              ) : visibleQuickRooms.length === 0 ? (
                <div className="p-5 text-center">
                  <QrCode className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">
                    {quickRooms.length === 0 ? 'Cơ sở này chưa có phòng.' : showAllQuickRooms ? 'Cơ sở này chưa có phòng.' : 'Không còn phòng cần xử lý.'}
                  </p>
                </div>
              ) : (
                visibleQuickRooms.map(room => {
                  const isLoading = linkLoadingRoomId === room.id;
                  const isOpeningReading = readingLoadingRoomId === room.id;
                  const isOpeningBill = billLoadingRoomId === room.id;
                  const isDownloading = downloadLoadingRoomId === room.id;
                  const roomCode = getRoomCode(room);
                  const roomBill = getQuickRoomBill(room);
                  const roomMeters = getQuickRoomMeters(room);
                  const rowStatusStyle = getQuickRoomStatusStyle({ roomMeters, bill: roomBill });
                  const missingBadges = getQuickMissingStatusBadges({ roomMeters, bill: roomBill });
                  return (
                    <div key={room.id} className={`flex w-full items-center gap-1.5 border-b border-slate-200/70 p-2.5 last:border-b-0 ${rowStatusStyle.row}`}>
                      <button
                        type="button"
                        onClick={() => handleShowMeterLinkQr(room)}
                        disabled={isLoading || isOpeningReading || isOpeningBill || isDownloadingHouseQr}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-left active:bg-rose-50 disabled:opacity-60"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${rowStatusStyle.icon}`}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-black uppercase text-blue-800">
                            {room.roomType === 'mbkd' ? 'MBKD ' : 'Phòng '}{roomCode}
                          </p>
                          <div className="mt-0.5 flex flex-nowrap gap-1 overflow-x-auto no-scrollbar">
                            {missingBadges.map(badge => (
                              <span key={badge.label} className={`shrink-0 rounded-md px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase leading-none whitespace-nowrap ${badge.className}`}>
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenMeterReading(room)}
                        disabled={isLoading || isOpeningReading || isOpeningBill || isDownloadingHouseQr}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border active:scale-95 disabled:opacity-60 ${getQuickMeterButtonClass(roomMeters)}`}
                        aria-label={`Ghi số điện phòng ${roomCode}`}
                        title={!roomMeters.length ? 'Chưa gắn công tơ' : roomMeters.some(meter => meter.newVal === null || meter.newVal === '' || meter.newVal === undefined) ? 'Chưa nhập đủ chỉ số' : 'Đã nhập chỉ số'}
                      >
                        {isOpeningReading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickBill(room)}
                        disabled={isLoading || isOpeningReading || isOpeningBill || isDownloadingHouseQr}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border active:scale-95 disabled:opacity-60 ${getQuickBillButtonClass(roomBill)}`}
                        aria-label={`Xem hóa đơn phòng ${roomCode}`}
                        title={!roomBill ? 'Chưa tạo hóa đơn' : isPaidStatus(roomBill.status) ? 'Đã thanh toán' : 'Đã tạo, chưa thanh toán'}
                      >
                        {isOpeningBill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadRoomQr(room)}
                        disabled={isLoading || isOpeningReading || isOpeningBill || isDownloading || isDownloadingHouseQr}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 active:scale-95 disabled:opacity-60"
                        aria-label={`Tải QR phòng ${roomCode}`}
                      >
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>}
          </section>
        )}

        {dashboardWarnings.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsWarningsExpanded(prev => !prev)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsWarningsExpanded(prev => !prev);
                }
              }}
              aria-expanded={isWarningsExpanded}
              className="p-3.5 flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 active:bg-rose-50"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-[13px] font-black text-rose-800 uppercase tracking-tight">Cần chú ý</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">{dashboardWarnings.length} Cảnh báo</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsWarningsExpanded(prev => !prev);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-600 transition active:scale-95"
                  aria-label={isWarningsExpanded ? 'Thu gọn cảnh báo' : 'Mở rộng cảnh báo'}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isWarningsExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            {isWarningsExpanded && <div className="divide-y divide-rose-100/80 max-h-[300px] overflow-y-auto no-scrollbar">
              {dashboardWarnings.map((w, idx) => {
                const config = getWarningConfig(w.type);
                const Icon = config.icon;
                return (
                  <button key={idx} onClick={() => handleWarningClick(w)} className={`w-full text-left p-3 flex items-start gap-3 transition-colors active:scale-[0.99] border-l-4 border-b border-rose-100/70 last:border-b-0 ${config.borderL} ${config.lightBg} hover:opacity-80`}>
                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${config.bg} ${config.color} border ${config.border} shadow-sm`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-700 leading-snug">{w.message}</p>
                      {w.houseName && <p className={`text-[9px] font-black uppercase tracking-widest mt-1 flex items-center gap-1 ${config.color}`}><Building2 className="w-3 h-3" /> {w.houseName}</p>}
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 self-center ${config.color}`} />
                  </button>
                )
              })}
            </div>}
          </section>
        )}

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsRecentHousesExpanded(prev => !prev)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsRecentHousesExpanded(prev => !prev);
              }
            }}
            aria-expanded={isRecentHousesExpanded}
            className="p-4 flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 active:bg-blue-50"
          >
            <div><h3 className="text-sm font-black text-blue-700 uppercase">Cơ sở của bạn</h3><p className="text-[11px] font-semibold text-slate-500 mt-0.5">Chọn nhanh để vào dashboard</p></div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsRecentHousesExpanded(prev => !prev);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition active:scale-95"
                aria-label={isRecentHousesExpanded ? 'Thu gọn cơ sở của bạn' : 'Mở rộng cơ sở của bạn'}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isRecentHousesExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          {isRecentHousesExpanded && <div className="max-h-[340px] divide-y divide-slate-200 overflow-y-auto no-scrollbar">
            {houses.length === 0 && (
              <div className="p-5 text-center">
                <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-500">Bạn chưa có cơ sở nào.</p>
                <button type="button" onClick={() => { setActiveTab('dashboard'); setIsHubMode(false); setEditingHouse(null); setIsAiCreateHouseOpen(true); }} className="mt-4 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase">Tạo cơ sở đầu tiên</button>
              </div>
            )}
            {houses.map(h => (
              <button key={h.id} type="button" onClick={() => { setSelectedHouse(h); setConfig({ ...h }); setIsHubMode(false); setActiveTab('dashboard'); setSearchQuery(''); }} className="w-full border-b border-slate-200/80 p-3.5 flex items-center gap-3 text-left active:bg-slate-50 transition-colors last:border-b-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h4 className="text-[13px] font-black text-blue-800 uppercase truncate">{h.name}</h4><span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase shrink-0">{h.userRole || user?.role}</span></div><p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">{h.address || 'Chưa cập nhật địa chỉ'}</p></div>
                <div className="text-right shrink-0"><p className="text-[12px] font-black text-emerald-700 tabular-nums">{Math.max((h.totalRooms || 0) - (h.emptyRooms || 0), 0)}/{h.totalRooms || 0}</p><p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">đã thuê</p></div>
              </button>
            ))}
          </div>}
        </section>

        <section className="grid grid-cols-2 gap-3"><button type="button" onClick={() => { setActiveTab('dashboard'); setIsHubMode(false); setEditingHouse(null); setIsAiCreateHouseOpen(true); }} className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all"><div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><PlusCircle className="w-5 h-5" /></div><div><p className="text-[11px] font-black text-blue-700 uppercase">Thêm cơ sở</p><p className="text-[9px] font-bold text-slate-500 mt-0.5">Nhập thủ công</p></div></button><button type="button" onClick={() => { setActiveTab('dashboard'); setIsHubMode(false); setIsAiPromptModalOpen(true); setAiPrompt(""); setIsListening(false); }} className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all"><div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div><div><p className="text-[11px] font-black text-indigo-700 uppercase">Tạo bằng AI</p><p className="text-[9px] font-bold text-slate-500 mt-0.5">Từ mô tả nhà</p></div></button></section>
        <button type="button" onClick={handleLogout} className="w-full bg-white border border-red-100 text-red-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"><LogOut className="w-4 h-4" /> Đăng xuất</button>
      </div>
      <MeterReadingLinkQrModal
        linkInfo={qrLinkInfo}
        onClose={() => setQrLinkInfo(null)}
        onCopy={(currentLinkInfo) => currentLinkInfo && copyMeterReadingLink(currentLinkInfo.room, currentLinkInfo.house, currentLinkInfo.url)}
        onReset={handleResetMeterLink}
        onValidateLink={handleValidateMeterLink}
      />
      <BillReceipt
        bottomSheet={quickBillSheet}
        setBottomSheet={setQuickBillSheet}
        config={selectedQuickHouse || {}}
        API_URL={API_URL}
        isManagerOrAbove={quickBillCanEdit}
        isOwnerOrAdmin={quickBillCanManage}
        isGeneratingImage={isGeneratingBillImage}
        handleDiscountUpdate={handleQuickDiscountUpdate}
        handleShareZaloImage={handleQuickShareBillImage}
        handleDeleteBill={handleQuickDeleteBill}
        handlePayBill={handleQuickPayBill}
      />
      {quickMeterRoom && (
        <div className="fixed inset-0 z-[860] flex items-end justify-center bg-slate-950/55 px-4 pb-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Ghi số điện nhanh</p>
                <h3 className="mt-1 truncate text-base font-black text-blue-800">
                  {getHouseLabel(selectedQuickHouse)} - Phòng {getRoomCode(quickMeterRoom)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickMeterRoom(null);
                  setQuickMeterDrafts({});
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4 no-scrollbar">
              {activeQuickRoomMeters.map(meter => {
                const draftValue = quickMeterDrafts[meter.id] ?? '';
                const oldValue = parseN(String(meter.oldVal || 0));
                const newValue = parseN(String(draftValue || 0));
                const usage = draftValue === '' ? 0 : Math.max(newValue - oldValue, 0);
                const isInvalid = draftValue !== '' && newValue < oldValue;

                return (
                  <div key={meter.id} className={`mb-3 rounded-xl border p-3 ${isInvalid ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meter.type === 'heater' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-black uppercase text-blue-800">{meter.name}</p>
                          <p className="text-[10px] font-bold text-slate-500">Cũ: {formatN(oldValue)}</p>
                        </div>
                      </div>
                      <div className={`rounded-lg px-2 py-1 text-[10px] font-black ${isInvalid ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                        {formatN(usage)} số
                      </div>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draftValue}
                      onChange={event => setQuickMeterDrafts(prev => ({ ...prev, [meter.id]: event.target.value }))}
                      className="w-full rounded-xl border-2 border-white bg-white px-4 py-3 text-center text-2xl font-black text-blue-900 outline-none focus:border-blue-400"
                      placeholder="Nhập số mới"
                    />
                    {isInvalid && (
                      <p className="mt-2 text-center text-[10px] font-black uppercase text-red-600">Số mới nhỏ hơn số cũ</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => {
                  setQuickMeterRoom(null);
                  setQuickMeterDrafts({});
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-[10px] font-black uppercase text-slate-600 active:scale-95"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveQuickMeterReading}
                disabled={isQuickMeterSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-[10px] font-black uppercase text-white active:scale-95 disabled:bg-slate-300"
              >
                {isQuickMeterSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu chỉ số
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HubView;
