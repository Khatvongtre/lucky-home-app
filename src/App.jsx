import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Home, Zap, Wallet, Plus,
  TrendingUp, ChevronRight, Sparkles, Send,
  X, Receipt, Building2, QrCode, MapPin, Users2,
  Lock, LogOut, ShieldCheck, User, CheckCircle2, ArrowRight,
  PlusCircle, Save, Settings, FileText, UserCheck, CircleDollarSign,
  Activity, Wifi, Edit3, Boxes, Search, MoreHorizontal, Droplets, Bike, ChevronLeft,
  Upload, Mail, Mic, MicOff, PieChart
} from 'lucide-react';

// ==========================================
// CÁC HÀM TIỆN ÍCH (UTILS)
// ==========================================

const formatN = (num) => {
  if (!num && num !== 0) return "";
  const n = typeof num === 'string' ? num.replace(/\./g, "") : num;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseN = (val) => {
  if (typeof val !== 'string') return val;
  return parseInt(val.replace(/\./g, "")) || 0;
};

const diffDays = (dateStr) => {
  if (!dateStr) return 0;
  try {
    const target = new Date(dateStr);
    const now = new Date();
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return 0;
  }
};

// ==========================================
// COMPONENT CON
// ==========================================

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-[90vh] relative animate-in zoom-in-95 duration-300">
      <div className="sticky top-0 bg-blue-600 flex justify-between items-center p-3.5 shrink-0 rounded-t-xl z-10">
        <h3 className="font-black text-white uppercase text-[10px] tracking-widest">{title}</h3>
        <button onClick={onClose} className="p-1.5 bg-white/20 rounded-lg text-white active:scale-90 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto no-scrollbar">{children}</div>
    </div>
  </div>
);

