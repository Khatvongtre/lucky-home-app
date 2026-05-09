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

// --- Tách Component & Utils (Giai đoạn 1 & 2) ---
import { TRANSACTION_CATEGORIES } from './utils/constants';
import { formatN, parseN } from './utils/formatters';
import { diffDays, getDueInfo, endContract, getSafeDate } from './utils/date';
import { parseVietQR, getBankNameFromBin } from './utils/qr';
import { exportToClipboard } from './utils/imageExport';
import { readQRFromFile } from './utils/qrReader';

import Modal from './components/common/Modal';
import ToastNotification from './components/common/Toast';
import ConfirmDialog from './components/common/ConfirmDialog';

import Header from './components/layout/Header';
import TabBar from './components/layout/TabBar';
import QuickMenu from './components/layout/QuickMenu';

import AuthView from './pages/AuthView';
import HubView from './pages/HubView';
import DashboardView from './pages/DashboardView';
import RoomsView from './pages/RoomsView';
import BillsView from './pages/BillsView';
import MetersView from './pages/MetersView';
import FinanceView from './pages/FinanceView';
import SavingsView from './pages/SavingsView';
import AiChatView from './pages/AiChatView';
import ProfileView from './pages/ProfileView';
import HouseSelectionView from './pages/HouseSelectionView';
import AddRoomForm from './components/rooms/AddRoomForm';
import AddMeterForm from './components/meters/AddMeterForm';
import AddSavingForm from './components/savings/AddSavingForm';
import AddTransactionForm from './components/finance/AddTransactionForm';
import BillReceipt from './components/bills/BillReceipt';
import AddHouseForm from './components/houses/AddHouseForm';
import FundView from './pages/FundView';
import FastInputView from './pages/FastInputView';

import AiPromptModal from './components/houses/AiPromptModal';
import ShareHouseModal from './components/houses/ShareHouseModal';
import OverwriteBillModal from './components/bills/OverwriteBillModal';
import MeterMappingModal from './components/meters/MeterMappingModal';
import { api } from './services/api';

// ==========================================
// CẤU HÌNH API BACKEND (.NET 8)
// ==========================================
const API_URL = import.meta.env.VITE_API_URL;
console.log("API URL:", API_URL);

