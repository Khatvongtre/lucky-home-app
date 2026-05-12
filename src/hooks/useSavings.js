import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { parseN } from '../utils/formatters';

export const useSavings = ({ showToast, requestConfirm }) => {
  const [savings, setSavings] = useState([]);
  const [isAddSavingModalOpen, setIsAddSavingModalOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState(null);

  const loadSavings = useCallback(async () => {
    try {
      const savingsData = await api.get('/saving');
      setSavings(savingsData || []);
    } catch {
      setSavings([]);
    }
  }, []);

  const resetSavings = useCallback(() => {
    setSavings([]);
    setIsAddSavingModalOpen(false);
    setEditingSaving(null);
  }, []);

  const handleAddSaving = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      bankName: fd.get('bankName'),
      amount: parseN(fd.get('amount')),
      interestRate: Number(fd.get('interestRate')),
      termMonths: Number(fd.get('termMonths')),
      startDate: fd.get('startDate'),
      note: fd.get('note'),
    };

    try {
      if (editingSaving) {
        await api.put(`/saving/${editingSaving.id}`, payload);
        showToast('Đã cập nhật sổ tiết kiệm!', 'success');
      } else {
        payload.id = crypto.randomUUID();
        await api.post('/saving', payload);
        showToast('Đã thêm sổ tiết kiệm!', 'success');
      }
      await loadSavings();
      setIsAddSavingModalOpen(false);
      setEditingSaving(null);
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [editingSaving, loadSavings, showToast]);

  const handleDeleteSaving = useCallback(async (id) => {
    const confirmed = await requestConfirm({
      title: 'Xóa sổ tiết kiệm',
      message: 'Bạn có chắc chắn muốn xóa sổ tiết kiệm này? Dữ liệu đã xóa sẽ không thể khôi phục.',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/saving/${id}`);
      await loadSavings();
      setIsAddSavingModalOpen(false);
      setEditingSaving(null);
      showToast('Đã xóa sổ tiết kiệm', 'success');
    } catch (error) {
      showToast('Lỗi xóa: ' + error.message, 'error');
    }
  }, [loadSavings, requestConfirm, showToast]);

  return {
    savings,
    setSavings,
    isAddSavingModalOpen,
    setIsAddSavingModalOpen,
    editingSaving,
    setEditingSaving,
    loadSavings,
    resetSavings,
    handleAddSaving,
    handleDeleteSaving,
  };
};
