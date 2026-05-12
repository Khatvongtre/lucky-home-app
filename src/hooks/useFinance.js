import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { parseN } from '../utils/formatters';

export const useFinance = ({
  houseId,
  canManageTransactions,
  loadHouseData,
  showToast,
  requestConfirm,
}) => {
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [txType, setTxType] = useState('in');
  const [selectedCat, setSelectedCat] = useState('OTHER');
  const [isCatOpen, setIsCatOpen] = useState(false);

  const resetTransactionForm = useCallback(() => {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
    setTxType('in');
    setSelectedCat('OTHER');
    setIsCatOpen(false);
  }, []);

  const handleAddTx = useCallback(async (e) => {
    e.preventDefault();
    if (editingTransaction && !canManageTransactions) {
      showToast('Bạn không có quyền sửa phiếu thu chi.', 'error');
      return;
    }

    const fd = new FormData(e.target);
    const payload = {
      houseId,
      type: fd.get('type'),
      amount: parseN(fd.get('amount')),
      category: parseInt(fd.get('category')),
      note: fd.get('note'),
    };

    try {
      if (editingTransaction) {
        await api.put(`/transaction/${editingTransaction.id}`, payload);
        showToast('Đã cập nhật phiếu thu chi!', 'success');
      } else {
        payload.id = crypto.randomUUID();
        await api.post('/transaction', payload);
        showToast('Đã ghi sổ thu chi!', 'success');
      }
      await loadHouseData(houseId);
      resetTransactionForm();
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [canManageTransactions, editingTransaction, houseId, loadHouseData, resetTransactionForm, showToast]);

  const handleDeleteTransaction = useCallback(async (txId) => {
    if (!canManageTransactions) {
      showToast('Bạn không có quyền xóa phiếu thu chi.', 'error');
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Xóa phiếu thu chi',
      message: 'Bạn có chắc chắn muốn xóa phiếu thu chi này không?',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/transaction/${txId}`);
      await loadHouseData(houseId);
      resetTransactionForm();
      showToast('Đã xóa phiếu thu chi!', 'success');
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [canManageTransactions, houseId, loadHouseData, requestConfirm, resetTransactionForm, showToast]);

  return {
    isAddTransactionModalOpen,
    setIsAddTransactionModalOpen,
    editingTransaction,
    setEditingTransaction,
    txType,
    setTxType,
    selectedCat,
    setSelectedCat,
    isCatOpen,
    setIsCatOpen,
    resetTransactionForm,
    handleAddTx,
    handleDeleteTransaction,
  };
};
