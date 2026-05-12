import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { parseN } from '../utils/formatters';

const getContractEnd = (start, months) => {
  try {
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);
    return endDate.toISOString().split('T')[0];
  } catch {
    return start;
  }
};

export const useRooms = ({
  houseId,
  loadHouseData,
  showToast,
  requestConfirm,
}) => {
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const handleAddRoom = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const start = fd.get('start');
    const months = Number(fd.get('months'));

    const payload = {
      id: editingRoom ? editingRoom.id : crypto.randomUUID(),
      houseId,
      roomCode: fd.get('rid'),
      roomType: fd.get('roomType') || 'room',
      monthlyFee: parseN(fd.get('monthlyFee') || '0'),
      price: parseN(fd.get('price')),
      peopleCount: Number(fd.get('people')),
      people: Number(fd.get('people')),
      eBikeCount: Number(fd.get('ebikes')),
      eBikes: Number(fd.get('ebikes')),
      status: fd.get('status'),
      contractStart: start,
      contractEnd: getContractEnd(start, months),
      months,
      paymentDate: Number(fd.get('payDay')),
      heaterMeterId: fd.get('heaterType') === 'shared' ? fd.get('heaterMeterId') : null,
    };

    try {
      await api.post('/room', payload);
      await loadHouseData(houseId);
      showToast('Lưu phòng thành thành công!', 'success');
      setIsAddRoomModalOpen(false);
      setEditingRoom(null);
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [editingRoom, houseId, loadHouseData, showToast]);

  const handleDeleteRoom = useCallback(async (roomId, roomCode) => {
    const confirmed = await requestConfirm({
      title: 'Xóa phòng',
      message: `Bạn có chắc muốn xóa phòng/MBKD "${roomCode}" không?`,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/room/${roomId}`);
      await loadHouseData(houseId);
      setIsAddRoomModalOpen(false);
      setEditingRoom(null);
      showToast('Đã xóa phòng thành công!', 'success');
    } catch (error) {
      showToast('Lỗi xóa phòng: ' + error.message, 'error');
    }
  }, [houseId, loadHouseData, requestConfirm, showToast]);

  return {
    isAddRoomModalOpen,
    setIsAddRoomModalOpen,
    editingRoom,
    setEditingRoom,
    handleAddRoom,
    handleDeleteRoom,
  };
};
