import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { shareElementImage } from '../utils/imageExport';

const billBaseTotal = (details = {}) => (
  (details.rent || 0)
  + (details.elec || 0)
  + (details.heater || 0)
  + (details.water || 0)
  + (details.internet || 0)
  + (details.service || 0)
  + (details.ebikes || 0)
);

export const useBills = ({
  bills,
  setBills,
  bottomSheet,
  setBottomSheet,
  selectedHouse,
  loadHouseData,
  showToast,
  requestConfirm,
  setIsOverwriteModalOpen,
}) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const executeGenerateBills = useCallback(async () => {
    setIsOverwriteModalOpen(false);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      await api.post('/bill/generate', {
        houseId: selectedHouse?.id,
        month,
        year,
        overwrite: true,
      });
      await loadHouseData(selectedHouse?.id);
      showToast('Đã lập hóa đơn thành công!', 'success');
    } catch (error) {
      showToast(error.message || 'Không lập được hóa đơn.', 'error');
    }
  }, [loadHouseData, selectedHouse?.id, setIsOverwriteModalOpen, showToast]);

  const handleDiscountUpdate = useCallback(async (billId, discount) => {
    const targetBill = bills.find(bill => bill.id === billId);
    if (!targetBill) return;
    if ((targetBill.details.discount || 0) === discount) return;

    const newTotal = Math.max(0, billBaseTotal(targetBill.details) - discount);
    const updatedBillData = {
      ...targetBill,
      total: newTotal,
      details: { ...targetBill.details, discount },
    };

    setBills(prev => prev.map(bill => bill.id === billId ? updatedBillData : bill));
    if (bottomSheet && bottomSheet.data.id === billId) {
      setBottomSheet({ ...bottomSheet, data: updatedBillData });
    }

    try {
      await api.put(`/bill/${billId}/discount`, {
        discount,
        total: newTotal,
        details: updatedBillData.details,
      });
      await loadHouseData(selectedHouse?.id);
    } catch (error) {
      showToast('Đã có lỗi xảy ra ! (' + error.message + ')', 'error');
    }
  }, [bills, bottomSheet, loadHouseData, selectedHouse?.id, setBills, setBottomSheet, showToast]);

  const handlePayBill = useCallback(async (billId) => {
    try {
      await api.post(`/bill/pay/${billId}`);
      await loadHouseData(selectedHouse?.id);
      showToast('Gạch nợ & Ghi sổ thành công!', 'success');
      setBottomSheet(null);
    } catch (error) {
      showToast('Đã có lỗi xảy ra ! (' + error.message + ')', 'error');
      setBottomSheet(null);
    }
  }, [loadHouseData, selectedHouse?.id, setBottomSheet, showToast]);

  const handleDeleteBill = useCallback(async (billId) => {
    const confirmed = await requestConfirm({
      title: 'Xóa hóa đơn',
      message: 'Bạn có chắc chắn muốn xóa hóa đơn này không? Các chỉ số công tơ đã nhập sẽ không bị thay đổi.',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/bill/${billId}`);
      await loadHouseData(selectedHouse?.id);
      showToast('Đã xóa hóa đơn thành công!', 'success');
      setBottomSheet(null);
    } catch (error) {
      showToast('Lỗi xóa hóa đơn: ' + error.message, 'error');
    }
  }, [loadHouseData, requestConfirm, selectedHouse?.id, setBottomSheet, showToast]);

  const handleShareZaloImage = useCallback(async (billData) => {
    if (!billData) return;

    setIsGeneratingImage(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const roomLabel = billData.roomId || billData.roomCode || billData.id;
      const shareMode = await shareElementImage({
        elementId: `receipt-export-${billData.id}`,
        fileName: `hoa-don-phong-${roomLabel}.png`,
        title: `Hóa đơn phòng ${roomLabel}`,
        dialogTitle: 'Chia sẻ hóa đơn qua Zalo',
      });
      showToast(
        shareMode === 'clipboard' ? 'Đã copy ảnh hóa đơn vào clipboard.' : 'Đã mở chia sẻ. Chọn Zalo để gửi hóa đơn.',
        'success'
      );
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Lỗi khi xuất ảnh hóa đơn', 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [showToast]);

  return {
    isGeneratingImage,
    executeGenerateBills,
    handleDiscountUpdate,
    handlePayBill,
    handleDeleteBill,
    handleShareZaloImage,
  };
};
