import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { shareElementImage } from '../utils/imageExport';
import { applyBillAdjustments, buildBillUpdatePayload, extractBillFromResponse, isRefundBill } from '../utils/bills';

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

  const handleBillUpdate = useCallback(async (billId, adjustments) => {
    const targetBill = bills.find(bill => bill.id === billId);
    if (!targetBill) return false;
    const updatedBillData = applyBillAdjustments(targetBill, adjustments);
    if (
      Number(targetBill.details?.discount || 0) === updatedBillData.details.discount
      && Number(targetBill.details?.additionalCost || 0) === updatedBillData.details.additionalCost
      && JSON.stringify(targetBill.details?.waivedItems || []) === JSON.stringify(updatedBillData.details.waivedItems)
    ) return true;

    setBills(prev => prev.map(bill => bill.id === billId ? updatedBillData : bill));
    if (bottomSheet && bottomSheet.data.id === billId) {
      setBottomSheet({ ...bottomSheet, data: updatedBillData });
    }

    try {
      const response = await api.put(`/bill/${billId}`, buildBillUpdatePayload(updatedBillData));
      const savedBill = extractBillFromResponse(response, updatedBillData);
      setBills(prev => prev.map(bill => bill.id === billId ? savedBill : bill));
      if (bottomSheet?.data?.id === billId) {
        setBottomSheet({ ...bottomSheet, data: savedBill });
      }
      return true;
    } catch (error) {
      setBills(prev => prev.map(bill => bill.id === billId ? targetBill : bill));
      if (bottomSheet?.data?.id === billId) {
        setBottomSheet({ ...bottomSheet, data: targetBill });
      }
      await loadHouseData(selectedHouse?.id);
      showToast('Đã có lỗi xảy ra ! (' + error.message + ')', 'error');
      return false;
    }
  }, [bills, bottomSheet, loadHouseData, selectedHouse?.id, setBills, setBottomSheet, showToast]);

  const handlePayBill = useCallback(async (billId) => {
    const targetBill = bills.find(bill => bill.id === billId);
    try {
      const response = await api.post(`/bill/pay/${billId}`);
      const paidBill = extractBillFromResponse(response, targetBill);
      const isRefund = isRefundBill(paidBill);
      setBills(prev => prev.map(bill => bill.id === billId ? paidBill : bill));
      showToast(isRefund ? 'Đã xác nhận trả cọc & ghi phiếu chi!' : 'Gạch nợ & ghi sổ thành công!', 'success');
      setBottomSheet(null);
    } catch (error) {
      showToast('Đã có lỗi xảy ra ! (' + error.message + ')', 'error');
    }
  }, [bills, setBills, setBottomSheet, showToast]);

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
    handleBillUpdate,
    handlePayBill,
    handleDeleteBill,
    handleShareZaloImage,
  };
};