const AddRoomForm = ({ onSave, editingRoom, sharedHeaters }) => {
  const [heaterType, setHeaterType] = useState(editingRoom?.heaterMeterId ? 'shared' : 'private');

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase px-1">Mã phòng</label>
          <input name="rid" defaultValue={editingRoom?.id} placeholder="101" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase px-1">Giá thuê</label>
          <input name="price" type="text" defaultValue={formatN(editingRoom?.price || 0)} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-blue-600" onInput={(e) => e.target.value = formatN(parseN(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase px-1">Số cư dân</label>
          <input name="people" type="number" defaultValue={editingRoom?.people || 2} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase px-1">Xe máy điện</label>
          <input name="ebikes" type="number" defaultValue={editingRoom?.eBikes || 0} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Ngày ký Hợp đồng</label>
        <input name="start" type="date" defaultValue={editingRoom?.contractStart || new Date().toISOString().split('T')[0]} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase px-1">Hạn đóng (Ngày)</label>
          <input name="payDay" type="number" defaultValue={editingRoom?.paymentDate || 5} min="1" max="31" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase px-1">Thời hạn (Tháng)</label>
          <input name="months" type="number" defaultValue={editingRoom?.months || 12} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Công tơ Bình nóng lạnh</label>
        <select name="heaterType" value={heaterType} onChange={(e) => setHeaterType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600 appearance-none">
          <option value="private">Sử dụng riêng / Không có</option>
          <option value="shared">Dùng chung công tơ tổng</option>
        </select>
      </div>

      {heaterType === 'shared' && (
        <div className="space-y-1 animate-in slide-in-from-top-2">
          <label className="text-[9px] font-black text-blue-600 uppercase px-1">Chọn công tơ tổng BNL</label>
          <select name="heaterMeterId" defaultValue={editingRoom?.heaterMeterId} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-black text-xs outline-none focus:border-blue-600 text-blue-700">
            {sharedHeaters.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
            {sharedHeaters.length === 0 && <option value="">Không có công tơ BNL nào</option>}
          </select>
        </div>
      )}

      <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4 border-b-4 border-blue-800 active:translate-y-1 transition-all">
        {editingRoom ? "Lưu thay đổi" : "Kích hoạt & Tạo phòng"}
      </button>
    </form>
  );
};

// ==========================================
// ỨNG DỤNG CHÍNH
// ==========================================

const App = () => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // --- App State ---
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [qrImage, setQrImage] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const fileInputRef = useRef(null);

  // --- Modals State ---
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isAddMeterModalOpen, setIsAddMeterModalOpen] = useState(false);
  const [mappingMeter, setMappingMeter] = useState(null);
  const [isAiCreateHouseOpen, setIsAiCreateHouseOpen] = useState(false);
  const [bottomSheet, setBottomSheet] = useState(null);

  // --- Data State ---
  const [houses, setHouses] = useState([
    { id: 'h1', name: '956 Nguyễn Khoái', address: 'Thanh Trì, Hà Nội' },
    { id: 'h2', name: '79 Thanh Đàm - Căn 1', address: 'Hoàng Mai, Hà Nội' },
    { id: 'h3', name: '79 Thanh Đàm - Căn 2', address: 'Hoàng Mai, Hà Nội' },
    { id: 'h4', name: '79 Thanh Đàm - Căn 3', address: 'Hoàng Mai, Hà Nội' },
    { id: 'h5', name: 'Lucky Cầu Giấy', address: '12 Dịch Vọng Hậu' },
    { id: 'h6', name: 'Lucky Giải Phóng', address: '145 Giải Phóng' },
    { id: 'h7', name: 'Lucky Hà Đông', address: '89 Quang Trung' },
    { id: 'h8', name: 'Lucky Mỹ Đình', address: '56 Lê Đức Thọ' },
    { id: 'h9', name: 'Lucky Tây Hồ', address: '12 Lạc Long Quân' },
    { id: 'h10', name: 'Lucky Long Biên', address: '102 Nguyễn Văn Cừ' }
  ]);

  const [rooms, setRooms] = useState([
    { id: '101', houseId: 'h1', price: 3500000, people: 2, eBikes: 1, status: 'occupied', contractStart: '2024-01-10', contractEnd: '2025-01-10', months: 12, paymentDate: 5, meterId: 'M-101', heaterMeterId: null },
    { id: '201', houseId: 'h1', price: 3200000, people: 2, eBikes: 0, status: 'occupied', contractStart: '2023-12-20', contractEnd: '2024-12-20', months: 12, paymentDate: 5, meterId: 'M-201', heaterMeterId: 'M-BNL-T2' },
    { id: '203', houseId: 'h1', price: 4500000, people: 4, eBikes: 2, status: 'occupied', contractStart: '2024-01-01', contractEnd: '2024-04-10', months: 3, paymentDate: 5, meterId: 'M-203', heaterMeterId: 'M-BNL-T2' },
  ]);

  const [meters, setMeters] = useState([
    { id: 'M-101', houseId: 'h1', type: 'electric', name: 'Điện P101', oldVal: 1240, newVal: '', roomIds: ['101'] },
    { id: 'M-201', houseId: 'h1', type: 'electric', name: 'Điện P201', oldVal: 850, newVal: '', roomIds: ['201'] },
    { id: 'M-BNL-T2', houseId: 'h1', type: 'heater', name: 'BNL Tầng 2', oldVal: 4200, newVal: '', roomIds: ['201', '203'] },
  ]);

  const [transactions, setTransactions] = useState([
    { id: 't1', houseId: 'h1', type: 'in', amount: 82400000, category: 'Tiền phòng tháng 3', date: '20/03/2024' },
    { id: 't2', houseId: 'h1', type: 'out', amount: 1500000, category: 'Sửa chữa điện', date: '22/03/2024' },
  ]);

  const [bills, setBills] = useState([
    {
      id: 'B1', houseId: 'h1', roomId: '101', month: '03/2024', status: 'pending', total: 3950000,
      meter: { old: 1200, new: 1240 },
      heaterMeter: null,
      details: { rent: 3500000, elec: 152000, water: 100000, service: 98000, heater: 0, ebikes: 100000 }
    },
    {
      id: 'B2', houseId: 'h1', roomId: '201', month: '03/2024', status: 'pending', total: 3740000,
      meter: { old: 800, new: 850 },
      heaterMeter: { id: 'M-BNL-T2', old: 4100, new: 4200 },
      details: { rent: 3200000, elec: 190000, water: 100000, service: 100000, heater: 150000, ebikes: 0 }
    }
  ]);

  const [config, setConfig] = useState({
    priceElec: 3800, priceWaterPerson: 100000, priceWaterM3: 25000,
    waterCalcMethod: 'person', priceNet: 100000, priceEBike: 100000,
    priceService: 50000, bankName: 'MB BANK', bankAcc: '999988887777', ownerName: 'ADMIN LUCKY'
  });

  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: 'Chào bạn! Tôi là Lucky AI. Tôi có thể giúp gì cho bạn hôm nay?' }
  ]);

  // --- Branding Effect ---
  useEffect(() => {
    document.title = "Lucky Home - Quản lý trọ thông minh";
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = "https://cdn-icons-png.flaticon.com/512/609/609803.png";
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  // --- Logic Helpers ---
  const showToast = (msg) => { setToast(String(msg)); setTimeout(() => setToast(""), 3000); };

  const currentRooms = useMemo(() => rooms.filter(r => r.houseId === selectedHouse?.id && r.id.toLowerCase().includes(searchQuery.toLowerCase())), [rooms, selectedHouse, searchQuery]);
  const currentMeters = useMemo(() => meters.filter(m => m.houseId === selectedHouse?.id && (m.id.toLowerCase().includes(searchQuery.toLowerCase()) || m.name.toLowerCase().includes(searchQuery.toLowerCase()))), [meters, selectedHouse, searchQuery]);
  const currentTransactions = useMemo(() => transactions.filter(t => t.houseId === selectedHouse?.id && t.category.toLowerCase().includes(searchQuery.toLowerCase())), [transactions, selectedHouse, searchQuery]);
  const currentBills = useMemo(() => bills.filter(b => b.houseId === selectedHouse?.id && b.roomId.toLowerCase().includes(searchQuery.toLowerCase())), [bills, selectedHouse, searchQuery]);

  const stats = useMemo(() => {
    const houseRooms = rooms.filter(r => r.houseId === selectedHouse?.id);
    const occupied = houseRooms.filter(r => r.status === 'occupied');
    const totalPeople = occupied.reduce((sum, r) => sum + (r.people || 0), 0);
    const serviceTotal = occupied.reduce((sum, r) => {
      const water = config.waterCalcMethod === 'person' ? (r.people * config.priceWaterPerson) : 0;
      return sum + water + config.priceNet + ((r.eBikes || 0) * config.priceEBike) + config.priceService;
    }, 0);
    const totalRev = currentTransactions.filter(t => t.type === 'in').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExp = currentTransactions.filter(t => t.type === 'out').reduce((s, t) => s + (t.amount || 0), 0);
    return { rev: totalRev, exp: totalExp, total: houseRooms.length, empty: houseRooms.length - occupied.length, people: totalPeople, serviceTotal, ebikes: occupied.reduce((s, r) => s + (r.eBikes || 0), 0) };
  }, [currentRooms, currentTransactions, config, selectedHouse, rooms]);

  // --- Handlers ---
  const handleAddRoom = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rid = fd.get('rid');
    const start = fd.get('start');
    const months = Number(fd.get('months'));
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    const heaterType = fd.get('heaterType');
    const heaterId = heaterType === 'shared' ? fd.get('heaterMeterId') : null;

    const newRoom = {
      id: rid, houseId: selectedHouse.id, price: parseN(fd.get('price')),
      people: Number(fd.get('people')), eBikes: Number(fd.get('ebikes')),
      status: 'occupied', contractStart: start, contractEnd: endDate.toISOString().split('T')[0],
      months, paymentDate: Number(fd.get('payDay')), meterId: `M-${rid}`,
      heaterMeterId: heaterId
    };

    if (editingRoom) {
      setRooms(prev => prev.map(r => r.id === editingRoom.id && r.houseId === selectedHouse.id ? newRoom : r));
      showToast("Cập nhật phòng thành công!");
    } else {
      setRooms(prev => [...prev, newRoom]);
      setMeters(prev => [...prev, { id: `M-${rid}`, houseId: selectedHouse.id, type: 'electric', name: `Điện P.${rid}`, oldVal: 0, newVal: '', roomIds: [rid] }]);
      showToast(`Đã thêm P.${rid} & tạo công tơ!`);
    }
    setIsAddRoomModalOpen(false);
    setEditingRoom(null);
  };

  const handleAddTx = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newTx = {
      id: 't-' + Date.now().toString(),
      houseId: selectedHouse.id,
      type: fd.get('type'),
      amount: parseN(fd.get('amount')),
      category: fd.get('cat'),
      date: new Date().toLocaleDateString('vi-VN')
    };
    setTransactions(prev => [newTx, ...prev]);
    showToast("Đã ghi sổ thu chi!");
    setIsAddTransactionModalOpen(false);
  };

  const handleUpdateMeter = (id, val) => {
    setMeters(prev => prev.map(m => m.id === id ? { ...m, newVal: val } : m));
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setQrImage(reader.result);
      reader.readAsDataURL(file);
      showToast("Mã QR đã tải lên!");
    }
  };

  const handleCopyZalo = (bill) => {
    let text = `BIÊN LAI LUCKY HOME\nPHÒNG: ${bill.roomId}\nTHÁNG: ${bill.month}\n-----------\n`;
    text += `Tiền thuê phòng: ${formatN(bill.details.rent)}đ\n`;
    text += `Tiền điện: ${formatN(bill.details.elec)}đ\n`;
    if (bill.details.heater > 0) text += `Điện BNL chung: ${formatN(bill.details.heater)}đ\n`;
    text += `Tiền nước: ${formatN(bill.details.water)}đ\n`;
    if (bill.details.service > 0) text += `Phí dịch vụ: ${formatN(bill.details.service)}đ\n`;
    if (bill.details.ebikes > 0) text += `Phí xe điện: ${formatN(bill.details.ebikes)}đ\n`;
    text += `-----------\n`;
    text += `TỔNG CỘNG: ${formatN(bill.total)}đ\nSTK: ${config.bankAcc} (${config.bankName})`;

    const fallbackCopy = (textStr) => {
      const el = document.createElement('textarea');
      el.value = textStr;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
        showToast("Đã copy nội dung Zalo!");
      } catch (err) {
        showToast("Lỗi khi copy!");
      }
      document.body.removeChild(el);
      setBottomSheet(null);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Đã copy nội dung Zalo!");
        setBottomSheet(null);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const createHouseQuick = (name) => {
    const id = 'h-' + Date.now();
    setHouses([{ id, name, address: "Khu vực Cầu Giấy, Hà Nội" }, ...houses]);
    showToast("Đã tạo cơ sở mới!");
    setIsAiCreateHouseOpen(false);
  };

  const toggleMic = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setAiPrompt("Tạo nhà 4 tầng, 8 phòng ở Phùng Khoang");
        setIsListening(false);
      }, 2000);
    }
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'dashboard': return <LayoutDashboard className="w-4 h-4" />;
      case 'rooms': return <Home className="w-4 h-4" />;
      case 'meters_list': return <Zap className="w-4 h-4" />;
      case 'finance': return <Wallet className="w-4 h-4" />;
      case 'bills': return <FileText className="w-4 h-4" />;
      case 'ai': return <Sparkles className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getTabText = () => {
    switch (activeTab) {
      case 'dashboard': return 'Tổng quan';
      case 'rooms': return 'Phòng';
      case 'meters_list': return 'Chốt số';
      case 'finance': return 'Tiền';
      case 'bills': return 'Hóa đơn';
      case 'ai': return 'Chat AI';
      default: return 'Hồ sơ';
    }
  };

  // --- Views ---

  const AuthView = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-sm">
        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 mx-auto mb-6 active:scale-95 transition-all">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">Lucky Home</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Smart Rental Manager</p>
        </div>

        {isRegistering ? (
          <form className="space-y-3 animate-in slide-in-from-right duration-500" onSubmit={(e) => { e.preventDefault(); setIsRegistering(false); showToast("Đăng ký thành công!"); }}>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input type="text" placeholder="Họ và tên của bạn" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm transition-all" required />
            </div>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input type="text" placeholder="Tên đăng nhập (SĐT)" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm transition-all" required />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input type="password" placeholder="Mật khẩu" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm transition-all" required />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all mt-4 border-b-4 border-blue-800">Tạo tài khoản</button>
            <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 text-center">Đã có tài khoản? Đăng nhập</button>
          </form>
        ) : (
          <form className="space-y-3 animate-in slide-in-from-left duration-500" onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }}>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input type="text" placeholder="Tên đăng nhập" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm transition-all" required />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input type="password" placeholder="Mật khẩu" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm transition-all" required />
            </div>
            <div className="flex gap-2 p-1 bg-slate-200 rounded-xl mt-2">
              <button type="button" className="flex-1 py-2.5 bg-white text-blue-600 shadow-sm rounded-lg text-[10px] font-black uppercase">Chủ Trọ</button>
              <button type="button" className="flex-1 py-2.5 text-slate-500 rounded-lg text-[10px] font-black uppercase">Nhân Viên</button>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all mt-4 border-b-4 border-blue-800">Đăng Nhập</button>
            <button type="button" onClick={() => setIsRegistering(true)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 text-center">Chưa có tài khoản? Đăng ký ngay</button>
          </form>
        )}
      </div>
    </div>
  );

  if (!isLoggedIn) return <AuthView />;

  if (isLoggedIn && !selectedHouse) return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-sm flex flex-col h-[85vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter border-l-4 border-blue-600 pl-4 leading-none">Cơ sở vận hành</h2>
          <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-md overflow-hidden"><img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" className="w-full h-full object-cover" alt="avt" /></div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mb-4 pr-1">
          {houses.map(h => (
            <button key={h.id} onClick={() => { setSelectedHouse(h); setActiveTab('dashboard'); }} className="w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-95 group transition-all text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors"><Building2 className="w-5 h-5 text-blue-600 group-hover:text-white" /></div>
                <div><h3 className="font-black text-slate-800 text-sm leading-none uppercase">{h.name}</h3><p className="text-[8px] font-bold text-slate-400 uppercase mt-1 flex items-center"><MapPin className="w-2.5 h-2.5 mr-1 text-blue-600" />{h.address}</p></div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-200" />
            </button>
          ))}
        </div>

        <button onClick={() => setIsAiCreateHouseOpen(true)} className="w-full bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-xl mt-4 active:scale-95 border-b-4 border-indigo-600">
          <div className="flex items-center space-x-3"><Sparkles className="w-5 h-5 text-indigo-400" /><h3 className="font-black text-xs uppercase italic">Tạo nhà nhanh bằng AI</h3></div>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
        </button>
        <button onClick={() => setIsLoggedIn(false)} className="mt-8 text-[10px] font-black text-slate-400 uppercase underline decoration-indigo-500 underline-offset-4 text-center">Đăng xuất</button>
      </div>

      {isAiCreateHouseOpen && (
        <Modal title="AI HOUSE CREATOR" onClose={() => setIsAiCreateHouseOpen(false)}>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 relative group">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Nhập yêu cầu: Ví dụ Nhà 5 tầng, mỗi tầng 2 phòng..."
                className="w-full bg-transparent border-none outline-none font-bold text-xs h-32 resize-none"
              />
              <button onClick={toggleMic} className={`absolute bottom-3 right-3 p-3 rounded-full shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-blue-600'}`}>
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Gợi ý tạo nhanh</p>
              <div className="grid grid-cols-2 gap-2">
                {["Nhà 5 tầng 7 phòng", "Nhà 4 tầng 5 phòng", "Nhà 3 tầng 5 phòng", "MBKD + 6 phòng"].map((opt, i) => (
                  <button key={i} onClick={() => setAiPrompt(opt)} className="p-2.5 bg-white border border-slate-100 rounded-lg text-left hover:border-blue-600 active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-700 leading-tight">{opt}</p>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => createHouseQuick(aiPrompt || "Nhà mới AI")} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-2 border-b-4 border-blue-800">
              <Sparkles className="w-4 h-4" /> Bắt đầu khởi tạo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-100 shadow-2xl overflow-hidden">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-4 py-2 rounded-full font-black text-[8px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-top duration-300 flex items-center whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-400" /> {toast}
        </div>
      )}

      {/* HEADER PHONG CÁCH CHUYÊN NGHIỆP */}
      <header className="px-4 h-14 flex items-center justify-between shrink-0 bg-blue-600 text-white z-50 shadow-md relative">
        <div className="flex items-center space-x-2">
          <button onClick={() => activeTab === 'dashboard' ? setSelectedHouse(null) : setActiveTab('dashboard')} className="p-1.5 bg-white/10 rounded-lg active:scale-90 transition-all flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-50 mt-0.5">
            {getTabText()}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex flex-row items-center space-x-1 cursor-pointer active:opacity-80" onClick={() => setSelectedHouse(null)}>
            <p className="text-[8px] font-light text-blue-100 uppercase tracking-widest leading-none truncate max-w-[100px] mt-0.5">
              {selectedHouse.name}
            </p>
            <MoreHorizontal className="w-3.5 h-3.5 opacity-60" />
          </div>
          <div onClick={() => setActiveTab('settings')} className="w-8 h-8 rounded-full border border-white/30 overflow-hidden cursor-pointer active:scale-90 transition-all shadow-sm">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" className="w-full h-full object-cover" alt="avt" />
          </div>
        </div>
      </header>

      {/* SEARCH AREA NẰM CÙNG NÚT CỘNG */}
      {['rooms', 'meters_list', 'finance', 'bills'].includes(activeTab) && (
        <div className="px-4 py-2.5 shrink-0 bg-white border-b border-slate-100 flex items-center space-x-2 shadow-sm">
          <div className="relative flex-1 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã phòng, hạng mục..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <button onClick={() => {
            if (activeTab === 'rooms') { setEditingRoom(null); setIsAddRoomModalOpen(true); }
            if (activeTab === 'finance') setIsAddTransactionModalOpen(true);
            if (activeTab === 'meters_list') setIsAddMeterModalOpen(true);
          }} className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm active:scale-90 transition-all">
            <Plus className="w-4.5 h-4.5" strokeWidth={4} />
          </button>
        </div>
      )}

      {/* MAIN AREA */}
      <main className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-32 no-scrollbar scroll-smooth text-left">

        {/* --- TỔNG QUAN --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                <p className="text-[13px] font-black text-blue-600 leading-none">{stats.total}</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Phòng</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                <p className="text-[13px] font-black text-emerald-600 leading-none">{stats.empty}</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Trống</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                <p className="text-[13px] font-black text-indigo-600 leading-none">{stats.people}</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Người</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                <p className="text-[13px] font-black text-orange-600 leading-none">{stats.ebikes}</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Xe điện</p>
              </div>
            </div>

            <div className="bg-blue-600 p-5 rounded-xl text-white shadow-xl relative overflow-hidden border-b-6 border-blue-800 text-left">
              <TrendingUp className="w-12 h-12 opacity-10 absolute -right-2 -top-2" />
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">Doanh thu dự kiến T3</p>
              <h3 className="text-3xl font-black">{formatN(stats.rev)}đ</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="bg-orange-400 p-4 rounded-xl text-white shadow-md relative overflow-hidden text-left">
                <p className="text-[8px] font-black uppercase mb-1 opacity-80">Điện dự tính</p>
                <p className="text-sm font-black">2.140.000đ</p>
              </div>
              <div className="bg-sky-500 p-4 rounded-xl text-white shadow-md relative overflow-hidden text-left">
                <p className="text-[8px] font-black uppercase mb-1 opacity-80">Nước dự tính</p>
                <p className="text-sm font-black">{formatN(stats.people * config.priceWaterPerson)}đ</p>
              </div>
            </div>
          </div>
        )}

        {/* --- PHÒNG TRỌ --- */}
        {activeTab === 'rooms' && (
          <div className="space-y-4 pb-20 animate-in slide-in-from-right">
            <div className="grid grid-cols-2 gap-3">
              {currentRooms.map(r => {
                const today = new Date();
                const payDate = new Date(today.getFullYear(), today.getMonth(), r.paymentDate);
                const payDays = Math.ceil((payDate - today) / (1000 * 60 * 60 * 24));
                const endDays = diffDays(r.contractEnd);
                return (
                  <div key={r.id} className={`bg-white p-3.5 rounded-xl border-2 shadow-lg relative active:scale-95 transition-all flex flex-col ${r.status === 'occupied' ? 'border-blue-600 shadow-blue-500/5' : 'opacity-60 border-dashed border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] ${r.status === 'occupied' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>P.{r.id}</span>
                      <Edit3 onClick={() => { setEditingRoom(r); setIsAddRoomModalOpen(true); }} className="w-3.5 h-3.5 text-slate-300 hover:text-blue-600 cursor-pointer" />
                    </div>
                    <p className="text-[14px] font-black text-blue-900 leading-none mb-3">{formatN(r.price)}đ</p>

                    <div className="space-y-1.5 border-t border-slate-50 pt-2 flex-1">
                      <div className="flex justify-between items-center text-[7px] font-bold uppercase">
                        <span className="text-slate-400 text-left">Đóng tiền:</span>
                        <span className={payDays <= 3 ? 'text-red-500 font-black animate-pulse' : 'text-slate-900'}>{payDays >= 0 ? payDays : 30 + payDays} ngày</span>
                      </div>
                      <div className="flex justify-between items-center text-[7px] font-bold uppercase text-left">
                        <span className="text-slate-400">Hợp đồng:</span>
                        <span className={endDays <= 30 ? 'text-orange-500 font-black' : 'text-slate-900'}>{endDays || 0} ngày</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-1.5 border-t border-slate-50 pt-2">
                      <div className="flex items-center text-blue-600 font-bold text-[9px]"><Users2 className="w-3 h-3 mr-1" />{r.people}</div>
                      <div className="flex items-center text-orange-600 font-bold text-[9px]"><Bike className="w-3 h-3 mr-1" />{r.eBikes}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* --- HÓA ĐƠN --- */}
        {activeTab === 'bills' && (
          <div className="space-y-2 pb-20 animate-in slide-in-from-bottom">
            {currentBills.map(bill => (
              <div key={bill.id} onClick={() => setBottomSheet(bill)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-95 transition-all cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {bill.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase leading-none mb-1">Phòng {bill.roomId}</p>
                    <p className={`text-[8px] font-bold uppercase tracking-widest ${bill.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>{formatN(bill.total)}đ • {bill.status === 'paid' ? 'Đã thu' : 'Chưa thu'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-200" />
              </div>
            ))}
          </div>
        )}

        {/* --- CHỐT SỐ --- */}
        {activeTab === 'meters_list' && (
          <div className="space-y-3 pb-20 animate-in slide-in-from-right">
            {currentMeters.map(m => (
              <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-lg ${m.type === 'heater' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-500'} flex items-center justify-center`}><Zap className="w-4.5 h-4.5" /></div>
                    <div><p className="text-[11px] font-black uppercase text-slate-800 leading-none">{m.id}</p><p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{m.name}</p></div>
                  </div>
                  <button onClick={() => setMappingMeter(m)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Boxes className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[7px] font-black text-slate-400 uppercase mb-1 block px-1">Chốt cũ</label><div className="bg-slate-50 p-2.5 rounded-lg font-black text-slate-400 text-center text-xs shadow-inner">{formatN(m.oldVal)}</div></div>
                  <div><label className="text-[7px] font-black text-blue-600 uppercase mb-1 block px-1">Số mới</label><input type="text" value={formatN(m.newVal)} onChange={(e) => handleUpdateMeter(m.id, parseN(e.target.value))} placeholder="..." className="w-full bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg font-black text-blue-600 text-center text-xs outline-none focus:bg-white" /></div>
                </div>
              </div>
            ))}
            <button onClick={() => showToast("Đã lưu chỉ số điện!")} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-xl border-b-4 border-blue-800 mt-4 active:translate-y-1 transition-all">Xác nhận lưu toàn bộ</button>
          </div>
        )}

        {/* --- THU CHI --- */}
        {activeTab === 'finance' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="bg-slate-900 p-6 rounded-xl text-white shadow-xl relative overflow-hidden mb-6 border-b-8 border-blue-600">
              <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1 italic">Tổng quỹ ròng</p>
              <h3 className="text-3xl font-black tracking-tighter">{formatN(stats.rev - stats.exp)}đ</h3>
              <div className="mt-6 flex gap-6 border-t border-white/10 pt-4">
                <div><p className="text-[8px] font-bold text-slate-500 uppercase">Thu vào</p><p className="text-sm font-black text-emerald-400">+{formatN(stats.rev)}</p></div>
                <div><p className="text-[8px] font-bold text-slate-500 uppercase">Chi ra</p><p className="text-sm font-black text-rose-400">-{formatN(stats.exp)}</p></div>
              </div>
            </div>
            <div className="space-y-2">
              {currentTransactions.map(t => (
                <div key={t.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <ArrowRight className={`w-3.5 h-3.5 ${t.type === 'in' ? 'rotate-[-45deg]' : 'rotate-[135deg]'}`} />
                    </div>
                    <div><p className="text-xs font-black uppercase text-slate-800 leading-none mb-1">{t.category}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{t.date}</p></div>
                  </div>
                  <p className={`font-black text-xs ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === 'in' ? '+' : '-'}{formatN(t.amount)}đ</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CHAT AI --- */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 no-scrollbar pb-10">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-200' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const val = e.target.q.value; if (val) { setAiMessages([...aiMessages, { role: 'user', text: val }]); e.target.reset(); } }} className="p-3 bg-white border-t border-slate-100 flex space-x-2">
              <input name="q" placeholder="Hỏi AI Lucky về nhà trọ..." className="flex-1 bg-slate-100 border-none rounded-lg px-3 text-xs font-bold outline-none focus:bg-blue-50 transition-colors" />
              <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-lg active:scale-90"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        )}

        {/* --- CÀI ĐẶT --- */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-in fade-in pb-20">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white shadow-lg overflow-hidden ring-4 ring-blue-50">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" className="w-full h-full object-cover" alt="avatar" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-800 leading-none">ADMIN LUCKY</h3>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1.5 bg-blue-50 px-3 py-0.5 rounded-full w-fit">Chủ cơ sở</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest underline decoration-blue-600 decoration-2 underline-offset-4 mb-2">Cấu hình Bảng giá dịch vụ</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Điện (/kWh)</label><input type="text" value={formatN(config.priceElec)} onChange={e => setConfig({ ...config, priceElec: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none focus:border-blue-600 border border-transparent" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Tính tiền nước</label>
                  <select value={config.waterCalcMethod} onChange={e => setConfig({ ...config, waterCalcMethod: e.target.value })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none appearance-none border border-transparent focus:border-blue-600">
                    <option value="person">Theo đầu người</option>
                    <option value="m3">Theo khối (m3)</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Giá Nước</label><input type="text" value={formatN(config.waterCalcMethod === 'person' ? config.priceWaterPerson : config.priceWaterM3)} onChange={e => setConfig({ ...config, [config.waterCalcMethod === 'person' ? 'priceWaterPerson' : 'priceWaterM3']: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none focus:border-blue-600 border border-transparent" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Phí Dịch Vụ</label><input type="text" value={formatN(config.priceService)} onChange={e => setConfig({ ...config, priceService: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none focus:border-blue-600 border border-transparent" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Internet</label><input type="text" value={formatN(config.priceNet)} onChange={e => setConfig({ ...config, priceNet: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none focus:border-blue-600 border border-transparent" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Xe máy điện</label><input type="text" value={formatN(config.priceEBike)} onChange={e => setConfig({ ...config, priceEBike: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none focus:border-blue-600 border border-transparent" /></div>
              </div>
              <button onClick={() => showToast("Đã lưu cài đặt!")} className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-black uppercase text-[9px] shadow-lg flex items-center justify-center gap-2 border-b-4 border-blue-800 active:translate-y-1 transition-all"><Save className="w-3.5 h-3.5" /> Lưu thay đổi</button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4 text-center">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin VietQR</h4>
              <div
                onClick={() => fileInputRef.current.click()}
                className="w-full aspect-square max-w-[180px] mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all relative overflow-hidden group shadow-inner"
              >
                {qrImage ? (
                  <img src={qrImage} className="w-full h-full object-contain" alt="QR" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-7 h-7 text-slate-300 mb-2 group-hover:text-blue-600 transition-colors" />
                    <p className="text-[8px] font-black text-slate-400 uppercase">Tải ảnh QR cá nhân</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleQrUpload} className="hidden" accept="image/*" />
              </div>
              <div className="space-y-2 pt-3 border-t border-slate-50 text-left">
                <div className="flex justify-between items-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Số tài khoản</p><p className="font-black text-blue-600 text-sm tracking-widest">{config.bankAcc}</p></div>
                <div className="flex justify-between items-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ngân hàng</p><p className="font-black text-slate-700 text-[11px]">{config.bankName}</p></div>
              </div>
            </div>

            <button onClick={() => setIsLoggedIn(false)} className="w-full p-4 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 active:bg-rose-600 active:text-white transition-all shadow-sm"><LogOut className="w-4 h-4" /> <span>Thoát hệ thống</span></button>
          </div>
        )}
      </main>

      {/* FOOTER TAB BAR (VUÔNG CẠNH) */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] pointer-events-none">
        <div className="bg-white border-t border-slate-100 h-16 flex items-center justify-around px-2 pointer-events-auto shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
            { id: 'rooms', icon: Home, label: 'Phòng' },
            { id: 'spacer', icon: null, label: '' },
            { id: 'bills', icon: FileText, label: 'Bill' },
            { id: 'finance', icon: Wallet, label: 'Tiền' },
          ].map((item, i) => (
            item.id === 'spacer' ? <div key={i} className="w-12" /> : (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(""); }} className={`flex flex-col items-center justify-center px-1 transition-all ${activeTab === item.id ? 'text-blue-600 scale-105' : 'text-slate-400 opacity-60'}`}>
                <div className={`p-1.5 rounded-lg ${activeTab === item.id ? 'bg-blue-50 shadow-inner' : ''}`}><item.icon className="w-4.5 h-4.5" strokeWidth={activeTab === item.id ? 3 : 2} /></div>
                <span className={`text-[6px] font-black uppercase mt-1 transition-all ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
              </button>
            )
          ))}
        </div>
        <button onClick={() => setShowQuickMenu(!showQuickMenu)} className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90 pointer-events-auto border-[4px] border-white ${showQuickMenu ? 'bg-slate-800 rotate-45' : 'bg-blue-600 shadow-blue-300'}`}><Plus className="w-7 h-7 text-white stroke-[4px]" /></button>
      </div>

      {/* QUICK MENU OVERLAY */}
      <div className={`fixed inset-0 z-[500] transition-opacity duration-300 ${showQuickMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowQuickMenu(false)} />
        <div className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[2.5rem] p-10 pb-36 transition-transform duration-500 transform ${showQuickMenu ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: 'Thêm Khách', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50', action: () => { setEditingRoom(null); setIsAddRoomModalOpen(true); setShowQuickMenu(false); } },
              { label: 'Ghi Tiền', icon: CircleDollarSign, color: 'text-rose-600 bg-rose-50', action: () => { setIsAddTransactionModalOpen(true); setShowQuickMenu(false); } },
              { label: 'Map Công Tơ', icon: Boxes, color: 'text-orange-600 bg-orange-50', action: () => { setActiveTab('meters_list'); setShowQuickMenu(false); } },
              { label: 'Hóa Đơn', icon: Receipt, color: 'text-purple-600 bg-purple-50', action: () => { setActiveTab('bills'); setShowQuickMenu(false); } },
              { label: 'Báo Cáo', icon: PieChart, color: 'text-blue-600 bg-blue-50', action: () => { setActiveTab('dashboard'); setShowQuickMenu(false); } },
              { label: 'Cài Đặt', icon: Settings, color: 'text-slate-600 bg-slate-50', action: () => { setActiveTab('settings'); setShowQuickMenu(false); } }
            ].map((item, i) => (
              <button key={i} onClick={() => { item.action(); }} className="flex flex-col items-center space-y-2 active:scale-90 transition-all text-left">
                <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center shadow-sm p-4`}><item.icon className="w-7 h-7" strokeWidth={1.5} /></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter leading-none text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BIÊN LAI CHI TIẾT */}
      {bottomSheet && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBottomSheet(null)} />
          <div className="bg-white w-full max-w-md rounded-t-xl p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500 relative max-h-[96vh] flex flex-col no-scrollbar overflow-y-auto text-left">
            <div className="w-14 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 shrink-0" />
            <div className="flex justify-between items-center mb-6 shrink-0"><h3 className="text-base font-black uppercase text-slate-900 flex items-center tracking-widest"><Receipt className="w-6 h-6 mr-3 text-blue-600" /> Biên lai thu tiền</h3><button onClick={() => setBottomSheet(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 active:rotate-90 transition-all"><X className="w-5 h-5" /></button></div>
            <div className="space-y-6 overflow-y-auto no-scrollbar pb-10">
              <div className="bg-indigo-600 p-8 rounded-xl text-center text-white shadow-xl relative overflow-hidden">
                <p className="text-[10px] font-black text-indigo-100 uppercase mb-2 tracking-[0.4em] opacity-80">Tổng cần thanh toán</p>
                <p className="text-5xl font-black tracking-tighter leading-none">{formatN(bottomSheet.total)}đ</p>
                <p className="text-[10px] mt-4 opacity-90 font-black bg-white/10 px-6 py-2 rounded-full w-fit mx-auto uppercase tracking-widest border border-white/20">PHÒNG {bottomSheet.roomId} • {bottomSheet.month}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl space-y-4 border-2 border-slate-100 shadow-inner text-left">
                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Tiền thuê phòng</span><span className="text-slate-900">{formatN(bottomSheet.details.rent)}đ</span></div>

                <div className="flex justify-between items-center text-[12px] font-black"><div className="flex flex-col"><span className="text-slate-400 uppercase tracking-tighter">Tiền điện riêng</span><span className="text-[9px] text-blue-600 font-bold italic">Số: {bottomSheet.meter?.old} → {bottomSheet.meter?.new}</span></div><span className="text-slate-900">{formatN(bottomSheet.details.elec)}đ</span></div>

                {bottomSheet.heaterMeter && (
                  <div className="flex justify-between items-center text-[12px] font-black"><div className="flex flex-col"><span className="text-slate-400 uppercase tracking-tighter">Điện BNL Chung</span><span className="text-[9px] text-orange-600 font-bold italic">Số: {bottomSheet.heaterMeter.old} → {bottomSheet.heaterMeter.new}</span></div><span className="text-slate-900">{formatN(bottomSheet.details.heater)}đ</span></div>
                )}

                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Tiền nước</span><span className="text-slate-900">{formatN(bottomSheet.details.water)}đ</span></div>

                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Phí dịch vụ</span><span className="text-slate-900">{formatN(bottomSheet.details.service || 0)}đ</span></div>

                {bottomSheet.details.ebikes > 0 && (
                  <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Xe máy điện</span><span className="text-slate-900">{formatN(bottomSheet.details.ebikes)}đ</span></div>
                )}

                <div className="border-t-2 border-dashed border-slate-200 pt-4 flex justify-between items-center text-xs font-black uppercase text-indigo-600 tracking-widest"><span>Tổng cộng</span><span className="text-2xl">{formatN(bottomSheet.total)}đ</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleCopyZalo(bottomSheet)} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[12px] uppercase shadow-xl active:scale-95 border-b-4 border-black">Copy Zalo</button>
                {bottomSheet.status === 'pending' && (
                  <button onClick={() => {
                    setBills(prev => prev.map(b => b.id === bottomSheet.id ? { ...b, status: 'paid' } : b));
                    setTransactions(prev => [{ id: 't-' + Date.now(), houseId: selectedHouse.id, type: 'in', amount: bottomSheet.total, category: `Thu P.${bottomSheet.roomId}`, date: new Date().toLocaleDateString('vi-VN') }, ...prev]);
                    setBottomSheet(null);
                    showToast("Đã thu tiền!");
                  }} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black text-[12px] uppercase active:scale-95 shadow-xl border-b-4 border-emerald-800">Gạch nợ &radic;</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS PHỤ */}
      {isAddRoomModalOpen && (
        <Modal title={editingRoom ? "Cập nhật phòng" : "Thêm phòng mới"} onClose={() => setIsAddRoomModalOpen(false)}>
          <AddRoomForm onSave={handleAddRoom} editingRoom={editingRoom} sharedHeaters={meters.filter(m => m.type === 'heater' && m.houseId === selectedHouse.id)} formatN={formatN} parseN={parseN} />
        </Modal>
      )}

      {isAddTransactionModalOpen && (
        <Modal title="Ghi sổ thu chi" onClose={() => setIsAddTransactionModalOpen(false)}>
          <form onSubmit={handleAddTx} className="space-y-4">
            <select name="type" className="w-full p-3 bg-slate-50 rounded-xl font-black text-xs outline-none border border-slate-100 appearance-none text-center">
              <option value="in">Thu vào (+)</option>
              <option value="out">Chi ra (-)</option>
            </select>
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Số tiền (VND)</label><input type="text" name="amount" required placeholder="0" className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm outline-none border border-transparent focus:border-blue-600 shadow-inner" onInput={(e) => { e.target.value = formatN(parseN(e.target.value)); }} /></div>
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Danh mục</label><input name="cat" placeholder="VD: Sửa điện, phí rác..." required className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-blue-600" /></div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] shadow-xl border-b-4 border-blue-800 active:translate-y-1 transition-all">Lưu giao dịch</button>
          </form>
        </Modal>
      )}

      {/* ÁNH XẠ CÔNG TƠ */}
      {mappingMeter && (
        <Modal title={`Ánh xạ: ${mappingMeter.name}`} onClose={() => setMappingMeter(null)}>
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase px-1">Chọn các phòng sử dụng chung công tơ này:</p>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto no-scrollbar py-2">
              {rooms.filter(r => r.houseId === selectedHouse.id).map(r => {
                const isSelected = mappingMeter.roomIds.includes(r.id);
                return (
                  <button key={r.id} onClick={() => {
                    const newIds = isSelected ? mappingMeter.roomIds.filter(id => id !== r.id) : [...mappingMeter.roomIds, r.id];
                    setMeters(prev => prev.map(m => m.id === mappingMeter.id ? { ...m, roomIds: newIds } : m));
                    setMappingMeter({ ...mappingMeter, roomIds: newIds });
                  }} className={`p-3 rounded-xl border-2 font-black text-xs flex justify-between items-center transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'}`}>
                    <span>P.{r.id}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setMappingMeter(null)} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all border-b-4 border-blue-800">Hoàn tất ánh xạ</button>
          </div>
        </Modal>
      )}

      {/* MODAL THÊM CÔNG TƠ */}
      {isAddMeterModalOpen && (
        <Modal title="Thêm công tơ mới" onClose={() => setIsAddMeterModalOpen(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            setMeters(prev => [...prev, { id: fd.get('mid'), houseId: selectedHouse.id, type: fd.get('type'), name: fd.get('name'), roomIds: [], oldVal: Number(fd.get('val')), newVal: '' }]);
            showToast("Đã tạo công tơ!"); setIsAddMeterModalOpen(false);
          }} className="space-y-4">
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Mã công tơ</label><input name="mid" placeholder="VD: CT-01" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Tên mô tả</label><input name="name" placeholder="VD: BNL Tầng 1" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Loại thiết bị</label>
              <select name="type" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none appearance-none focus:border-blue-600"><option value="electric">Điện phòng</option><option value="heater">Bình nóng lạnh chung</option></select>
            </div>
            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Chỉ số đầu</label><input name="val" type="number" defaultValue="0" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            <button type="submit" className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] shadow-xl border-b-4 border-orange-800 active:translate-y-1 transition-all">Xác nhận tạo</button>
          </form>
        </Modal>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body { background-color: #f8fafc; margin: 0; padding: 0; width: 100%; height: 100%; min-height: 100vh; overflow: hidden !important; position: static !important; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        textarea, input, select { outline: none; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1rem; }
      `}</style>
    </div>
  );
}

export default App;