import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { parseN } from '../utils/formatters';

const isPaidStatus = (status) => ['paid', 'completed', 'done'].includes(String(status || '').toLowerCase());

const getBillRoomKey = (bill) => String(bill?.roomCode || bill?.roomId || '');

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
  const [dirtyMeterIds, setDirtyMeterIds] = useState(() => new Set());

  const handleUpdateOldMeterUI = useCallback((id, val) => {
    setMeters(prev => prev.map(meter => meter.id === id ? { ...meter, oldVal: val } : meter));
    setDirtyMeterIds(prev => new Set(prev).add(id));
  }, [setMeters]);

  const handleUpdateMeterUI = useCallback((id, val) => {
    setMeters(prev => prev.map(meter => meter.id === id ? { ...meter, newVal: val } : meter));
    setDirtyMeterIds(prev => new Set(prev).add(id));
  }, [setMeters]);

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

  const handleSaveMetersAndGenerateBills = useCallback(async () => {
    if (isSavingMeterReadings) return;

    try {
      setIsSavingMeterReadings(true);
      const monthSelected = viewDate.getMonth() + 1;
      const yearSelected = viewDate.getFullYear();

      const changedMeterIds = dirtyMeterIds.size > 0 ? dirtyMeterIds : new Set();
      const updatedMeters = meters
        .filter(meter => changedMeterIds.size === 0 || changedMeterIds.has(meter.id))
        .filter(meter => meter.newVal !== null && meter.newVal !== '' && meter.newVal !== undefined);

      const updates = updatedMeters
        .map(meter => ({
          id: meter.id,
          houseId: meter.houseId,
          name: meter.name,
          type: meter.type,
          oldVal: parseN(String(meter.oldVal)),
          newVal: parseN(String(meter.newVal)),
          roomIdsJson: JSON.stringify(meter.roomIds || []),
          year: yearSelected,
          month: monthSelected,
        }));

      if (updates.length === 0) {
        showToast('Chưa nhập số mới nào!', 'error');
        return;
      }

      const invalidMeter = updatedMeters.find(meter => (
        meter.newVal !== null
        && meter.newVal !== ''
        && meter.newVal !== undefined
        && parseN(String(meter.newVal)) < parseN(String(meter.oldVal))
      ));

      if (invalidMeter) {
        showToast('Có chỉ số mới nhỏ hơn chỉ số cũ!', 'error');
        return;
      }

      const touchedRoomIds = new Set(updatedMeters.flatMap(meter => (meter.roomIds || []).map(String)));
      const touchedRoomKeys = new Set();
      rooms.forEach(room => {
        if (!touchedRoomIds.has(String(room.id))) return;
        [room.id, room.roomCode, room.code, room.name].filter(Boolean).forEach(value => touchedRoomKeys.add(String(value)));
      });
      touchedRoomIds.forEach(value => touchedRoomKeys.add(String(value)));

      const touchedRooms = rooms.filter(room => touchedRoomIds.has(String(room.id)));
      if (touchedRooms.length === 0) {
        showToast('Các công tơ vừa sửa chưa được gắn với phòng nào, chưa thể lập hóa đơn.', 'error');
        return;
      }

      const billsResult = await api.get(`/bill/${houseId}?year=${yearSelected}&month=${monthSelected}`);
      const billsData = Array.isArray(billsResult) ? billsResult : (billsResult?.bills || []);
      const paidBill = billsData.find(bill => isPaidStatus(bill.status) && touchedRoomKeys.has(getBillRoomKey(bill)));

      if (paidBill) {
        const roomLabel = getBillRoomKey(paidBill) || 'này';
        showToast(`Hóa đơn phòng ${roomLabel} kỳ ${monthSelected}/${yearSelected} đã thanh toán, không thể cập nhật chỉ số trong kỳ này.`, 'error');
        return;
      }

      await api.post('/meter/update', updates);

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
      showToast(`Đã lưu chỉ số & lập hóa đơn cho ${touchedRooms.length || generatedCount || ''} phòng!`.replace('  ', ' '), 'success');
      setDirtyMeterIds(new Set());
      await loadHouseData(houseId, 'meters_list');
      await loadHouseData(houseId, 'bills');
      await loadHouseData(houseId, 'dashboard');
    } catch (error) {
      showToast(error.message || 'Không lưu được chỉ số công tơ.', 'error');
    } finally {
      setIsSavingMeterReadings(false);
    }
  }, [dirtyMeterIds, houseId, isSavingMeterReadings, loadHouseData, meters, rooms, showToast, viewDate]);

  return {
    isAddMeterModalOpen,
    setIsAddMeterModalOpen,
    editingMeter,
    setEditingMeter,
    mappingMeter,
    setMappingMeter,
    isSavingMeterReadings,
    handleUpdateOldMeterUI,
    handleUpdateMeterUI,
    handleSaveMeter,
    handleDeleteMeter,
    handleSaveMeterMapping,
    handleSaveMetersAndGenerateBills,
  };
};
