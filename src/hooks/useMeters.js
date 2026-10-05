import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { isActiveMeter } from '../utils/meters';

const isPaidStatus = (status) => ['paid', 'completed', 'done'].includes(String(status || '').toLowerCase());

const getBillRoomKey = (bill) => String(bill?.roomCode || bill?.roomId || '');

const hasValue = (value) => value !== null && value !== '' && value !== undefined;
const toMeterReading = value => Number(value);
const isValidMeterReading = value => Number.isInteger(toMeterReading(value)) && toMeterReading(value) >= 0;

export const useMeters = ({
  meters,
  rooms = [],
  setMeters,
  houseId,
  config,
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
      status: meter.status || 'active',
      oldVal: hasValue(meter.oldVal) ? toMeterReading(meter.oldVal) : null,
      newVal: hasValue(meter.newVal) ? toMeterReading(meter.newVal) : null,
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

    if ((hasValue(meter.oldVal) && !isValidMeterReading(meter.oldVal))
      || (hasValue(meter.newVal) && !isValidMeterReading(meter.newVal))) {
      showToast('Chỉ số công tơ phải là số nguyên không âm.', 'error');
      return false;
    }

    if (hasValue(meter.oldVal) && hasValue(meter.newVal) && toMeterReading(meter.newVal) < toMeterReading(meter.oldVal)) {
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
      status: fd.get('status') || editingMeter?.status || 'active',
    };

    if (!['electric', 'water', 'heater'].includes(payload.type)) {
      showToast('Loại công tơ không hợp lệ.', 'error');
      return;
    }
    if (!Number.isInteger(payload.oldVal) || payload.oldVal < 0) {
      showToast('Chỉ số đầu phải là số nguyên không âm.', 'error');
      return;
    }

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
      title: 'Ngừng sử dụng công tơ',
      message: 'Công tơ sẽ chuyển sang tạm ngưng; lịch sử chỉ số vẫn được giữ lại.',
    });
    if (!confirmed) return;

    try {
      const meter = meters.find(item => String(item.id) === String(meterId));
      if (!meter) throw new Error('Không tìm thấy công tơ.');
      await api.post('/meter/save', {
        ...meter,
        status: 'suspended',
        roomIdsJson: JSON.stringify(meter.roomIds || []),
      });
      await loadHouseData(houseId);
      setIsAddMeterModalOpen(false);
      setEditingMeter(null);
      showToast('Đã tạm ngưng công tơ, lịch sử được giữ lại.', 'success');
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [houseId, loadHouseData, meters, requestConfirm, showToast]);

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
        && toMeterReading(meter.newVal) < toMeterReading(meter.oldVal)
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

      const waterCalcMethod = String(config?.waterCalcMethod || 'person').toLowerCase();
      if (waterCalcMethod === 'm3') {
        const invalidWaterRoom = touchedRooms.find(room => {
          const waterMeter = targetMeters.find(meter => (
            meter.type === 'water'
            && isActiveMeter(meter)
            && (meter.roomIds || []).map(String).includes(String(room.id))
          ));
          return !waterMeter || !hasValue(waterMeter.oldVal) || !hasValue(waterMeter.newVal);
        });

        if (invalidWaterRoom) {
          const roomLabel = invalidWaterRoom.roomCode || invalidWaterRoom.code || invalidWaterRoom.name || invalidWaterRoom.id;
          showToast(`Phòng ${roomLabel} thiếu công tơ nước hoạt động hoặc chỉ số nước.`, 'error');
          return;
        }
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
  }, [config?.waterCalcMethod, findPaidBill, houseId, isSavingMeterReadings, loadHouseData, requestConfirm, saveDirtyMeters, showToast, viewDate]);

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
