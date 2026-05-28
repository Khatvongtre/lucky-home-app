import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { parseN } from '../utils/formatters';

const isPaidStatus = (status) => ['paid', 'completed', 'done'].includes(String(status || '').toLowerCase());

const getBillRoomKey = (bill) => String(bill?.roomCode || bill?.roomId || '');

const hasValue = (value) => value !== null && value !== '' && value !== undefined;

export const useMeters = ({
  meters,
  rooms = [],
  setMeters,
  houseId,
  viewDate,
  loadHouseData,
  showToast,
  requestConfirm,
}) => {
  const [isAddMeterModalOpen, setIsAddMeterModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState(null);
  const [mappingMeter, setMappingMeter] = useState(null);
  const [isSavingMeterReadings, setIsSavingMeterReadings] = useState(false);
  const [savingMeterId, setSavingMeterId] = useState(null);
  const [generatingRoomId, setGeneratingRoomId] = useState(null);
  const [dirtyMeterIds, setDirtyMeterIds] = useState(() => new Set());

  const buildMeterUpdate = useCallback((meter) => {
    const monthSelected = viewDate.getMonth() + 1;
    const yearSelected = viewDate.getFullYear();

    return {
      id: meter.id,
      houseId: meter.houseId || houseId,
      name: meter.name,
      type: meter.type,
      oldVal: hasValue(meter.oldVal) ? parseN(String(meter.oldVal)) : null,
      newVal: hasValue(meter.newVal) ? parseN(String(meter.newVal)) : null,
      roomIdsJson: JSON.stringify(meter.roomIds || []),
      year: yearSelected,
      month: monthSelected,
    };
  }, [houseId, viewDate]);

  const handleUpdateOldMeterUI = useCallback((id, val) => {
    setMeters(prev => prev.map(meter => meter.id === id ? { ...meter, oldVal: val } : meter));
    setDirtyMeterIds(prev => new Set(prev).add(id));
  }, [setMeters]);

  const handleUpdateMeterUI = useCallback((id, val) => {
    setMeters(prev => prev.map(meter => meter.id === id ? { ...meter, newVal: val } : meter));
    setDirtyMeterIds(prev => new Set(prev).add(id));
  }, [setMeters]);

  const saveMeterReading = useCallback(async (meter, { silent = false } = {}) => {
    if (!meter || !dirtyMeterIds.has(meter.id)) return true;
    if (!hasValue(meter.oldVal) && !hasValue(meter.newVal)) return true;

    if (hasValue(meter.oldVal) && hasValue(meter.newVal) && parseN(String(meter.newVal)) < parseN(String(meter.oldVal))) {
      showToast('Chỉ số mới không được nhỏ hơn chỉ số cũ.', 'error');
      return false;
    }

    try {
      setSavingMeterId(meter.id);
      await api.post('/meter/update', [buildMeterUpdate(meter)]);
      setDirtyMeterIds(prev => {
        const next = new Set(prev);
        next.delete(meter.id);
        return next;
      });
      if (!silent) showToast('Đã tự lưu chỉ số công tơ.', 'success');
      return true;
    } catch (error) {
      showToast(error.message || 'Không tự lưu được chỉ số công tơ.', 'error');
      return false;
    } finally {
      setSavingMeterId(null);
    }
  }, [buildMeterUpdate, dirtyMeterIds, showToast]);

  const saveDirtyMeters = useCallback(async (targetMeters) => {
    for (const meter of targetMeters) {
      const saved = await saveMeterReading(meter, { silent: true });
      if (!saved) return false;
    }
    return true;
  }, [saveMeterReading]);

  const handleSaveMeterReading = useCallback(async (meterId) => {
    const meter = meters.find(item => item.id === meterId);
    await saveMeterReading(meter);
  }, [meters, saveMeterReading]);

  const handleSaveMeter = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      id: editingMeter ? editingMeter.id : crypto.randomUUID(),
      houseId,
      type: fd.get('type'),
      name: fd.get('name'),
      oldVal: Number(fd.get('val')),
    };

    try {
      await api.post('/meter/save', payload);
      showToast(editingMeter ? 'Đã cập nhật công tơ!' : 'Đã tạo công tơ!', 'success');
      await loadHouseData(houseId);
      setIsAddMeterModalOpen(false);
      setEditingMeter(null);
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [editingMeter, houseId, loadHouseData, showToast]);

  const handleDeleteMeter = useCallback(async (meterId) => {
    const confirmed = await requestConfirm({
      title: 'Xóa công tơ',
      message: 'Bạn có chắc muốn xóa công tơ này?',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/meter/${meterId}`);
      await loadHouseData(houseId);
      setIsAddMeterModalOpen(false);
      setEditingMeter(null);
      showToast('Đã xóa công tơ', 'success');
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [houseId, loadHouseData, requestConfirm, showToast]);

  const handleSaveMeterMapping = useCallback(async () => {
    if (!mappingMeter) return;

    try {
      await api.put(`/meter/${mappingMeter.id}/map`, { roomIds: mappingMeter.roomIds });
      showToast('Đã cập nhật sơ đồ công tơ!', 'success');
      setMappingMeter(null);
    } catch (error) {
      showToast('Lỗi lưu sơ đồ: ' + error.message, 'error');
    }
  }, [mappingMeter, showToast]);

  const findPaidBill = useCallback(async (targetRooms, monthSelected, yearSelected) => {
    const roomKeys = new Set();
    targetRooms.forEach(room => {
      [room.id, room.roomCode, room.code, room.name].filter(Boolean).forEach(value => roomKeys.add(String(value)));
    });

    const billsResult = await api.get(`/bill/${houseId}?year=${yearSelected}&month=${monthSelected}`);
    const billsData = Array.isArray(billsResult) ? billsResult : (billsResult?.bills || []);
    return billsData.find(bill => isPaidStatus(bill.status) && roomKeys.has(getBillRoomKey(bill)));
  }, [houseId]);

  const generateBillsForRooms = useCallback(async (targetRooms, targetMeters) => {
    if (isSavingMeterReadings) return;

    try {
      setIsSavingMeterReadings(true);
      const monthSelected = viewDate.getMonth() + 1;
      const yearSelected = viewDate.getFullYear();

      const updatedMeters = targetMeters.filter(meter => hasValue(meter.newVal));

      if (updatedMeters.length === 0) {
        showToast('Chưa nhập số mới nào!', 'error');
        return;
      }

      const invalidMeter = updatedMeters.find(meter => (
        hasValue(meter.newVal)
        && hasValue(meter.oldVal)
        && parseN(String(meter.newVal)) < parseN(String(meter.oldVal))
      ));

      if (invalidMeter) {
        showToast('Có chỉ số mới nhỏ hơn chỉ số cũ!', 'error');
        return;
      }

      const touchedRooms = targetRooms.filter(room => (
        updatedMeters.some(meter => (meter.roomIds || []).map(String).includes(String(room.id)))
      ));

      if (touchedRooms.length === 0) {
        showToast('Các công tơ chưa được gắn với phòng nào, chưa thể lập hóa đơn.', 'error');
        return;
      }

      const paidBill = await findPaidBill(touchedRooms, monthSelected, yearSelected);
      if (paidBill) {
        const roomLabel = getBillRoomKey(paidBill) || 'này';
        showToast(`Hóa đơn phòng ${roomLabel} kỳ ${monthSelected}/${yearSelected} đã thanh toán, không thể lập lại hóa đơn trong kỳ này.`, 'error');
        return;
      }

      const confirmed = await requestConfirm({
        title: 'Lập hóa đơn',
        message: `Lập hóa đơn kỳ ${monthSelected}/${yearSelected} cho ${touchedRooms.length} phòng? Hóa đơn chưa thanh toán nếu đã tồn tại sẽ được cập nhật.`,
        confirmText: 'Lập HĐ',
        variant: 'primary',
      });
      if (!confirmed) return;

      const saved = await saveDirtyMeters(updatedMeters);
      if (!saved) return;

      const billResults = [];
      for (const room of touchedRooms) {
        const result = await api.post('/bill/generate', {
          houseId,
          roomId: room.id,
          month: monthSelected,
          year: yearSelected,
          overwrite: true,
        });
        billResults.push(result);
      }

      const generatedCount = billResults.reduce((sum, result) => sum + Number(result?.generatedCount ?? result?.count ?? 1), 0);
      showToast(`Đã lập hóa đơn cho ${touchedRooms.length || generatedCount || ''} phòng!`.replace('  ', ' '), 'success');
      await loadHouseData(houseId, 'meters_list');
      await loadHouseData(houseId, 'bills');
      await loadHouseData(houseId, 'dashboard');
    } catch (error) {
      showToast(error.message || 'Không lập được hóa đơn.', 'error');
    } finally {
      setIsSavingMeterReadings(false);
      setGeneratingRoomId(null);
    }
  }, [findPaidBill, houseId, isSavingMeterReadings, loadHouseData, requestConfirm, saveDirtyMeters, showToast, viewDate]);

  const handleGenerateBills = useCallback(async () => {
    await generateBillsForRooms(rooms, meters);
  }, [generateBillsForRooms, meters, rooms]);

  const handleGenerateBillForRoom = useCallback(async (roomId) => {
    const targetRoom = rooms.find(room => String(room.id) === String(roomId));
    if (!targetRoom) {
      showToast('Không tìm thấy phòng để lập hóa đơn.', 'error');
      return;
    }

    const roomMeters = meters.filter(meter => (meter.roomIds || []).map(String).includes(String(roomId)));
    setGeneratingRoomId(roomId);
    await generateBillsForRooms([targetRoom], roomMeters);
  }, [generateBillsForRooms, meters, rooms, showToast]);

  return {
    isAddMeterModalOpen,
    setIsAddMeterModalOpen,
    editingMeter,
    setEditingMeter,
    mappingMeter,
    setMappingMeter,
    isSavingMeterReadings,
    savingMeterId,
    generatingRoomId,
    handleUpdateOldMeterUI,
    handleUpdateMeterUI,
    handleSaveMeterReading,
    handleSaveMeter,
    handleDeleteMeter,
    handleSaveMeterMapping,
    handleGenerateBills,
    handleGenerateBillForRoom,
  };
};
