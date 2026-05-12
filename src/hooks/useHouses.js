import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { parseN } from '../utils/formatters';

const buildHousePayload = (form) => ({
  name: form.get('name'),
  address: form.get('address'),
  rentPrice: parseN(form.get('rentPrice')),
  startDate: form.get('startDate'),
  leaseTerm: Number(form.get('leaseTerm')),
  deposit: parseN(form.get('deposit')),
  paymentPeriod: Number(form.get('paymentPeriod')),
  paymentDay: Number(form.get('paymentDay')),
  internetFee: parseN(form.get('internetFee')),
  otherFees: parseN(form.get('otherFees')),
  notes: form.get('notes'),
});

export const useHouses = ({
  selectedHouseId,
  setSelectedHouse,
  setHouses,
  showToast,
  requestConfirm,
}) => {
  const [isAiCreateHouseOpen, setIsAiCreateHouseOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState(null);
  const [isAiPromptModalOpen, setIsAiPromptModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingHouse, setSharingHouse] = useState(null);
  const [assignForm, setAssignForm] = useState({ username: '', role: 'Manager' });

  const handleOpenShare = useCallback((e, house) => {
    e.stopPropagation();
    setSharingHouse(house);
    setAssignForm({ username: '', role: 'Manager' });
    setIsShareModalOpen(true);
  }, []);

  const handleAssignRole = useCallback(async (e) => {
    e.preventDefault();
    try {
      await api.post(`/house/${sharingHouse.id}/assign`, assignForm);
      showToast(`Đã cấp quyền ${assignForm.role} cho ${assignForm.username} thành công!`, 'success');
      setIsShareModalOpen(false);
    } catch (error) {
      showToast(error.message || 'Lỗi cấp quyền. Kiểm tra lại tài khoản.', 'error');
    }
  }, [assignForm, sharingHouse, showToast]);

  const handleAddHouse = useCallback(async (e) => {
    e.preventDefault();
    const houseData = buildHousePayload(new FormData(e.target));

    try {
      if (editingHouse) {
        await api.put(`/house/${editingHouse.id}`, houseData);
        showToast('Cập nhật cơ sở thành công!', 'success');
      } else {
        await api.post('/house', houseData);
        showToast('Tạo cơ sở thành công!', 'success');
      }
      const data = await api.get('/house');
      setHouses(data || []);
      setIsAiCreateHouseOpen(false);
      setEditingHouse(null);
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  }, [editingHouse, setHouses, showToast]);

  const handleDeleteHouse = useCallback(async (houseId, houseName) => {
    const confirmed = await requestConfirm({
      title: 'Xóa cơ sở',
      message: `Bạn có chắc chắn muốn xóa cơ sở "${houseName}" và TOÀN BỘ dữ liệu liên quan không?`,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/house/${houseId}`);
      setHouses(prev => prev.filter(house => house.id !== houseId));
      if (selectedHouseId === houseId) setSelectedHouse(null);
      showToast('Đã xóa cơ sở thành công!', 'success');
    } catch (error) {
      showToast('Lỗi xóa: ' + error.message, 'error');
    }
  }, [requestConfirm, selectedHouseId, setHouses, setSelectedHouse, showToast]);

  const handleAiGenerateHouse = useCallback(async () => {
    if (!aiPrompt.trim()) {
      showToast('Vui lòng nhập mô tả hoặc chọn mẫu!', 'error');
      return;
    }

    showToast('AI đang xử lý... vui lòng đợi!', 'success');
    try {
      const res = await api.post('/house/ai-generate', { prompt: aiPrompt });
      if (res.isSuccess === false) {
        setAiFeedback(res.message);
        showToast('AI cần thêm thông tin!', 'error');
      } else {
        const updatedHouses = await api.get('/house');
        setHouses(updatedHouses || []);
        showToast('Phép màu đã xảy ra! Nhà đã được tạo.', 'success');
        setIsAiPromptModalOpen(false);
        setAiPrompt('');
        setAiFeedback('');
      }
    } catch (error) {
      showToast('Lỗi khi tạo AI: ' + error.message, 'error');
    }
  }, [aiPrompt, setHouses, showToast]);

  const handleMicClick = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.onstart = () => {
      setIsListening(true);
      showToast('Đang nghe... Hãy nói gì đó', 'success');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAiPrompt(prev => prev ? prev + ' ' + transcript : transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Lỗi Mic:', event.error);
      setIsListening(false);
      showToast('Lỗi nhận diện giọng nói hoặc chưa cấp quyền Mic', 'error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  }, [isListening, showToast]);

  return {
    isAiCreateHouseOpen,
    setIsAiCreateHouseOpen,
    editingHouse,
    setEditingHouse,
    isAiPromptModalOpen,
    setIsAiPromptModalOpen,
    aiPrompt,
    setAiPrompt,
    isListening,
    setIsListening,
    aiFeedback,
    setAiFeedback,
    isShareModalOpen,
    setIsShareModalOpen,
    sharingHouse,
    setSharingHouse,
    assignForm,
    setAssignForm,
    handleOpenShare,
    handleAssignRole,
    handleAddHouse,
    handleDeleteHouse,
    handleAiGenerateHouse,
    handleMicClick,
  };
};
