import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';
import { parseVietQR, getBankNameFromBin } from '../utils/qr';
import { readQRFromFile } from '../utils/qrReader';

export const useSettings = ({ houseId, setConfig, config, showToast }) => {
  const qrFileRef = useRef(null);
  const [isScanningQR, setIsScanningQR] = useState(false);

  const handleSaveConfig = useCallback(async () => {
    try {
      await api.put(`/house/${houseId}/config`, config);
      showToast('Đã lưu cấu hình lên máy chủ!', 'success');
    } catch (error) {
      showToast('Đã có lỗi xảy ra ! (' + error.message + ')', 'error');
    }
  }, [config, houseId, showToast]);

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
