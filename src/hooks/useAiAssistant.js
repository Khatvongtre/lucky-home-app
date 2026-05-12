import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { INITIAL_AI_MESSAGES } from '../utils/aiChat';

const HOUSE_REQUIRED_ACTIONS = ['METER_INPUT', 'ADD_ROOM', 'ADD_TRANSACTION', 'VIEW_BILLS'];

const uniqueActions = (actions) =>
  actions.filter((action, index, allActions) => allActions.findIndex(item => item.code === action.code) === index);

const inferActions = (text, responseText) => {
  const checkText = `${text} ${responseText || ''}`.toLowerCase();
  const actions = [];

  if (checkText.includes('thêm nhà') || checkText.includes('tạo nhà') || checkText.includes('thêm cơ sở')) {
    actions.push({ code: 'ADD_HOUSE', label: 'Thêm cơ sở mới' });
  }
  if (checkText.includes('tiết kiệm') || checkText.includes('thêm sổ')) {
    actions.push({ code: 'ADD_SAVING', label: 'Thêm sổ tiết kiệm' });
  }
  if (checkText.includes('chốt điện') || checkText.includes('chốt số') || checkText.includes('nhập số điện') || checkText.includes('ghi điện')) {
    actions.push({ code: 'METER_INPUT', label: 'Chốt số điện/nước' });
  }
  if (checkText.includes('thêm phòng') || checkText.includes('tạo phòng')) {
    actions.push({ code: 'ADD_ROOM', label: 'Thêm phòng mới' });
  }
  if (checkText.includes('thu chi') || checkText.includes('chi tiêu') || checkText.includes('nạp tiền') || checkText.includes('khoản chi') || checkText.includes('giao dịch')) {
    actions.push({ code: 'ADD_TRANSACTION', label: 'Ghi sổ thu chi' });
  }
  if (checkText.includes('siêu tốc') || checkText.includes('ai nhập')) {
    actions.push({ code: 'FAST_INPUT', label: 'Nhập siêu tốc AI' });
  }
  if (checkText.includes('hóa đơn') || checkText.includes('xem hóa đơn')) {
    actions.push({ code: 'VIEW_BILLS', label: 'Quản lý hóa đơn' });
  }
  if (checkText.includes('sổ quỹ') || checkText.includes('xem quỹ')) {
    actions.push({ code: 'VIEW_FUNDS', label: 'Xem sổ quỹ' });
  }

  return actions;
};

export const useAiAssistant = ({
  houseId,
  showToast,
  setActiveTab,
  setEditingHouse,
  setIsAiCreateHouseOpen,
  setEditingSaving,
  setIsAddSavingModalOpen,
  setEditingRoom,
  setIsAddRoomModalOpen,
  setEditingTransaction,
  setIsAddTransactionModalOpen,
}) => {
  const [aiMessages, setAiMessages] = useState(INITIAL_AI_MESSAGES);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionToSelectHouse, setActionToSelectHouse] = useState(null);

  const resetAiMessages = useCallback(() => {
    setAiMessages(INITIAL_AI_MESSAGES);
    setIsAiLoading(false);
    setPendingAction(null);
    setActionToSelectHouse(null);
  }, []);

  const runAction = useCallback((actionType) => {
    switch (actionType) {
      case 'ADD_HOUSE':
        setEditingHouse(null);
        setIsAiCreateHouseOpen(true);
        break;
      case 'ADD_SAVING':
        setActiveTab('savings');
        setEditingSaving(null);
        setIsAddSavingModalOpen(true);
        break;
      case 'METER_INPUT':
        setActiveTab('meters_list');
        break;
      case 'ADD_ROOM':
        setActiveTab('rooms');
        setEditingRoom(null);
        setIsAddRoomModalOpen(true);
        break;
      case 'ADD_TRANSACTION':
        setActiveTab('finance');
        setEditingTransaction(null);
        setIsAddTransactionModalOpen(true);
        break;
      case 'FAST_INPUT':
        setActiveTab('fast_input');
        break;
      case 'VIEW_BILLS':
        setActiveTab('bills');
        break;
      case 'VIEW_FUNDS':
        setActiveTab('fund');
        break;
      default:
        break;
    }
  }, [
    setActiveTab,
    setEditingHouse,
    setEditingRoom,
    setEditingSaving,
    setEditingTransaction,
    setIsAddRoomModalOpen,
    setIsAddSavingModalOpen,
    setIsAddTransactionModalOpen,
    setIsAiCreateHouseOpen,
  ]);

  const executeAiAction = useCallback((actionType) => {
    if (HOUSE_REQUIRED_ACTIONS.includes(actionType) && !houseId) {
      setActionToSelectHouse(actionType);
      return;
    }
    runAction(actionType);
  }, [houseId, runAction]);

  useEffect(() => {
    if (!houseId || !pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);
    const timer = setTimeout(() => runAction(action), 50);
    return () => clearTimeout(timer);
  }, [houseId, pendingAction, runAction]);

  const handleAiChat = useCallback(async (text, imageBase64 = null) => {
    if (!text?.trim() && !imageBase64) return;

    setAiMessages(prev => [...prev, { role: 'user', text, image: imageBase64 }]);
    setIsAiLoading(true);

    try {
      const res = await api.post('/ai/chat', { houseId, prompt: text, imageBase64 });
      const responseActions = res.actions?.length ? [...res.actions] : inferActions(text, res.text);
      setAiMessages(prev => [...prev, { role: 'assistant', text: res.text, actions: uniqueActions(responseActions) }]);
    } catch (error) {
      showToast('Lỗi kết nối AI Server', 'error');
      setAiMessages(prev => [...prev, { role: 'assistant', text: 'Lỗi Server AI: ' + error.message }]);
    } finally {
      setIsAiLoading(false);
    }
  }, [houseId, showToast]);

  return {
    aiMessages,
    setAiMessages,
    isAiLoading,
    actionToSelectHouse,
    setActionToSelectHouse,
    setPendingAction,
    resetAiMessages,
    executeAiAction,
    handleAiChat,
  };
};
