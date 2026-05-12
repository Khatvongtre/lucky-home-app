import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { parseN } from '../utils/formatters';

export const useMeters = ({
  meters,
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

  const handleUpdateOldMeterUI = useCallback((id, val) => {
    setMeters(prev => prev.map(meter => meter.id === id ? { ...meter, oldVal: val } : meter));
  }, [setMeters]);

  const handleUpdateMeterUI = useCallback((id, val) => {
    setMeters(prev => prev.map(meter => meter.id === id ? { ...meter, newVal: val } : meter));
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
    try {
      const monthSelected = viewDate.getMonth() + 1;
      const yearSelected = viewDate.getFullYear();

      const updates = meters
        .filter(meter => meter.newVal !== null && meter.newVal !== '' && meter.newVal !== undefined)
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

      await api.post('/meter/update', updates);
      const res = await api.post('/bill/generate', {
        houseId,
        month: monthSelected,
        year: yearSelected,
        overwrite: true,
      });

      showToast(`Đã lưu chỉ số & tự động lập ${res.generatedCount} hóa đơn!`, 'success');
      await loadHouseData(houseId);
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [houseId, loadHouseData, meters, showToast, viewDate]);

  return {
    isAddMeterModalOpen,
    setIsAddMeterModalOpen,
    editingMeter,
    setEditingMeter,
    mappingMeter,
    setMappingMeter,
    handleUpdateOldMeterUI,
    handleUpdateMeterUI,
    handleSaveMeter,
    handleDeleteMeter,
    handleSaveMeterMapping,
    handleSaveMetersAndGenerateBills,
  };
};