// ==========================================
// ỨNG DỤNG CHÍNH
// ==========================================
const App = () => {
  // ==========================================
  // 1. GLOBAL STATES
  // ==========================================

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [changePasswordForm, setChangePasswordForm] = useState({ oldPassword: '', newPassword: '' });

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

  const [houses, setHouses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [meters, setMeters] = useState([]);
  const [dashboardWarnings, setDashboardWarnings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [billStats, setBillStats] = useState({ totalRooms: 0, totalBillPaids: 0, totalBillNotPaids: 0, totalAmountPaids: 0 });
  const [config, setConfig] = useState({});
  const [aiMessages, setAiMessages] = useState([{
    role: 'assistant',
    text: 'Chào bạn! Tôi là trợ lý AI. Hệ thống đang sẵn sàng. Bạn có thể hỏi tôi để phân tích dữ liệu hoặc chọn thao tác nhanh dưới đây:',
    actions: [
      { code: 'FAST_INPUT', label: 'Nhập siêu tốc AI' },
      { code: 'ADD_TRANSACTION', label: 'Ghi sổ thu chi' },
      { code: 'VIEW_FUNDS', label: 'Xem sổ quỹ' },
      { code: 'METER_INPUT', label: 'Chốt điện nước' },
      { code: 'VIEW_BILLS', label: 'Quản lý hóa đơn' },
      { code: 'ADD_ROOM', label: 'Thêm phòng mới' },
      { code: 'ADD_SAVING', label: 'Sổ tiết kiệm' }
    ]
  }]);

  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [txType, setTxType] = useState('in');
  const [selectedCat, setSelectedCat] = useState('OTHER');
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('this-month');
  const [isFinanceStatsOpen, setIsFinanceStatsOpen] = useState(true);
  const [isSavingsStatsOpen, setIsSavingsStatsOpen] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionToSelectHouse, setActionToSelectHouse] = useState(null);
  const [highlightedItemId, setHighlightedItemId] = useState(null);

  // Quản lý lịch sử điều hướng nội bộ
  const historyRef = useRef([]);
  const isGoingBackRef = useRef(false);

  // ==========================================
  // 2. HELPER FUNCTIONS & EFFECTS
  // ==========================================

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
    historyRef.current = [];
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => handleLogout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [handleLogout]);

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

      await api.post('/auth/change-password', {
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

  const loadSavings = useCallback(async () => {
    try {
      const savingsData = await api.get(`/saving`);
      setSavings(savingsData);
    } catch (e) {
      setSavings([]);
    }
  }, []);

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
    const data = await api.get('/house');
    setHouses(data);
    return data;
  }, []);

  const loadWarnings = useCallback(async () => {
    try {
      const data = await api.get('/management/dashboard/warnings');
      setDashboardWarnings(data);
    } catch (e) {
      console.error("Lỗi tải cảnh báo:", e.message);
    }
  }, []);

  const loadDashboardData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [summaryData] = await Promise.all([
      api.get(`/management/dashboard/summary/${houseId}?year=${year}&month=${month}`),
    ]);
    setDashboardSummary(summaryData);
  }, [viewDate]);

  const loadRoomsData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [roomsData] = await Promise.all([
      api.get(`/room/${houseId}`),
    ]);
    setRooms(roomsData);
  }, [viewDate]);

  const loadMetersData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [metersData] = await Promise.all([
      api.get(`/meter/${houseId}?year=${year}&month=${month}`)
    ]);
    setMeters(parseMeters(metersData));
  }, [parseMeters, viewDate]);

  const loadBillsData = useCallback(async (houseId) => {
    const month = viewDate.getMonth() + 1;
    const year = viewDate.getFullYear();
    const [billsResult] = await Promise.all([
      api.get(`/bill/${houseId}?year=${year}&month=${month}`)
    ]);
    const billsData = Array.isArray(billsResult) ? billsResult : (billsResult?.bills || []);
    setBillStats({
      totalRooms: billsResult?.totalRooms ?? 0,
      totalBillPaids: billsResult?.totalBillPaids ?? billsData.filter(b => b.status === 'paid').length,
      totalBillNotPaids: billsResult?.totalBillNotPaids ?? billsData.filter(b => b.status !== 'paid').length,
      totalAmountPaids: billsResult?.totalAmountPaids ?? billsData.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.total || 0), 0)
    });
    setBills(parseBills(billsData));
  }, [parseBills, viewDate]);

  const loadTransactions = useCallback(async (houseId) => {
    const txData = await api.get(`/transaction/${houseId}?type=${selectedMonth}`);
    setTransactions(txData);
  }, [selectedMonth]);

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
    if (isGoingBackRef.current) {
      isGoingBackRef.current = false;
      return;
    }
    const lastState = historyRef.current[historyRef.current.length - 1];
    if (!lastState || lastState.isHubMode !== isHubMode || lastState.selectedHouse?.id !== selectedHouse?.id || lastState.activeTab !== activeTab) {
      historyRef.current.push({ isHubMode, selectedHouse, activeTab });
    }
  }, [isHubMode, selectedHouse, activeTab]);

  const goBack = useCallback(() => {
    if (historyRef.current.length > 1) {
      historyRef.current.pop();
      const prevState = historyRef.current[historyRef.current.length - 1];
      isGoingBackRef.current = true;
      setIsHubMode(prevState.isHubMode);
      setSelectedHouse(prevState.selectedHouse);
      setActiveTab(prevState.activeTab);
      setHighlightedItemId(null);
    } else {
      // Fallback khi hết lịch sử
      if (!selectedHouse || activeTab === 'dashboard') {
        setIsHubMode(true);
        setSelectedHouse(null);
        setActiveTab('dashboard');
      } else {
        setActiveTab('dashboard');
      }
      setHighlightedItemId(null);
    }
  }, [selectedHouse, activeTab]);

  // ==========================================
  // 4. MAIN EFFECTS
  // ==========================================

  // Hỗ trợ Direct Link (Truy cập bằng link trực tiếp /chitieu)
  useEffect(() => {
    const pathName = window.location.pathname;

    let targetTab = null;
    if (pathName === '/chitieu' || pathName === '/chitieu/') {
      targetTab = 'fast_input';
    }

    if (targetTab) {
      const token = localStorage.getItem('smartstay_token');
      if (!token) {
        // Nếu chưa đăng nhập, lưu lại ý định để chuyển hướng sau
        sessionStorage.setItem('redirectAfterLogin', targetTab);
      } else {
        setIsHubMode(false);
        setActiveTab(targetTab);
      }
    }
  }, []);

  // Lắng nghe đăng nhập thành công để chuyển hướng nếu có Direct Link
  useEffect(() => {
    if (isLoggedIn) {
      const pendingTab = sessionStorage.getItem('redirectAfterLogin');
      if (pendingTab) {
        setIsHubMode(false);
        setActiveTab(pendingTab);
        sessionStorage.removeItem('redirectAfterLogin');

        // Dọn dẹp URL trên thanh địa chỉ nếu đang ở /chitieu
        if (window.location.pathname.includes('/chitieu')) {
          window.history.replaceState({}, document.title, "/");
        }
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && isHubMode) {
      loadWarnings();
    }
  }, [isLoggedIn, isHubMode, loadWarnings]);

  useEffect(() => {
    const token = localStorage.getItem('smartstay_token');
    const savedUser = localStorage.getItem('smartstay_user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    } else {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    if (isLoggedIn && !selectedHouse) {
      loadHouses().catch(err => showToast(err.message, 'error'));
    }
  }, [isLoggedIn, selectedHouse, loadHouses, showToast]);

  useEffect(() => {
    if (isLoggedIn && activeTab !== 'finance') {
      loadTabData(activeTab, selectedHouse?.id);
    }
  }, [isLoggedIn, activeTab, selectedHouse?.id, viewDate, selectedMonth, loadTabData]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (activeTab !== 'finance' || !selectedHouse?.id) return;
      try {
        const txData = await api.get(`/transaction/${selectedHouse.id}?type=${selectedMonth}`);
        setTransactions(txData);
      } catch (e) { console.error("Lỗi khi tải giao dịch:", e.message); }
    };
    loadTransactions();
  }, [activeTab, selectedMonth, selectedHouse?.id]);

  // ==========================================
  // 5. MEMOIZED DATA & COMPUTED VALUES
  // ==========================================

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

  // ==========================================
  // 6. ACTION HANDLERS (CRUD)
  // ==========================================

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
        await api.put(`/saving/${editingSaving.id}`, payload);
        showToast("Đã cập nhật sổ tiết kiệm!", "success");
      } else {
        payload.id = crypto.randomUUID();
        await api.post('/saving', payload);
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
      await api.delete(`/saving/${id}`);
      await loadSavings();
      setIsAddSavingModalOpen(false);
      setEditingSaving(null);
      showToast("Đã xóa sổ tiết kiệm", "success");
    } catch (e) { showToast("Lỗi xóa: " + e.message, "error"); }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/house/${sharingHouse.id}/assign`, assignForm);
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
        await api.put(`/house/${editingHouse.id}`, houseData);
        setHouses(houses.map(h => h.id === editingHouse.id ? { ...h, ...houseData } : h));
        showToast("Cập nhật cơ sở thành công!", "success");
      } else {
        const res = await api.post('/house', houseData);
        setHouses([...houses, res]);
        showToast("Tạo cơ sở thành công!", "success");
      }
      const data = await api.get('/house');
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
      const res = await api.post('/house/ai-generate', { prompt: aiPrompt });
      if (res.isSuccess === false) {
        setAiFeedback(res.message);
        showToast("AI cần thêm thông tin!", "error");
      } else {
        const updatedHouses = await api.get('/house');
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
      await api.post('/room', payload);
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
      await api.delete(`/house/${houseId}`);
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
      await api.delete(`/room/${roomId}`);
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
      await api.delete(`/transaction/${txId}`);
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
        await api.post(`/meter/save`, payload);
        showToast("Đã cập nhật công tơ!", "success");
      } else {
        await api.post('/meter/save', payload);
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
      await api.delete(`/meter/${meterId}`);
      await loadHouseData(selectedHouse?.id);
      setIsAddMeterModalOpen(false);
      setEditingMeter(null);
      showToast("Đã xóa công tơ", "success");
    } catch (err) { showToast("Lỗi: " + err.message, "error"); }
  };

  const handleSaveMeterMapping = async () => {
    if (!mappingMeter) return;
    try {
      await api.put(`/meter/${mappingMeter.id}/map`, { roomIds: mappingMeter.roomIds });
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
      await api.post('/meter/update', updates);

      const res = await api.post('/bill/generate', {
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
      await api.post('/bill/generate', {
        houseId: selectedHouse?.id,
        month: month,
        year: year,
        overwrite: true
      });
      await loadHouseData(selectedHouse?.id);
      showToast("Đã lập hóa đơn thành công!", "success");
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handleDiscountUpdate = async (billId, dVal) => {
    const targetBill = bills.find(b => b.id === billId);
    if (!targetBill) return;

    // Nếu giá trị không đổi thì bỏ qua, không tính toán hay gọi API
    if ((targetBill.details.discount || 0) === dVal) return;

    const baseTotal = targetBill.details.rent + targetBill.details.elec + (targetBill.details.heater || 0) + targetBill.details.water + (targetBill.details.internet || 0) + (targetBill.details.service || 0) + (targetBill.details.ebikes || 0);
    const newTotal = Math.max(0, baseTotal - dVal);

    const updatedBillData = {
      ...targetBill,
      total: newTotal,
      details: { ...targetBill.details, discount: dVal }
    };

    // Cập nhật giao diện lập tức cho mượt
    setBills(prev => prev.map(b => b.id === billId ? updatedBillData : b));
    if (bottomSheet && bottomSheet.data.id === billId) {
      setBottomSheet({ ...bottomSheet, data: updatedBillData });
    }

    try {
      await api.put(`/bill/${billId}/discount`, {
        discount: dVal,
        total: newTotal,
        details: updatedBillData.details
      });
      await loadHouseData(selectedHouse?.id);
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
        await api.put(`/transaction/${editingTransaction.id}`, payload);
        showToast("Đã cập nhật phiếu thu chi!", "success");
      } else {
        payload.id = crypto.randomUUID();
        await api.post('/transaction', payload);
        showToast("Đã ghi sổ thu chi!", "success");
      }
      await loadHouseData(selectedHouse?.id);
      setIsAddTransactionModalOpen(false);
      setEditingTransaction(null);
    } catch (e) { showToast("Lỗi: " + e.message, "error"); }
  };

  const handlePayBill = async (billId) => {
    try {
      await api.post(`/bill/pay/${billId}`);
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
      await api.delete(`/bill/${billId}`);
      await loadHouseData(selectedHouse?.id);
      showToast("Đã xóa hóa đơn thành công!", "success");
      setBottomSheet(null);
    } catch (e) { showToast("Lỗi xóa hóa đơn: " + e.message, "error"); }
  };

  const handleSaveConfig = async () => {
    try {
      await api.put(`/house/${selectedHouse?.id}/config`, config);
      showToast("Đã lưu cấu hình lên máy chủ!", "success");
    } catch (e) { showToast("Đã có lỗi xảy ra ! (" + e.message + ")", "error"); }
  };

  const executeAiAction = (actionType) => {
    const houseRequiredActions = ['METER_INPUT', 'ADD_ROOM', 'ADD_TRANSACTION', 'VIEW_BILLS'];
    if (houseRequiredActions.includes(actionType) && !selectedHouse) {
      setActionToSelectHouse(actionType);
      return;
    }

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
    }
  };

  // Xử lý thao tác đang chờ sau khi người dùng chọn cơ sở
  useEffect(() => {
    if (selectedHouse && pendingAction) {
      const action = pendingAction;
      setPendingAction(null); // Xóa trạng thái chờ
      setTimeout(() => {
        switch (action) {
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
          case 'VIEW_BILLS':
            setActiveTab('bills');
            break;
        }
      }, 50); // Cần trễ một nhịp nhỏ để hoạt ảnh đổi Tab diễn ra mượt mà
    }
  }, [selectedHouse, pendingAction]);

  const handleAiChat = async (text, imageBase64 = null) => {
    if (!text?.trim() && !imageBase64) return;

    setAiMessages(prev => [...prev, { role: 'user', text, image: imageBase64 }]);
    setIsAiLoading(true);
    try {
      const res = await api.post('/ai/chat', { houseId: selectedHouse?.id, prompt: text, imageBase64 });

      let actions = res.actions ? [...res.actions] : [];
      if (actions.length === 0) {
        const checkText = (text + " " + (res.text || '')).toLowerCase();
        if (checkText.includes('thêm nhà') || checkText.includes('tạo nhà') || checkText.includes('thêm cơ sở')) actions.push({ code: 'ADD_HOUSE', label: 'Thêm cơ sở mới' });
        if (checkText.includes('tiết kiệm') || checkText.includes('thêm sổ')) actions.push({ code: 'ADD_SAVING', label: 'Thêm sổ tiết kiệm' });
        if (checkText.includes('chốt điện') || checkText.includes('chốt số') || checkText.includes('nhập số điện') || checkText.includes('ghi điện')) actions.push({ code: 'METER_INPUT', label: 'Chốt số điện/nước' });
        if (checkText.includes('thêm phòng') || checkText.includes('tạo phòng')) actions.push({ code: 'ADD_ROOM', label: 'Thêm phòng mới' });
        if (checkText.includes('thu chi') || checkText.includes('chi tiêu') || checkText.includes('nạp tiền') || checkText.includes('khoản chi') || checkText.includes('giao dịch')) actions.push({ code: 'ADD_TRANSACTION', label: 'Ghi sổ thu chi' });
        if (checkText.includes('siêu tốc') || checkText.includes('ai nhập')) actions.push({ code: 'FAST_INPUT', label: 'Nhập siêu tốc AI' });
        if (checkText.includes('hóa đơn') || checkText.includes('xem hóa đơn')) actions.push({ code: 'VIEW_BILLS', label: 'Quản lý hóa đơn' });
        if (checkText.includes('sổ quỹ') || checkText.includes('xem quỹ')) actions.push({ code: 'VIEW_FUNDS', label: 'Xem sổ quỹ' });
      }
      actions = actions.filter((v, i, a) => a.findIndex(t => (t.code === v.code)) === i);

      setAiMessages(prev => [...prev, { role: 'assistant', text: res.text, actions }]);
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

    try {
      await exportToClipboard(`receipt-export-${billData.id}`);
      showToast("Đã copy ảnh vào clipboard!", "success");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Lỗi khi xuất ảnh", "error");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleUploadQR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningQR(true);
    try {
      const qrData = await readQRFromFile(file);
      const { bin, acc } = parseVietQR(qrData);
      if (bin && acc) {
        setConfig(prev => ({ ...prev, bankBin: bin, bankAcc: acc, bankName: getBankNameFromBin(bin) }));
        showToast("Tuyệt vời! Đã nhận diện thành công mã VietQR.", "success");
      } else {
        showToast("QR không đúng chuẩn VietQR hoặc không có số tài khoản.", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsScanningQR(false);
    }
    e.target.value = null;
  };

  // ==========================================
  // 7. RENDER QUYẾT ĐỊNH LUỒNG
  // ==========================================

  // Các tab hiển thị độc lập, không cần thiết phải ở trong một House cụ thể
  const isGlobalTab = ['savings', 'ai', 'profile', 'fund', 'fast_input'].includes(activeTab);

  // 1. CHƯA ĐĂNG NHẬP -> HIỂN THỊ FORM LOGIN/REGISTER
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-left animate-in fade-in duration-700">
        <ToastNotification toast={toast} />
        <AuthView setIsLoggedIn={setIsLoggedIn} setUser={setUser} showToast={showToast} />
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
        dashboardWarnings={dashboardWarnings}
        setHighlightedItemId={setHighlightedItemId}
      />
    );
  }

  // 3. ĐÃ ĐĂNG NHẬP NHƯNG CHƯA CHỌN CƠ SỞ (Đang ở mode Quản lý nhà)
  if (isLoggedIn && !selectedHouse && !isGlobalTab) {
    return (
      <HouseSelectionView
        user={user}
        houses={houses}
        houseSearchQuery={houseSearchQuery}
        setHouseSearchQuery={setHouseSearchQuery}
        selectedStatsHouses={selectedStatsHouses}
        setSelectedStatsHouses={setSelectedStatsHouses}
        setIsHubMode={setIsHubMode}
        handleLogout={handleLogout}
        setSelectedHouse={setSelectedHouse}
        setConfig={setConfig}
        setActiveTab={setActiveTab}
        setSearchQuery={setSearchQuery}
        handleOpenShare={handleOpenShare}
        setEditingHouse={setEditingHouse}
        setIsAiCreateHouseOpen={setIsAiCreateHouseOpen}
        handleDeleteHouse={handleDeleteHouse}
        toast={toast}
        confirmDialog={confirmDialog}
        closeConfirmDialog={closeConfirmDialog}
        isShareModalOpen={isShareModalOpen}
        setIsShareModalOpen={setIsShareModalOpen}
        sharingHouse={sharingHouse}
        setSharingHouse={setSharingHouse}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        handleAssignRole={handleAssignRole}
        isAiCreateHouseOpen={isAiCreateHouseOpen}
        handleAddHouse={handleAddHouse}
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
        editingHouse={editingHouse}
        setHighlightedItemId={setHighlightedItemId}
      />
    );
  }

  // MÀN HÌNH NHẬP NHANH BẰNG AI (Full screen)
  if (activeTab === 'fast_input') {
    return (
      <div className="h-screen bg-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-800 shadow-2xl overflow-hidden">
        <ToastNotification toast={toast} />
        <FastInputView setActiveTab={setActiveTab} showToast={showToast} />
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
        goBack={goBack}
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

        {activeTab === 'dashboard' && <DashboardView
          shouldShowMeterBanner={shouldShowMeterBanner}
          setActiveTab={setActiveTab}
          dashboardSummary={dashboardSummary}
          canViewProfit={canViewProfit}
          isOwnerOrAdmin={isOwnerOrAdmin}
          revenueChartData={revenueChartData}
        />
        }

        {activeTab === 'rooms' && <RoomsView
          currentRooms={currentRooms}
          setEditingRoom={setEditingRoom}
          setIsAddRoomModalOpen={setIsAddRoomModalOpen}
          isManagerOrAbove={isManagerOrAbove}
        />
        }

        {activeTab === 'bills' && <BillsView
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          monthDisplay={monthDisplay}
          billStats={billStats}
          currentBills={currentBills}
          setBottomSheet={setBottomSheet}
        />
        }

        {activeTab === 'meters_list' && <MetersView
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
          viewDate={viewDate}
          rooms={rooms}
          highlightedItemId={highlightedItemId}
          setHighlightedItemId={setHighlightedItemId}
        />
        }

        {activeTab === 'finance' && canAccessFinance && <FinanceView
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

        {activeTab === 'savings' && <SavingsView
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

        {activeTab === 'fund' && <FundView
          showToast={showToast}
          requestConfirm={requestConfirm}
          setActiveTab={setActiveTab}
        />}

        {activeTab === 'ai' && <AiChatView
          aiMessages={aiMessages}
          isAiLoading={isAiLoading}
          handleAiChat={handleAiChat}
          setAiMessages={setAiMessages}
          requestConfirm={requestConfirm}
          showToast={showToast}
          executeAiAction={executeAiAction}
        />
        }

        {activeTab === 'fast_input' && (
          // Dự phòng render ở đây
          <FastInputView setActiveTab={setActiveTab} showToast={showToast} />
        )}

        {activeTab === 'profile' && <ProfileView
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

      {!['savings', 'profile', 'fund', 'ai', 'fast_input'].includes(activeTab) && (
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
            setIsHubMode={setIsHubMode}
            selectedHouse={selectedHouse}
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
        handleDiscountUpdate={handleDiscountUpdate}
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

      {actionToSelectHouse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setActionToSelectHouse(null)}></div>
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-[15px] font-black text-indigo-900 uppercase tracking-tight">Chọn cơ sở</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Để tiếp tục thao tác</p>
              </div>
              <button onClick={() => setActionToSelectHouse(null)} className="w-8 h-8 bg-slate-200/50 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto no-scrollbar flex-1 space-y-2.5 bg-slate-50/30">
              {houses.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-xs font-bold text-slate-500">Bạn chưa có cơ sở nào.</p>
                </div>
              )}
              {houses.map(h => (
                <button key={h.id} onClick={() => {
                  setSelectedHouse(h);
                  setConfig({ ...h });
                  setPendingAction(actionToSelectHouse);
                  setActionToSelectHouse(null);
                }} className="w-full p-3.5 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md hover:shadow-blue-100/50 rounded-2xl text-left active:scale-[0.98] transition-all flex items-center gap-3.5 group">
                  <div className="w-12 h-12 rounded-xl bg-blue-50/50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-blue-100 group-hover:border-blue-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-blue-700 transition-colors">{h.name}</p>
                      <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase shrink-0">{h.userRole || user?.role}</span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 truncate">{h.address || 'Chưa cập nhật địa chỉ'}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
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