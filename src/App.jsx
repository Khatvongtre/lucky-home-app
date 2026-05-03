import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Home, Zap, Wallet, Plus,
  TrendingUp, ChevronRight, Sparkles, Send,
  X, Receipt, Building2, QrCode, MapPin, Users2,
  Lock, LogOut, ShieldCheck, User, CheckCircle2, ArrowRight,
  PlusCircle, Save, Settings, FileText, UserCheck, CircleDollarSign,
  Activity, Wifi, Boxes, Search, MoreHorizontal, Droplets, Bike, ChevronLeft,
  Upload, Mail, Mic, MicOff, CreditCard, Calendar, Image as ImageIcon, Pencil, Loader2, AlertCircle,
  ChevronDown, Check, LucideEdit, Flame, AlertTriangle, Share2,
  Edit, Trash2, ZapOff, PiggyBank, Landmark, Bell, Target, PieChart
} from 'lucide-react';

import { toPng } from 'html-to-image';
import { domToCanvas } from 'modern-screenshot';
import jsQR from 'jsqr';

// --- Tách Component & Utils (Giai đoạn 1 & 2) ---
import { TRANSACTION_CATEGORIES } from './utils/constants';
import { formatN, parseN } from './utils/formatters';
import { diffDays, getDueInfo, endContract, getSafeDate } from './utils/date';
import { parseVietQR, getBankNameFromBin } from './utils/qr';
import Modal from './components/common/Modal';
import ToastNotification from './components/common/Toast';
import ConfirmDialog from './components/common/ConfirmDialog';
import AuthView from './pages/AuthView';
import HubView from './pages/HubView';
import DashboardPage from './pages/DashboardPage';
import RoomsPage from './pages/RoomsPage';
import BillsPage from './pages/BillsPage';
import MetersPage from './pages/MetersPage';
import FinancePage from './pages/FinancePage';
import SavingsPage from './pages/SavingsPage';
import AiChatPage from './pages/AiChatPage';
import ProfilePage from './pages/ProfilePage';
import AddRoomForm from './components/rooms/AddRoomForm';
import AddMeterForm from './components/meters/AddMeterForm';
import AddSavingForm from './components/savings/AddSavingForm';
import AddTransactionForm from './components/finance/AddTransactionForm';
import BillReceipt from './components/bills/BillReceipt';
import AddHouseForm from './components/houses/AddHouseForm';
import Header from './components/layout/Header';
import TabBar from './components/layout/TabBar';
import QuickMenu from './components/layout/QuickMenu';
import AiPromptModal from './components/houses/AiPromptModal';
import ShareHouseModal from './components/houses/ShareHouseModal';
import OverwriteBillModal from './components/bills/OverwriteBillModal';
import MeterMappingModal from './components/meters/MeterMappingModal';

// ==========================================
// CẤU HÌNH API BACKEND (.NET 8)
// ==========================================
const API_URL = import.meta.env.VITE_API_URL;
console.log("API URL:", API_URL);

