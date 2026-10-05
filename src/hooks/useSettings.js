import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';
import { parseVietQR, getBankNameFromBin } from '../utils/qr';
import { readQRFromFile } from '../utils/qrReader';

export const useSettings = ({ houseId, selectedHouse, setSelectedHouse, setConfig, config, showToast, requestConfirm, loadHouses }) => {
  const qrFileRef = useRef(null);
  const [isScanningQR, setIsScanningQR] = useState(false);

  const handleSaveConfig = useCallback(async () => {
    try {
      const previousMethod = String(selectedHouse?.waterCalcMethod || 'person').toLowerCase();
      const nextMethod = String(config?.waterCalcMethod || 'person').toLowerCase();
      let preview = null;

      if (previousMethod !== nextMethod && nextMethod === 'm3') {
        preview = await api.get(`/house/${houseId}/water-meters/preview`);
        const missingCount = Number(preview?.missingCount ?? preview?.roomsMissingMeter ?? preview?.missingRooms?.length ?? 0);
        const suspendedCount = Number(preview?.suspendedCount ?? preview?.roomsWithSuspendedMeter ?? 0);
        const confirmed = await requestConfirm({
          title: 'Chuyển sang tính nước theo m³',
          message: `Hệ thống sẽ tạo công tơ nước cho ${missingCount} phòng chưa có công tơ${suspendedCount ? ` và kích hoạt lại ${suspendedCount} công tơ` : ''}. Tiếp tục?`,
          confirmText: 'Xác nhận',
          variant: 'primary',
        });
        if (!confirmed) return;
      }

      if (previousMethod !== nextMethod && nextMethod === 'person') {
        const confirmed = await requestConfirm({
          title: 'Tính nước theo đầu người',
          message: 'Công tơ nước và toàn bộ lịch sử chỉ số sẽ được giữ lại.',
          confirmText: 'Xác nhận',
        });
        if (!confirmed) return;
      }

      let provisioned = null;
      if (previousMethod !== nextMethod && nextMethod === 'm3') {
        provisioned = await api.post(`/house/${houseId}/water-meters/ensure`, {
          effectiveFrom: config.waterMethodEffectiveFrom || null,
        });
      }

      await api.put(`/house/${houseId}/config`, config);

      if (previousMethod !== nextMethod && nextMethod === 'm3') {
        const created = Number(provisioned?.createdCount ?? provisioned?.created ?? preview?.missingCount ?? 0);
        const reactivated = Number(provisioned?.reactivatedCount ?? provisioned?.reactivated ?? 0);
        showToast(`Đã lưu cấu hình, tạo ${created} và kích hoạt lại ${reactivated} công tơ nước. Hãy nhập chỉ số đầu.`, 'success');
      } else {
        showToast('Đã lưu cấu hình lên máy chủ!', 'success');
      }
      const refreshedHouses = await loadHouses?.();
      const refreshedHouse = refreshedHouses?.find(house => String(house.id) === String(houseId));
      setSelectedHouse?.(refreshedHouse || (selectedHouse ? { ...selectedHouse, ...config } : selectedHouse));
    } catch (error) {
      showToast('Đã có lỗi xảy ra ! (' + error.message + ')', 'error');
    }
  }, [config, houseId, loadHouses, requestConfirm, selectedHouse, setSelectedHouse, showToast]);

  const handleUploadQR = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningQR(true);
    try {
      const qrData = await readQRFromFile(file);
      const { bin, acc } = parseVietQR(qrData);
      if (bin && acc) {
        setConfig(prev => ({ ...prev, bankBin: bin, bankAcc: acc, bankName: getBankNameFromBin(bin) }));
        showToast('Tuyệt vời! Đã nhận diện thành công mã VietQR.', 'success');
      } else {
        showToast('QR không đúng chuẩn VietQR hoặc không có số tài khoản.', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsScanningQR(false);
    }
    e.target.value = null;
  }, [setConfig, showToast]);

  return {
    qrFileRef,
    isScanningQR,
    handleSaveConfig,
    handleUploadQR,
  };
};