// ==========================================
// ỨNG DỤNG CHÍNH
// ==========================================
const App = () => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [changePasswordForm, setChangePasswordForm] = useState({ oldPassword: '', newPassword: '' });

  // --- App State ---
  const [isHubMode, setIsHubMode] = useState(true); // NEW: Manage global HUB screen visibility
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const toastTimer = useRef(null);
  const confirmResolveRef = useRef(null);

  // --- Modals State ---
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isAddMeterModalOpen, setIsAddMeterModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState(null);
  const [mappingMeter, setMappingMeter] = useState(null);
  const [bottomSheet, setBottomSheet] = useState(null);
  const [isAiCreateHouseOpen, setIsAiCreateHouseOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState(null);
  const [houseSearchQuery, setHouseSearchQuery] = useState("");
  const [isAiPromptModalOpen, setIsAiPromptModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [savings, setSavings] = useState([]);
  const [isAddSavingModalOpen, setIsAddSavingModalOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState(null);
  const [sharingHouse, setSharingHouse] = useState(null);
  const [assignForm, setAssignForm] = useState({ username: '', role: 'Manager' });
  const [selectedStatsHouses, setSelectedStatsHouses] = useState([]);
  const [unselectedSavingsBanks, setUnselectedSavingsBanks] = useState([]);
  const [collapsedSavingsBanks, setCollapsedSavingsBanks] = useState([]);
  const [settingsExpanded, setSettingsExpanded] = useState({ services: true, qr: false, pass: false });

  // --- Real Data State ---
  const [houses, setHouses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [meters, setMeters] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [billStats, setBillStats] = useState({ totalRooms: 0, totalBillPaids: 0, totalBillNotPaids: 0, totalAmountPaids: 0 });
  const [config, setConfig] = useState({});
  const [aiMessages, setAiMessages] = useState([{ role: 'assistant', text: 'Chào bạn! Tôi là trợ lý AI. Hệ thống đang sẵn sàng.' }]);

  // --- OTHER
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  // --- A. STATE QUẢN LÝ ---
  const [viewDate, setViewDate] = useState(new Date());
  const [txType, setTxType] = useState('in');
  const [selectedCat, setSelectedCat] = useState('OTHER');
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('this-month');
  const [isFinanceStatsOpen, setIsFinanceStatsOpen] = useState(true);
  const [isSavingsStatsOpen, setIsSavingsStatsOpen] = useState(true);

  const showToast = useCallback((text, type = 'success') => {
    setToast({ text: String(text), type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const requestConfirm = useCallback((dialog) => {
    return new Promise(resolve => {
      confirmResolveRef.current = resolve;
      setConfirmDialog(dialog);
    });
  }, []);

  const closeConfirmDialog = useCallback((confirmed) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(confirmed);
      confirmResolveRef.current = null;
    }
    setConfirmDialog(null);
  }, []);

  const currentRole = selectedHouse?.userRole;
  const effectiveRole = currentRole || user?.role;
  const isOwnerOrAdmin = ['SuperAdmin', 'Owner'].includes(currentRole) || user?.role === 'Owner';
  const isManagerOrAbove = ['SuperAdmin', 'Owner', 'Manager'].includes(currentRole) || user?.role === 'Owner';
  const canAccessFinance = ['SuperAdmin', 'Owner', 'Manager', 'Staff'].includes(effectiveRole) || user?.role === 'Owner';
  const canViewProfit = ['SuperAdmin', 'Owner', 'Manager'].includes(effectiveRole) || user?.role === 'Owner';
  const canManageTransactions = ['SuperAdmin', 'Owner', 'Manager'].includes(effectiveRole) || user?.role === 'Owner';
  const getRoleLabel = (role) => ({
    SuperAdmin: 'Quản trị viên',
    Owner: 'Chủ nhà',
    Manager: 'Quản lý',
    Staff: 'Nhân viên'
  }[role] || role || 'Tài khoản');

  const qrFileRef = useRef(null);
  const [isScanningQR, setIsScanningQR] = useState(false);

  // ==========================================
  // HÀM GỌI API CHUNG VÀ TẤT CẢ CÁC HANDLER KHÁC
  // ==========================================
  const handleLogout = useCallback(() => {
    localStorage.removeItem('smartstay_token');
    localStorage.removeItem('smartstay_user');
    setIsLoggedIn(false);
    setUser(null);
    setSelectedHouse(null);
    setIsHubMode(true); // Đảm bảo reset lại màn hình về Hub
    setActiveTab('dashboard');
    setHouses([]);
    setRooms([]);
    setBills([]);
    setBillStats({ totalRooms: 0, totalBillPaids: 0, totalBillNotPaids: 0, totalAmountPaids: 0 });
    setSavings([]);
    setTransactions([]);
    setDashboardSummary(null);
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (changePasswordForm.newPassword !== changePasswordForm.confirmNewPassword) {
      showToast("Mật khẩu mới không khớp!", "error");
      return;
    }
    try {
      const currentUsername = user?.username || user?.userName || user?.Username;
      if (!currentUsername) {
        showToast("Lỗi: Không tìm thấy Username trong phiên đăng nhập. Vui lòng đăng nhập lại!", "error");
        return;
      }

      await fetchApi('/auth/change-password', 'POST', {
        username: currentUsername,
        oldPassword: changePasswordForm.oldPassword,
        newPassword: changePasswordForm.newPassword
      });
      showToast("Đổi mật khẩu thành công!", "success");
      setChangePasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      showToast(error.message || "Lỗi khi đổi mật khẩu", "error");
    }
  };

  const fetchApi = useCallback(async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('smartstay_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        const result = await res.json().catch(() => ({}));
        throw new Error(result.message || "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Lỗi máy chủ (${res.status})`);

      return result;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error("Không thể kết nối Backend. Vui lòng kiểm tra Server .NET.");
      }
      throw error;
    }
  }, [handleLogout]);

  const loadSavings = useCallback(async () => {
    try {
      const savingsData = await fetchApi(`/saving`);
      setSavings(savingsData);
    } catch (e) {
      setSavings([]);
    }
  }, [fetchApi]);

  const parseMeters = useCallback((metersData) =>
    metersData.map(m => ({ ...m, roomIds: JSON.parse(m.roomIdsJson || '[]') })), []);

  const parseBills = useCallback((billsData) =>
    billsData.map(b => ({
      ...b,
      roomId: b.roomCode,
      details: JSON.parse(b.detailsJson || '{}'),
      meter: JSON.parse(b.meterInfoJson || '{}'),
      heaterMeter: b.heaterInfoJson ? JSON.parse(b.heaterInfoJson) : null
    })), []);

  const loadHouses = useCallback(async () => {
    const data = await fetchApi('/house');
    setHouses(data);
    return data;
  }, [fetchApi]);

  const loadDashboardData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [summaryData] = await Promise.all([
      fetchApi(`/management/dashboard/summary/${houseId}?year=${year}&month=${month}`),
    ]);
    setDashboardSummary(summaryData);
  }, [fetchApi, viewDate]);

  const loadRoomsData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [roomsData] = await Promise.all([
      fetchApi(`/room/${houseId}`),
    ]);
    setRooms(roomsData);
  }, [fetchApi, parseMeters, viewDate]);

  const loadMetersData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [metersData] = await Promise.all([
      fetchApi(`/meter/${houseId}?year=${year}&month=${month}`)
    ]);
    setMeters(parseMeters(metersData));
  }, [fetchApi, parseMeters, viewDate]);

  const loadBillsData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [billsResult] = await Promise.all([
      fetchApi(`/bill/${houseId}?year=${year}&month=${month}`)
    ]);
    const billsData = Array.isArray(billsResult) ? billsResult : (billsResult?.bills || []);
    setBillStats({
      totalRooms: billsResult?.totalRooms ?? 0,
      totalBillPaids: billsResult?.totalBillPaids ?? billsData.filter(b => b.status === 'paid').length,
      totalBillNotPaids: billsResult?.totalBillNotPaids ?? billsData.filter(b => b.status !== 'paid').length,
      totalAmountPaids: billsResult?.totalAmountPaids ?? billsData.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.total || 0), 0)
    });
    setBills(parseBills(billsData));
  }, [fetchApi, parseBills, viewDate]);

  const loadTransactions = useCallback(async (houseId) => {
    const txData = await fetchApi(`/transaction/${houseId}?type=${selectedMonth}`);
    setTransactions(txData);
  }, [fetchApi, selectedMonth]);

  const loadTabData = useCallback(async (tab = activeTab, houseId = selectedHouse?.id) => {
    try {
      if (tab === 'savings') {
        await loadSavings();
        return;
      }
      if (!houseId) return;

      switch (tab) {
        case 'dashboard':
          await loadDashboardData(houseId);
          break;
        case 'rooms':
          await loadRoomsData(houseId);
          break;
        case 'meters_list':
          await loadMetersData(houseId);
          break;
        case 'bills':
          await loadBillsData(houseId);
          break;
        case 'finance':
          await loadTransactions(houseId);
          break;
        case 'settings':
          setConfig(prev => ({ ...selectedHouse, ...prev }));
          break;
        default:
          break;
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [
    activeTab, selectedHouse, loadSavings, loadDashboardData,
    loadRoomsData, loadMetersData, loadBillsData, loadTransactions, showToast
  ]);

  const loadHouseData = useCallback(async (houseId, tab = activeTab) => {
    await loadTabData(tab, houseId);
  }, [activeTab, loadTabData]);

  useEffect(() => {
    const token = localStorage.getItem('smartstay_token');
    const savedUser = localStorage.getItem('smartstay_user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
      loadHouses()
        .then(data => setHouses(data))
        .catch(err => console.error("Session expired on load"));
    } else {
      handleLogout();
    }

    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [loadHouses, handleLogout]);

  useEffect(() => {
    if (isLoggedIn && !selectedHouse) {
      loadHouses().then(data => setHouses(data)).catch(err => showToast(err.message, 'error'));
    }
  }, [isLoggedIn, selectedHouse, loadHouses, showToast]);

  useEffect(() => {
    if (isLoggedIn && activeTab !== 'finance') {
      loadTabData(activeTab, selectedHouse?.id);
    }
  }, [isLoggedIn, activeTab, selectedHouse?.id, viewDate, selectedMonth, loadTabData]);

  const handleOpenShare = (e, house) => {
    e.stopPropagation();
    setSharingHouse(house);
    setAssignForm({ username: '', role: 'Manager' });
    setIsShareModalOpen(true);
  };

  const handleAddSaving = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      bankName: fd.get('bankName'),
      amount: parseN(fd.get('amount')),
      interestRate: Number(fd.get('interestRate')),
      termMonths: Number(fd.get('termMonths')),
      startDate: fd.get('startDate'),
      note: fd.get('note')
    };
    try {
      if (editingSaving) {
        await fetchApi(`/saving/${editingSaving.id}`, 'PUT', payload);
        showToast("Đã cập nhật sổ tiết kiệm!", "success");
      } else {
        payload.id = crypto.randomUUID();
        await fetchApi('/saving', 'POST', payload);
        showToast("Đã thêm sổ tiết kiệm!", "success");
      }
      await loadSavings();
      setIsAddSavingModalOpen(false);
      setEditingSaving(null);
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handleDeleteSaving = async (id) => {
    const confirmed = await requestConfirm({
      title: 'Xóa sổ tiết kiệm',
      message: 'Bạn có chắc chắn muốn xóa sổ tiết kiệm này? Dữ liệu đã xóa sẽ không thể khôi phục.'
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/saving/${id}`, 'DELETE');
      await loadSavings();
      setIsAddSavingModalOpen(false);
      setEditingSaving(null);
      showToast("Đã xóa sổ tiết kiệm", "success");
    } catch (e) { showToast("Lỗi xóa: " + e.message, "error"); }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    try {
      await fetchApi(`/house/${sharingHouse.id}/assign`, 'POST', assignForm);
      showToast(`Đã cấp quyền ${assignForm.role} cho ${assignForm.username} thành công!`, "success");
      setIsShareModalOpen(false);
    } catch (err) {
      showToast(err.message || "Lỗi cấp quyền. Kiểm tra lại tài khoản.", "error");
    }
  };

  const handleAddHouse = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const houseData = {
      name: fd.get('name'),
      address: fd.get('address'),
      rentPrice: parseN(fd.get('rentPrice')),
      startDate: fd.get('startDate'),
      leaseTerm: Number(fd.get('leaseTerm')),
      deposit: parseN(fd.get('deposit')),
      paymentPeriod: Number(fd.get('paymentPeriod')),
      paymentDay: Number(fd.get('paymentDay')),
      internetFee: parseN(fd.get('internetFee')),
      otherFees: parseN(fd.get('otherFees')),
      notes: fd.get('notes')
    };

    try {
      if (editingHouse) {
        await fetchApi(`/house/${editingHouse.id}`, 'PUT', houseData);
        setHouses(houses.map(h => h.id === editingHouse.id ? { ...h, ...houseData } : h));
        showToast("Cập nhật cơ sở thành công!", "success");
      } else {
        const res = await fetchApi('/house', 'POST', houseData);
        setHouses([...houses, res]);
        showToast("Tạo cơ sở thành công!", "success");
      }
      const data = await fetchApi('/house', 'GET');
      setHouses(data);
      setIsAiCreateHouseOpen(false);
      setEditingHouse(null);
    }
    catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handleAiGenerateHouse = async () => {
    if (!aiPrompt.trim()) {
      showToast("Vui lòng nhập mô tả hoặc chọn mẫu!", "error");
      return;
    }
    showToast("AI đang xử lý... vui lòng đợi!", "success");
    try {
      const res = await fetchApi('/house/ai-generate', 'POST', { prompt: aiPrompt });
      if (res.isSuccess === false) {
        setAiFeedback(res.message);
        showToast("AI cần thêm thông tin!", "error");
      } else {
        const updatedHouses = await fetchApi('/house', 'GET');
        setHouses(updatedHouses);
        showToast("Phép màu đã xảy ra! Nhà đã được tạo.", "success");
        setIsAiPromptModalOpen(false);
        setAiPrompt("");
        setAiFeedback("");
      }
    } catch (e) { showToast("Lỗi khi tạo AI: " + e.message, "error"); }
  };

  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói", "error");
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
      showToast("Đang nghe... Hãy nói gì đó", "success");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAiPrompt(prev => prev ? prev + " " + transcript : transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Lỗi Mic:", event.error);
      setIsListening(false);
      showToast("Lỗi nhận diện giọng nói hoặc chưa cấp quyền Mic", "error");
    };

    recognition.onend = () => { setIsListening(false); };
    recognition.start();
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const start = fd.get('start');
    const months = Number(fd.get('months'));
    let endDateStr = start;
    try {
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + months);
      endDateStr = endDate.toISOString().split('T')[0];
    } catch (err) { }

    const payload = {
      id: editingRoom ? editingRoom.id : crypto.randomUUID(),
      houseId: selectedHouse?.id,
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
      contractEnd: endDateStr,
      months,
      paymentDate: Number(fd.get('payDay')),
      heaterMeterId: fd.get('heaterType') === 'shared' ? fd.get('heaterMeterId') : null
    };

    try {
      await fetchApi('/room', 'POST', payload);
      await loadHouseData(selectedHouse?.id);
      showToast("Lưu phòng thành thành công!", "success");
      setIsAddRoomModalOpen(false);
      setEditingRoom(null);
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handleDeleteHouse = async (houseId, houseName) => {
    const confirmed = await requestConfirm({
      title: 'Xóa cơ sở',
      message: `Bạn có chắc chắn muốn xóa cơ sở "${houseName}" và TOÀN BỘ dữ liệu liên quan không?`
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/house/${houseId}`, 'DELETE');
      setHouses(houses.filter(h => h.id !== houseId));
      if (selectedHouse?.id === houseId) setSelectedHouse(null);
      showToast("Đã xóa cơ sở thành công!", "success");
    } catch (e) { showToast("Lỗi xóa: " + e.message, "error"); }
  };

  const handleDeleteRoom = async (roomId, roomCode) => {
    const confirmed = await requestConfirm({
      title: 'Xóa phòng',
      message: `Bạn có chắc muốn xóa phòng/MBKD "${roomCode}" không?`
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/room/${roomId}`, 'DELETE');
      await loadHouseData(selectedHouse?.id);
      setIsAddRoomModalOpen(false);
      setEditingRoom(null);
      showToast("Đã xóa phòng thành công!", "success");
    } catch (e) { showToast("Lỗi xóa phòng: " + e.message, "error"); }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!canManageTransactions) {
      showToast("Bạn không có quyền xóa phiếu thu chi.", "error");
      return;
    }
    const confirmed = await requestConfirm({
      title: 'Xóa phiếu thu chi',
      message: 'Bạn có chắc chắn muốn xóa phiếu thu chi này không?'
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/transaction/${txId}`, 'DELETE');
      await loadHouseData(selectedHouse?.id);
      setIsAddTransactionModalOpen(false);
      setEditingTransaction(null);
      showToast("Đã xóa phiếu thu chi!", "success");
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handleSaveMeter = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      id: editingMeter ? editingMeter.id : crypto.randomUUID(),
      houseId: selectedHouse?.id,
      type: fd.get('type'),
      name: fd.get('name'),
      oldVal: Number(fd.get('val'))
    };
    try {
      if (editingMeter) {
        await fetchApi(`/meter/save`, 'POST', payload);
        showToast("Đã cập nhật công tơ!", "success");
      } else {
        await fetchApi('/meter/save', 'POST', payload);
        showToast("Đã tạo công tơ!", "success");
      }
      await loadHouseData(selectedHouse?.id);
      setIsAddMeterModalOpen(false);
      setEditingMeter(null);
    } catch (err) { showToast("Lỗi: " + err.message, "error"); }
  };

  const handleDeleteMeter = async (meterId) => {
    const confirmed = await requestConfirm({
      title: 'Xóa công tơ',
      message: 'Bạn có chắc muốn xóa công tơ này?'
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/meter/${meterId}`, 'DELETE');
      await loadHouseData(selectedHouse?.id);
      setIsAddMeterModalOpen(false);
      setEditingMeter(null);
      showToast("Đã xóa công tơ", "success");
    } catch (err) { showToast("Lỗi: " + err.message, "error"); }
  };

  const handleSaveMeterMapping = async () => {
    if (!mappingMeter) return;
    try {
      await fetchApi(`/meter/${mappingMeter.id}/map`, 'PUT', { roomIds: mappingMeter.roomIds });
      showToast("Đã cập nhật sơ đồ công tơ!", "success");
      setMappingMeter(null);
    } catch (e) { showToast("Lỗi lưu sơ đồ: " + e.message, "error"); }
  };

  const handleSaveMetersAndGenerateBills = async () => {
    try {
      const monthSelected = viewDate.getMonth() + 1;
      const yearSelected = viewDate.getFullYear();

      const updates = meters
        .filter(m => (m.newVal !== null && m.newVal !== "" && m.newVal !== undefined))
        .map(m => ({
          id: m.id,
          houseId: m.houseId,
          name: m.name,
          type: m.type,
          oldVal: parseN(String(m.oldVal)),
          newVal: parseN(String(m.newVal)),
          roomIdsJson: JSON.stringify(m.roomIds || []),
          year: yearSelected,
          month: monthSelected
        }));

      if (updates.length === 0) return showToast("Chưa nhập số mới nào!", "error");
      await fetchApi('/meter/update', 'POST', updates);

      const res = await fetchApi('/bill/generate', 'POST', {
        houseId: selectedHouse?.id,
        month: monthSelected,
        year: yearSelected,
        overwrite: true
      });

      showToast(`Đã lưu chỉ số & tự động lập ${res.generatedCount} hóa đơn!`, "success");

      await loadHouseData(selectedHouse?.id);
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handleGenerateClick = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const alreadyGenerated = bills.some(b => b.month === month && b.year === year);
    if (alreadyGenerated) {
      setIsOverwriteModalOpen(true);
    } else {
      executeGenerateBills();
    }
  };

  const executeGenerateBills = async () => {
    setIsOverwriteModalOpen(false);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      await fetchApi('/bill/generate', 'POST', {
        houseId: selectedHouse?.id,
        month: month,
        year: year,
        overwrite: true
      });
      await loadHouseData(selectedHouse?.id);
      showToast("Đã lập hóa đơn thành công!", "success");
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handleDiscountChange = (billId, val) => {
    const dVal = parseN(String(val)) || 0;
    const targetBill = bills.find(b => b.id === billId);
    if (!targetBill) return;

    const baseTotal = targetBill.details.rent + targetBill.details.elec + (targetBill.details.heater || 0) + targetBill.details.water + (targetBill.details.internet || 0) + (targetBill.details.service || 0) + (targetBill.details.ebikes || 0);
    const newTotal = Math.max(0, baseTotal - dVal);

    const updatedBillData = {
      ...targetBill,
      total: newTotal,
      details: { ...targetBill.details, discount: dVal }
    };

    setBills(prev => prev.map(b => b.id === billId ? updatedBillData : b));

    if (bottomSheet && bottomSheet.data.id === billId) {
      setBottomSheet({ ...bottomSheet, data: updatedBillData });
    }
  };

  const handleDiscountBlur = async (billId, dVal) => {
    try {
      const billToUpdate = bills.find(b => b.id === billId);
      if (billToUpdate) {
        await fetchApi(`/bill/${billId}/discount`, 'PUT', {
          discount: dVal,
          total: billToUpdate.total,
          details: billToUpdate.details
        });
        await loadHouseData(selectedHouse?.id);
      }
    } catch (e) { showToast("Đã có lỗi xảy ra ! (" + e.message + ")", "error"); }
  };

  const handleAddTx = async (e) => {
    e.preventDefault();
    if (editingTransaction && !canManageTransactions) {
      showToast("Bạn không có quyền sửa phiếu thu chi.", "error");
      return;
    }
    const fd = new FormData(e.target);
    const payload = {
      houseId: selectedHouse?.id,
      type: fd.get('type'),
      amount: parseN(fd.get('amount')),
      category: parseInt(fd.get('category')),
      note: fd.get('note')
    };

    try {
      if (editingTransaction) {
        await fetchApi(`/transaction/${editingTransaction.id}`, 'PUT', payload);
        showToast("Đã cập nhật phiếu thu chi!", "success");
      } else {
        payload.id = crypto.randomUUID();
        await fetchApi('/transaction', 'POST', payload);
        showToast("Đã ghi sổ thu chi!", "success");
      }
      await loadHouseData(selectedHouse?.id);
      setIsAddTransactionModalOpen(false);
      setEditingTransaction(null);
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handlePayBill = async (billId) => {
    try {
      await fetchApi(`/bill/pay/${billId}`, 'POST');
      await loadHouseData(selectedHouse?.id);
      showToast("Gạch nợ & Ghi sổ thành công!", "success");
      setBottomSheet(null);
    } catch (e) {
      showToast("Đã có lỗi xảy ra ! (" + e.message + ")", "error");
      setBottomSheet(null);
    }
  };

  const handleDeleteBill = async (billId) => {
    const confirmed = await requestConfirm({
      title: 'Xóa hóa đơn',
      message: 'Bạn có chắc chắn muốn xóa hóa đơn này không? Các chỉ số công tơ đã nhập sẽ không bị thay đổi.'
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/bill/${billId}`, 'DELETE');
      await loadHouseData(selectedHouse?.id);
      showToast("Đã xóa hóa đơn thành công!", "success");
      setBottomSheet(null);
    } catch (e) { showToast("Lỗi xóa hóa đơn: " + e.message, "error"); }
  };

  const handleSaveConfig = async () => {
    try {
      await fetchApi(`/house/${selectedHouse?.id}/config`, 'PUT', config);
      showToast("Đã lưu cấu hình lên máy chủ!", "success");
    } catch (e) { showToast("Đã có lỗi xảy ra ! (" + e.message + ")", "error"); }
  };

  const handleAiChat = async (e) => {
    e.preventDefault(); const val = e.target.q.value; if (!val) return; e.target.reset();
    setAiMessages(prev => [...prev, { role: 'user', text: val }]); setIsAiLoading(true);
    try {
      const res = await fetchApi('/ai/chat', 'POST', { houseId: selectedHouse?.id, prompt: val });
      setAiMessages(prev => [...prev, { role: 'assistant', text: res.text }]);
    } catch (e) {
      showToast("Lỗi kết nối AI Server", "error");
      setAiMessages(prev => [...prev, { role: 'assistant', text: "Lỗi Server AI: " + e.message }]);
    } finally { setIsAiLoading(false); }
  };

  const handleUpdateOldMeterUI = (id, val) => setMeters(prev => prev.map(m => m.id === id ? { ...m, oldVal: val } : m));
  const handleUpdateMeterUI = (id, val) => setMeters(prev => prev.map(m => m.id === id ? { ...m, newVal: val } : m));

  const handleShareZaloImage = async (billData) => {
    if (!billData) return;

    setIsGeneratingImage(true);

    // Đợi 600ms để đảm bảo animation (duration-500) chạy xong hoàn toàn, tránh chụp phải ảnh mờ/trắng
    await new Promise(r => setTimeout(r, 600));

    const el = document.getElementById(`receipt-export-${billData.id}`);

    if (!el) {
      showToast("Giao diện chưa sẵn sàng, vui lòng thử lại sau", "error");
      setIsGeneratingImage(false);
      return;
    }

    // KHẮC PHỤC TRIỆT ĐỂ: Kỹ thuật Deep Clone - Tạo bản sao tách biệt khỏi giao diện cũ
    // Tránh việc trình duyệt lấy nhầm cache ảnh của lần tạo trước đó
    const clone = el.cloneNode(true);
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, { position: 'absolute', top: '-9999px', left: '-9999px', width: '420px', pointerEvents: 'none' });
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      // Đảm bảo ảnh QR tải xong
      const qrImg = clone.querySelector('img');
      if (qrImg && !qrImg.complete) {
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
        });
      }

      let canvas = null;

      // Ưu tiên modern-screenshot để xử lý triệt để lỗi lệch CSS & cache ảnh cũ
      try {
        // Hỗ trợ đợi font chữ load xong để không bị lệch chữ
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 200)); // Đợi thêm một chút để DOM clone ổn định

        canvas = await domToCanvas(clone, {
          scale: 2.5,
          backgroundColor: '#ffffff'
        });
      } catch (err) {
        console.warn("modern-screenshot lỗi → fallback html2canvas", err);
      }

      if (!canvas && window.html2canvas) {
        canvas = await window.html2canvas(clone, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
      }

      const cropCanvas = (canvas) => {
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        const data = ctx.getImageData(0, 0, width, height).data;

        let top = null, left = null, right = null, bottom = null;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i + 3] > 0) { // Check alpha
              if (top === null) top = y;
              if (left === null || x < left) left = x;
              if (right === null || x > right) right = x;
              bottom = y;
            }
          }
        }

        // Chống crash ngầm nếu ảnh hoàn toàn trong suốt (thường do thư viện lỗi chụp trắng)
        if (top === null) return canvas;

        const w = right - left + 1;
        const h = bottom - top + 1;

        const cropped = document.createElement('canvas');
        cropped.width = w;
        cropped.height = h;

        cropped.getContext('2d').drawImage(canvas, left, top, w, h, 0, 0, w, h);
        return cropped;
      };

      const finalCanvas = cropCanvas(canvas);
      const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));

      if (!blob) throw new Error("Không thể tạo dữ liệu ảnh (Kích thước = 0).");

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast("Đã copy ảnh vào clipboard!", "success");

    } catch (e) {
      console.error(e);
      showToast("Lỗi khi tạo ảnh: " + e.message, "error");
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
      setIsGeneratingImage(false);
    }
  };

  const handleUploadQR = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningQR(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const { bin, acc } = parseVietQR(code.data);
          if (bin && acc) {
            setConfig(prev => ({ ...prev, bankBin: bin, bankAcc: acc, bankName: getBankNameFromBin(bin) }));
            showToast("Tuyệt vời! Đã nhận diện thành công mã VietQR.", "success");
          } else {
            showToast("QR không đúng chuẩn VietQR hoặc không có số tài khoản.", "error");
          }
        } else {
          showToast("Không thể đọc mã QR. Vui lòng chọn ảnh rõ nét hơn.", "error");
        }
        setIsScanningQR(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const monthLabels = { 'this-month': 'Tháng này', 'last-month': 'Tháng trước', 'all': 'Tất cả' };

  const currentRooms = useMemo(() => rooms.filter(r => r.roomCode?.toLowerCase().includes(searchQuery.toLowerCase()) || r.id?.toLowerCase().includes(searchQuery.toLowerCase())), [rooms, searchQuery]);
  const currentMeters = useMemo(() => meters.filter(m => m.id?.toLowerCase().includes(searchQuery.toLowerCase()) || m.name?.toLowerCase().includes(searchQuery.toLowerCase())), [meters, searchQuery]);
  const currentTransactions = useMemo(() => transactions.filter(t => t.note?.toLowerCase().includes(searchQuery.toLowerCase())), [transactions, searchQuery]);
  const currentBills = useMemo(() => bills.filter(b => b.roomId?.toLowerCase().includes(searchQuery.toLowerCase())), [bills, searchQuery]);
  const currentSavings = useMemo(() => savings.filter(s => s.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.note?.toLowerCase().includes(searchQuery.toLowerCase())), [savings, searchQuery]);
  const uniqueBankNames = useMemo(() => [...new Set(savings.map(s => s.bankName).filter(Boolean))], [savings]);

  const summarySavings = useMemo(() => {
    return currentSavings.filter(s => {
      const bank = s.bankName || 'Khác';
      return !unselectedSavingsBanks.includes(bank);
    });
  }, [currentSavings, unselectedSavingsBanks]);

  const financeStats = useMemo(() => {
    const totalRev = transactions.filter(t => t.type === 'in').reduce((s, t) => s + (t.amount || 0), 0);
    const txExp = transactions.filter(t => t.type === 'out').reduce((s, t) => s + (t.amount || 0), 0);
    const fixedCosts = (selectedHouse?.rentPrice || 0) + (selectedHouse?.internetFee || 0) + (selectedHouse?.otherFees || 0);
    const totalExp = txExp + fixedCosts;
    return { rev: totalRev, exp: totalExp, txExp, fixedCosts };
  }, [transactions, selectedHouse]);

  const revenueChartData = useMemo(() => {
    const chartRaw = dashboardSummary?.revenueChart || [];
    if (!chartRaw || chartRaw.length === 0) {
      return [1, 2, 3, 4, 5, 6].map((_, i) => ({ label: `Th${i + 1}`, value: 0, height: 0, isCurrent: i === 5 }));
    }

    const maxVal = Math.max(...chartRaw.map(d => d.value), 1);
    return chartRaw.map(d => ({
      ...d,
      height: d.value === 0 ? 0 : Math.max((d.value / maxVal) * 100, 4)
    }));
  }, [dashboardSummary]);

  const shouldShowMeterBanner = useMemo(() => {
    if (!rooms || rooms.length === 0) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return rooms.some(r => {
      if (r.status !== 'full' || !r.paymentDate) return false;
      const pd = Number(r.paymentDate);
      if (isNaN(pd)) return false;

      const dates = [
        new Date(now.getFullYear(), now.getMonth() - 1, pd),
        new Date(now.getFullYear(), now.getMonth(), pd),
        new Date(now.getFullYear(), now.getMonth() + 1, pd)
      ];

      return dates.some(d => {
        const diffDays = Math.round((now - d) / (1000 * 60 * 60 * 24));
        return diffDays >= -1 && diffDays <= 3;
      });
    });
  }, [rooms]);

  const handlePrevMonth = () => { setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; }); };
  const handleNextMonth = () => { setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; }); };
  const monthDisplay = `Tháng ${viewDate.getMonth() + 1}, ${viewDate.getFullYear()}`;

  const summary = useMemo(() => {
    if (!currentMeters || currentMeters.length === 0) return { kwh: 0, heater: 0, money: 0 };
    let totalKwh = 0, totalHeater = 0;
    currentMeters.forEach(m => {
      const isOldEmpty = m.oldVal === null || m.oldVal === "";
      const isNewEmpty = m.newVal === null || m.newVal === "";
      if (!isOldEmpty && !isNewEmpty) {
        const vOld = parseN(m.oldVal);
        const vNew = parseN(m.newVal);
        const diff = vNew >= vOld ? (vNew - vOld) : 0;
        totalKwh += diff;
        if (m.type === 'heater') totalHeater += diff;
      }
    });
    return { kwh: totalKwh, heater: totalHeater, money: totalKwh * (config?.priceElec || 3500) };
  }, [currentMeters, config?.priceElec]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (activeTab !== 'finance' || !selectedHouse?.id) return;
      try {
        const txData = await fetchApi(`/transaction/${selectedHouse.id}?type=${selectedMonth}`);
        setTransactions(txData);
      } catch (e) { console.error("Lỗi khi tải giao dịch:", e.message); }
    };
    loadTransactions();
  }, [activeTab, selectedMonth, selectedHouse?.id]);

  // ==========================================
  // RENDER QUYẾT ĐỊNH LUỒNG
  // ==========================================

  // Các tab hiển thị độc lập, không cần thiết phải ở trong một House cụ thể
  const isGlobalTab = ['savings', 'ai', 'settings', 'profile'].includes(activeTab);

  // 1. CHƯA ĐĂNG NHẬP -> HIỂN THỊ FORM LOGIN/REGISTER
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-left animate-in fade-in duration-700">
        <ToastNotification toast={toast} />
        <AuthView fetchApi={fetchApi} setIsLoggedIn={setIsLoggedIn} setUser={setUser} showToast={showToast} />
      </div>
    );
  }

  // 2. MÀN HÌNH HUB TỔNG QUAN (Ngay sau khi đăng nhập)
  if (isLoggedIn && isHubMode) {
    return (
      <HubView
        user={user}
        houses={houses}
        setIsHubMode={setIsHubMode}
        setActiveTab={setActiveTab}
        setSelectedHouse={setSelectedHouse}
        setConfig={setConfig}
        setSearchQuery={setSearchQuery}
        setEditingHouse={setEditingHouse}
        setIsAiCreateHouseOpen={setIsAiCreateHouseOpen}
        setIsAiPromptModalOpen={setIsAiPromptModalOpen}
        setAiPrompt={setAiPrompt}
        setIsListening={setIsListening}
        showToast={showToast}
        handleLogout={handleLogout}
        toast={toast}
      />
    );
  }

  // 3. ĐÃ ĐĂNG NHẬP NHƯNG CHƯA CHỌN CƠ SỞ (Đang ở mode Quản lý nhà)
  if (isLoggedIn && !selectedHouse && !isGlobalTab) {
    const filteredHouses = houses.filter(h =>
      h.name?.toLowerCase().includes(houseSearchQuery.toLowerCase()) ||
      h.address?.toLowerCase().includes(houseSearchQuery.toLowerCase())
    );

    const visibleSelectedHouses = filteredHouses.filter(h => selectedStatsHouses.includes(h.id));
    const housesForStats = visibleSelectedHouses.length > 0 ? visibleSelectedHouses : filteredHouses;

    const houseStats = housesForStats.reduce((acc, h) => {
      acc.totalHouses += 1;
      acc.totalRooms += (h.totalRooms || 0);
      acc.emptyRooms += (h.emptyRooms || 0);

      acc.totalRevenue += (h.revenue || 0);
      acc.totalExpense += (h.expense || 0);
      acc.totalProfit += (h.profit || ((h.revenue || 0) - (h.expense || 0)));
      return acc;
    }, { totalHouses: 0, totalRooms: 0, emptyRooms: 0, totalRevenue: 0, totalExpense: 0, totalProfit: 0 });

    const getAdvancedDueInfo = (startDate, paymentDay, paymentPeriod) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const period = paymentPeriod || 1;
      const day = paymentDay || 5;

      let start = new Date();
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) start = d;
      }

      let monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
      if (monthsDiff < 0) monthsDiff = 0;

      let periodsPassed = Math.floor(monthsDiff / period);
      let targetMonth = start.getMonth() + (periodsPassed * period);

      let dueDate = new Date(start.getFullYear(), targetMonth, day);

      if (today > dueDate) {
        dueDate = new Date(start.getFullYear(), targetMonth + period, day);
      }

      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return { daysLeft: diffDays, dueDate };
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center">
        <ToastNotification toast={toast} />
        <ConfirmDialog
          dialog={confirmDialog}
          onCancel={() => closeConfirmDialog(false)}
          onConfirm={() => closeConfirmDialog(true)}
        />

        <div className="w-full max-w-sm flex flex-col h-screen relative overflow-hidden">
          <div className="sticky top-0 z-20 bg-slate-50 pt-4 px-3 pb-2 space-y-3 shadow-sm border-b border-slate-200">
            <div className="relative flex items-center justify-between">

              {/* LEFT */}
              <div className="flex items-center space-x-2 z-10">
                <button
                  onClick={() => setIsHubMode(true)}
                  className="text-slate-600 hover:bg-slate-200 rounded-lg transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* CENTER (ABSOLUTE) */}
              <h2 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-black text-blue-900 uppercase tracking-tighter">
                Lucky Home
              </h2>

              {/* RIGHT */}
              <div className="flex items-center space-x-2 z-10">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">
                  {user?.role}
                </span>

                <button
                  onClick={handleLogout}
                  className="p-1.5 bg-red-50 text-red-500 rounded-lg active:scale-90 transition-all hover:bg-red-100 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>

            <div className="bg-slate-900 rounded-xl p-3.5 text-white shadow-xl border-b-1 border-blue-600">
              <div className="flex justify-between items-center mb-3 px-2 border-b border-slate-700 pb-3">
                <div className="text-left">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Doanh thu</p>
                  <p className="text-sm font-black text-emerald-400 tabular-nums">+{formatN(houseStats.totalRevenue)}</p>
                </div>
                <div className="text-center border-x border-slate-700 px-3">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Chi phí</p>
                  <p className="text-sm font-black text-rose-400 tabular-nums">-{formatN(houseStats.totalExpense)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lợi nhuận</p>
                  <p className="text-sm font-black text-blue-400 tabular-nums">{formatN(houseStats.totalProfit)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Số nhà</p>
                  <p className="text-sm font-black">{houseStats.totalHouses}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Tổng phòng</p>
                  <p className="text-sm font-black text-blue-400">{houseStats.totalRooms}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Đang trống</p>
                  <p className="text-sm font-black text-orange-400">{houseStats.emptyRooms}</p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={houseSearchQuery}
                onChange={(e) => setHouseSearchQuery(e.target.value)}
                placeholder="Tìm tên nhà hoặc địa chỉ..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-600 focus:shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-3 pt-3 pb-28 space-y-2.5 relative">
            {filteredHouses.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center mt-8">Không tìm thấy cơ sở nào.</p>
            )}

            {filteredHouses.map(h => {
              const payInfo = getAdvancedDueInfo(h.startDate, h.paymentDay, h.paymentPeriod);
              const isUrgentPay = payInfo.daysLeft <= 3;
              const isWarningPay = payInfo.daysLeft <= 7;
              const shouldShowPayInfo = payInfo.daysLeft <= 30;
              const isFull = h.emptyRooms === 0;

              const cardStyle = isUrgentPay ? 'bg-red-50/50 border-red-100' : isFull ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100';

              const getRoleDisplay = (role) => {
                switch (role) {
                  case 'SuperAdmin': return { text: 'Quản trị viên', class: 'bg-purple-100 text-purple-600' };
                  case 'Owner': return { text: 'Chủ nhà', class: 'bg-blue-100 text-blue-600' };
                  case 'Manager': return { text: 'Quản lý', class: 'bg-indigo-100 text-indigo-600' };
                  default: return { text: 'Nhân viên', class: 'bg-slate-100 text-slate-500' };
                }
              };
              const roleInfo = getRoleDisplay(h.userRole);

              const getRoomStatusColor = () => {
                if (isFull) return 'bg-emerald-500';
                const emptyRatio = h.emptyRooms / h.totalRooms;
                return emptyRatio <= 0.3 ? 'bg-amber-500' : 'bg-red-500';
              };

              return (
                <div key={h.id} className={`w-full p-2.5 rounded-xl border shadow-sm active:scale-[0.99] transition-all text-left relative mb-2 ${cardStyle}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="mr-2 flex items-center h-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                        checked={selectedStatsHouses.includes(h.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatsHouses([...selectedStatsHouses, h.id]);
                          } else {
                            setSelectedStatsHouses(selectedStatsHouses.filter(id => id !== h.id));
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => { setSelectedHouse(h); setConfig({ ...h }); setActiveTab('dashboard'); setSearchQuery(''); }}
                      className="flex-1 flex items-center space-x-2 text-left overflow-hidden"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${isUrgentPay ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`font-black text-[13px] uppercase tracking-tight leading-tight truncate ${isUrgentPay ? 'text-red-700' : isWarningPay ? 'text-amber-700' : 'text-blue-800'}`}>
                            {h.name}
                          </h3>
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${roleInfo.class}`}>
                            {roleInfo.text}
                          </span>
                        </div>
                        <p className="text-[9px] font-semibold text-slate-500 mt-0.5 flex items-center truncate">
                          <MapPin className="w-2.5 h-2.5 mr-1 shrink-0 opacity-60" />
                          {h.address || "Chưa cập nhật địa chỉ"}
                        </p>
                      </div>
                    </button>

                    {['SuperAdmin', 'Owner'].includes(h.userRole || user?.role) && (
                      <div className="flex items-center ml-1">
                        <button onClick={(e) => handleOpenShare(e, h)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingHouse(h); setIsAiCreateHouseOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteHouse(h.id, h.name); }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                    <div className="flex items-center">
                      <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-md ${isFull ? 'text-emerald-700 bg-emerald-100/50' : 'text-blue-700 bg-blue-50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isFull ? '' : 'animate-pulse'} ${getRoomStatusColor()}`} />
                        {isFull ? `Đã lấp đầy (${h.totalRooms} phòng)` : `Trống ${h.emptyRooms} / ${h.totalRooms} phòng`}
                      </div>
                    </div>

                    {shouldShowPayInfo && (
                      <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-md ${isUrgentPay ? 'text-red-700 bg-red-100/50' :
                        isWarningPay ? 'text-amber-700 bg-amber-100/50' :
                          'text-emerald-700 bg-emerald-100/50'
                        }`}>
                        <Calendar className={`w-3 h-3 mr-1.5 ${isUrgentPay ? 'text-red-600' : isWarningPay ? 'text-amber-500' : 'text-emerald-500'}`} />
                        Hạn đóng tiền: {payInfo.daysLeft} ngày
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-30 pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
              <button
                onClick={() => { setEditingHouse(null); setIsAiCreateHouseOpen(true); }}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl flex items-center justify-center active:scale-95 border-b-[3px] border-blue-800 transition-all gap-2"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span className="font-black text-[10px] uppercase tracking-widest mt-0.5">Thêm cơ sở mới</span>
              </button>

              <button
                onClick={() => { setIsAiPromptModalOpen(true); setAiPrompt(""); setIsListening(false); }}
                className="w-full bg-slate-800 text-white py-2.5 rounded-xl flex items-center justify-center active:scale-95 border-b-[3px] border-slate-900 transition-all gap-2"
              >
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <span className="font-black text-[10px] uppercase tracking-widest mt-0.5">Tạo nhanh bằng AI</span>
              </button>
            </div>
          </div>
        </div>

        <ShareHouseModal
          isShareModalOpen={isShareModalOpen}
          setIsShareModalOpen={setIsShareModalOpen}
          sharingHouse={sharingHouse}
          setSharingHouse={setSharingHouse}
          assignForm={assignForm}
          setAssignForm={setAssignForm}
          handleAssignRole={handleAssignRole}
        />

        {isAiCreateHouseOpen && (
          <Modal title={editingHouse ? "SỬA THÔNG TIN CƠ SỞ" : "TẠO CƠ SỞ MỚI"} onClose={() => { setIsAiCreateHouseOpen(false); setEditingHouse(null); }}>
            <AddHouseForm editingHouse={editingHouse} onSubmit={handleAddHouse} />
          </Modal>
        )}

        <AiPromptModal
          isAiPromptModalOpen={isAiPromptModalOpen}
          setIsAiPromptModalOpen={setIsAiPromptModalOpen}
          setIsListening={setIsListening}
          aiFeedback={aiFeedback}
          setAiFeedback={setAiFeedback}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          handleMicClick={handleMicClick}
          isListening={isListening}
          handleAiGenerateHouse={handleAiGenerateHouse}
        />
      </div>
    );
  }

  // 4. MAIN APP (Khi đã chọn cơ sở, hoặc truy cập Tab có tính Global như Tiết Kiệm)
  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-100 shadow-2xl overflow-hidden">
      <ToastNotification toast={toast} />
      <ConfirmDialog
        dialog={confirmDialog}
        onCancel={() => closeConfirmDialog(false)}
        onConfirm={() => closeConfirmDialog(true)}
      />

      {/* HEADER */}
      <Header
        selectedHouse={selectedHouse}
        activeTab={activeTab}
        isGlobalTab={isGlobalTab}
        isOwnerOrAdmin={isOwnerOrAdmin}
        setIsHubMode={setIsHubMode}
        setSelectedHouse={setSelectedHouse}
        setActiveTab={setActiveTab}
      />

      {/* SEARCH BAR (TÌM KIẾM + NÚT ADD) */}
      {['rooms', 'meters_list', 'finance', 'bills', 'savings'].includes(activeTab) && (
        <div className="px-4 py-2.5 shrink-0 bg-white border-b border-slate-100 flex items-center space-x-2 shadow-sm text-left">
          <div className="relative flex-1 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'savings' ? "Tìm ngân hàng, tên sổ..." : "Tìm phòng, hạng mục..."}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <button onClick={() => {
            if (activeTab === 'rooms') { setEditingRoom(null); setIsAddRoomModalOpen(true); }
            if (activeTab === 'finance') setIsAddTransactionModalOpen(true);
            if (activeTab === 'meters_list') setIsAddMeterModalOpen(true);
            if (activeTab === 'savings') { setEditingSaving(null); setIsAddSavingModalOpen(true); }
          }} className="p-1.5 bg-blue-600 text-white rounded-lg active:scale-90 transition-all flex items-center justify-center">
            <Plus className="w-4.5 h-4.5" strokeWidth={4} />
          </button>
        </div>
      )}

      {/* KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH */}
      <main className="flex-1 w-full overflow-y-auto px-4 pt-2 pb-32 no-scrollbar scroll-smooth">

        {activeTab === 'dashboard' && <DashboardPage
          shouldShowMeterBanner={shouldShowMeterBanner}
          setActiveTab={setActiveTab}
          dashboardSummary={dashboardSummary}
          canViewProfit={canViewProfit}
          isOwnerOrAdmin={isOwnerOrAdmin}
          revenueChartData={revenueChartData}
        />
        }

        {activeTab === 'rooms' && <RoomsPage
          currentRooms={currentRooms}
          setEditingRoom={setEditingRoom}
          setIsAddRoomModalOpen={setIsAddRoomModalOpen}
          isManagerOrAbove={isManagerOrAbove}
        />
        }

        {activeTab === 'bills' && <BillsPage
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          monthDisplay={monthDisplay}
          billStats={billStats}
          currentBills={currentBills}
          setBottomSheet={setBottomSheet}
        />
        }

        {activeTab === 'meters_list' && <MetersPage
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          monthDisplay={monthDisplay}
          summary={summary}
          config={config}
          currentMeters={currentMeters}
          handleUpdateOldMeterUI={handleUpdateOldMeterUI}
          handleUpdateMeterUI={handleUpdateMeterUI}
          setEditingMeter={setEditingMeter}
          setIsAddMeterModalOpen={setIsAddMeterModalOpen}
          setMappingMeter={setMappingMeter}
          handleSaveMetersAndGenerateBills={handleSaveMetersAndGenerateBills}
        />
        }

        {activeTab === 'finance' && canAccessFinance && <FinancePage
          canViewProfit={canViewProfit}
          isFinanceStatsOpen={isFinanceStatsOpen}
          setIsFinanceStatsOpen={setIsFinanceStatsOpen}
          isMonthOpen={isMonthOpen}
          setIsMonthOpen={setIsMonthOpen}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          monthLabels={monthLabels}
          financeStats={financeStats}
          currentTransactions={currentTransactions}
          canManageTransactions={canManageTransactions}
          setEditingTransaction={setEditingTransaction}
          setTxType={setTxType}
          setSelectedCat={setSelectedCat}
          setIsAddTransactionModalOpen={setIsAddTransactionModalOpen}
        />
        }

        {activeTab === 'savings' && <SavingsPage
          isSavingsStatsOpen={isSavingsStatsOpen}
          setIsSavingsStatsOpen={setIsSavingsStatsOpen}
          uniqueBankNames={uniqueBankNames}
          collapsedSavingsBanks={collapsedSavingsBanks}
          setCollapsedSavingsBanks={setCollapsedSavingsBanks}
          summarySavings={summarySavings}
          currentSavings={currentSavings}
          unselectedSavingsBanks={unselectedSavingsBanks}
          setUnselectedSavingsBanks={setUnselectedSavingsBanks}
          setEditingSaving={setEditingSaving}
          setIsAddSavingModalOpen={setIsAddSavingModalOpen}
        />
        }

        {activeTab === 'ai' && <AiChatPage
          aiMessages={aiMessages}
          isAiLoading={isAiLoading}
          handleAiChat={handleAiChat}
        />
        }

        {activeTab === 'profile' && <ProfilePage
          user={user}
          getRoleLabel={getRoleLabel}
          handleLogout={handleLogout}
          changePasswordForm={changePasswordForm}
          setChangePasswordForm={setChangePasswordForm}
          handleChangePassword={handleChangePassword}
        />
        }

        {activeTab === 'settings' && isOwnerOrAdmin && (
          <div className="space-y-4 animate-in fade-in pb-20">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white shadow-lg flex items-center justify-center text-white"><User className="w-6 h-6" /></div>
                <div><h3 className="font-black text-sm uppercase text-slate-800 leading-none">{user.fullName || 'ADMIN'}</h3><p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1.5 bg-blue-50 px-3 py-0.5 rounded-full w-fit">Chủ cơ sở</p></div>
              </div>
              <button onClick={handleLogout} className="p-2 bg-red-50 text-red-600 rounded-xl active:scale-90 transition-all flex flex-col items-center justify-center shadow-sm border border-red-100 hover:bg-red-100">
                <LogOut className="w-5 h-5 mb-1" />
                <span className="text-[8px] font-black uppercase tracking-widest">Đăng xuất</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setSettingsExpanded(prev => ({ ...prev, services: !prev.services }))}
                className="w-full bg-blue-600 px-5 py-4 flex items-center justify-between active:bg-blue-700 transition-colors"
              >
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Bảng giá dịch vụ</h4>
                <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${settingsExpanded.services ? 'rotate-180' : ''}`} />
              </button>
              {settingsExpanded.services && (
                <div className="p-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Điện (/kWh)</label><input type="text" value={formatN(config.priceElec)} onChange={e => setConfig({ ...config, priceElec: parseN(e.target.value) })} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Tính tiền nước</label>
                      <select value={config.waterCalcMethod || 'person'} onChange={e => setConfig({ ...config, waterCalcMethod: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none appearance-none focus:border-blue-600 border border-transparent transition-all">
                        <option value="person">Theo người</option><option value="m3">Theo khối</option>
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Giá Nước</label><input type="text" value={formatN(config.waterCalcMethod === 'person' ? config.priceWaterPerson : config.priceWaterM3)} onChange={e => setConfig({ ...config, [config.waterCalcMethod === 'person' ? 'priceWaterPerson' : 'priceWaterM3']: parseN(e.target.value) })} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Phí Dịch Vụ</label><input type="text" value={formatN(config.priceService)} onChange={e => setConfig({ ...config, priceService: parseN(e.target.value) })} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Internet</label><input type="text" value={formatN(config.priceNet)} onChange={e => setConfig({ ...config, priceNet: parseN(e.target.value) })} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Xe máy điện</label><input type="text" value={formatN(config.priceEBike)} onChange={e => setConfig({ ...config, priceEBike: parseN(e.target.value) })} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="col-span-2 mt-2">
                      <button onClick={handleSaveConfig} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-blue-800 active:translate-y-1 transition-all"><Save className="w-4 h-4" /> Lưu cấu hình</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden text-center">
              <div className="bg-blue-600 px-5 py-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSettingsExpanded(prev => ({ ...prev, qr: !prev.qr }))}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Thông tin VietQR</h4>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${settingsExpanded.qr ? 'rotate-180' : ''}`} />
                </button>

                <input type="file" accept="image/*" ref={qrFileRef} className="hidden" onChange={handleUploadQR} />

                <button
                  onClick={() => qrFileRef.current?.click()}
                  disabled={isScanningQR}
                  className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isScanningQR ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                  {isScanningQR ? "Đang quét..." : "Upload QR"}
                </button>
              </div>

              {settingsExpanded.qr && (
                <div className="p-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1 col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Ngân hàng</label><input type="text" value={config.bankName || ""} onChange={e => setConfig({ ...config, bankName: e.target.value })} placeholder="VD: MB BANK" className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Mã BIN</label><input type="text" value={config.bankBin || "970422"} onChange={e => setConfig({ ...config, bankBin: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Số tài khoản</label><input type="text" value={config.bankAcc || ""} onChange={e => setConfig({ ...config, bankAcc: e.target.value })} placeholder="9999..." className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all" /></div>
                    <div className="col-span-2 mt-2">
                      <button onClick={handleSaveConfig} className="w-full bg-slate-800 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-slate-950 active:translate-y-1 transition-all"><Save className="w-4 h-4" /> Lưu STK VietQR</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setSettingsExpanded(prev => ({ ...prev, pass: !prev.pass }))}
                className="w-full bg-blue-600 px-5 py-4 flex items-center justify-between active:bg-blue-700 transition-colors"
              >
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Đổi Mật Khẩu</h4>
                <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${settingsExpanded.pass ? 'rotate-180' : ''}`} />
              </button>
              {settingsExpanded.pass && (
                <form onSubmit={handleChangePassword} className="p-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase px-1">Mật khẩu cũ</label>
                      <input type="password" value={changePasswordForm.oldPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, oldPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Mật khẩu mới</label>
                        <input type="password" value={changePasswordForm.newPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Xác nhận MK mới</label>
                        <input type="password" value={changePasswordForm.confirmNewPassword || ''} onChange={e => setChangePasswordForm({ ...changePasswordForm, confirmNewPassword: e.target.value })} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none focus:border-rose-600 border border-transparent transition-all" required />
                      </div>
                    </div>
                    <div className="mt-2">
                      <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-rose-800 active:translate-y-1 transition-all"><Lock className="w-4 h-4" /> Xác Nhận Đổi Mật Khẩu</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}


        {/* --- HÓA ĐƠN --- */}
        <OverwriteBillModal
          isOverwriteModalOpen={isOverwriteModalOpen}
          setIsOverwriteModalOpen={setIsOverwriteModalOpen}
          executeGenerateBills={executeGenerateBills}
        />

        {isAddTransactionModalOpen && (
          <Modal title="Ghi sổ thu chi" onClose={() => setIsAddTransactionModalOpen(false)}>
            <AddTransactionForm
              onSave={handleAddTx}
              onDelete={handleDeleteTransaction}
              editingTransaction={editingTransaction}
              canManageTransactions={canManageTransactions}
              txType={txType}
              setTxType={setTxType}
              selectedCat={selectedCat}
              setSelectedCat={setSelectedCat}
              isCatOpen={isCatOpen}
              setIsCatOpen={setIsCatOpen}
            />
          </Modal>
        )}

        {/* LỖI PHÂN QUYỀN */}
        {((activeTab === 'finance' && !canAccessFinance) || (activeTab === 'settings' && !isManagerOrAbove)) && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-800 uppercase">Không có quyền truy cập</h3>
            <p className="text-xs text-slate-500 mt-2">Chức năng này chỉ dành cho Chủ Sở Hữu.</p>
            <button onClick={() => setActiveTab('dashboard')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase">Về trang chủ</button>
          </div>
        )}
      </main>

      {!['savings', 'profile'].includes(activeTab) && (
        <>
          {/* FOOTER TAB BAR */}
          <TabBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setSearchQuery={setSearchQuery}
            shouldShowMeterBanner={shouldShowMeterBanner}
            canAccessFinance={canAccessFinance}
            showQuickMenu={showQuickMenu}
            setShowQuickMenu={setShowQuickMenu}
          />

          {/* QUICK MENU */}
          <QuickMenu
            showQuickMenu={showQuickMenu}
            setShowQuickMenu={setShowQuickMenu}
            setEditingRoom={setEditingRoom}
            setIsAddRoomModalOpen={setIsAddRoomModalOpen}
            shouldShowMeterBanner={shouldShowMeterBanner}
            setActiveTab={setActiveTab}
            setIsAddTransactionModalOpen={setIsAddTransactionModalOpen}
            user={user}
            handleLogout={handleLogout}
          />
        </>
      )}


      {/* BIÊN LAI CHI TIẾT VÀ ẢNH HÓA ĐƠN ẨN */}
      <BillReceipt
        bottomSheet={bottomSheet}
        setBottomSheet={setBottomSheet}
        config={config}
        API_URL={API_URL}
        isManagerOrAbove={isManagerOrAbove}
        isOwnerOrAdmin={isOwnerOrAdmin}
        isGeneratingImage={isGeneratingImage}
        handleDiscountChange={handleDiscountChange}
        handleDiscountBlur={handleDiscountBlur}
        handleShareZaloImage={handleShareZaloImage}
        handleDeleteBill={handleDeleteBill}
        handlePayBill={handlePayBill}
      />


      {/* MODALS PHỤ TRỢ (Mở bằng nút + ở Quick Menu hoặc Search Bar) */}
      {isAddRoomModalOpen && (
        <Modal title={editingRoom ? "Cập nhật phòng" : "Thêm phòng mới"} onClose={() => setIsAddRoomModalOpen(false)}>
          <AddRoomForm onSave={handleAddRoom} onDelete={handleDeleteRoom} editingRoom={editingRoom} sharedHeaters={meters.filter(m => m.type === 'heater' && m.houseId === selectedHouse?.id)} />
        </Modal>
      )}

      <MeterMappingModal
        mappingMeter={mappingMeter}
        setMappingMeter={setMappingMeter}
        rooms={rooms}
        selectedHouse={selectedHouse}
        setMeters={setMeters}
        handleSaveMeterMapping={handleSaveMeterMapping}
      />

      {isAddMeterModalOpen && (
        <Modal title={editingMeter ? "Cập nhật công tơ" : "Thêm công tơ mới"} onClose={() => { setIsAddMeterModalOpen(false); setEditingMeter(null); }}>
          <AddMeterForm onSave={handleSaveMeter} onDelete={handleDeleteMeter} editingMeter={editingMeter} />
        </Modal>
      )}

      {isAddSavingModalOpen && (
        <Modal title={editingSaving ? "Cập nhật sổ tiết kiệm" : "Thêm sổ tiết kiệm"} onClose={() => setIsAddSavingModalOpen(false)}>
          <AddSavingForm onSave={handleAddSaving} onDelete={handleDeleteSaving} editingSaving={editingSaving} uniqueBankNames={uniqueBankNames} />
        </Modal>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body { background-color: #f8fafc; margin: 0; padding: 0; width: 100%; height: 100%; min-height: 100vh; overflow: hidden !important; position: static !important; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        textarea, input, select { outline: none; }
      `}</style>
    </div>
  );
}

export default App;