import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Home, Zap, Wallet, Plus,
  TrendingUp, ChevronRight, Sparkles, Send,
  X, Receipt, Building2, QrCode, MapPin, Users2,
  Lock, LogOut, ShieldCheck, User, CheckCircle2, ArrowRight,
  Copy, PlusCircle, Save, Image, RefreshCw, Mic, MicOff,
  Trash2, Gauge, Calendar, Clock, CreditCard, Settings, FileText, UserCheck, CircleDollarSign,
  Activity, Lightbulb, Wifi, Edit3, Boxes, Search, MoreHorizontal, Droplets, Bike, ChevronLeft,
  Trash, Info
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
  const target = new Date(dateStr);
  const now = new Date();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ==========================================
// COMPONENT CON
// ==========================================

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 text-left">
    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-[85vh] relative animate-in zoom-in-95 duration-300">
      <div className="sticky top-0 bg-blue-600 flex justify-between items-center p-3 shrink-0 rounded-t-xl z-10">
        <h3 className="font-black text-white uppercase text-[10px] tracking-widest">{title}</h3>
        <button onClick={onClose} className="p-1.5 bg-white/20 rounded-lg text-white active:scale-90 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto no-scrollbar">{children}</div>
    </div>
  </div>
);

// ==========================================
// ỨNG DỤNG CHÍNH
// ==========================================

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Modals state
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isAddMeterModalOpen, setIsAddMeterModalOpen] = useState(false);
  const [mappingMeter, setMappingMeter] = useState(null);
  const [bottomSheet, setBottomSheet] = useState(null);
  const [isAiCreateHouseOpen, setIsAiCreateHouseOpen] = useState(false);

  // --- Dữ liệu 10 Nhà (Dùng cho scroll) ---
  const [houses, setHouses] = useState([
    { id: 'h1', name: '956 Nguyễn Khoái', address: 'Thanh Trì, Hà Nội' },
    { id: 'h2', name: '79 Thanh Đàm - Căn 1', address: 'Hoàng Mai, Hà Nội' },
    { id: 'h3', name: '79 Thanh Đàm - Căn 2', address: 'Hoàng Mai, Hà Nội' },
    { id: 'h4', name: '79 Thanh Đàm - Căn 3', address: 'Hoàng Mai, Hà Nội' },
    { id: 'h5', name: 'Lucky Home Cầu Giấy', address: '22 Dịch Vọng Hậu, HN' },
    { id: 'h6', name: 'Lucky Home Giải Phóng', address: '145 Giải Phóng, Hai Bà Trưng' },
    { id: 'h7', name: 'Lucky Home Hà Đông', address: '89 Quang Trung, Hà Đông' },
    { id: 'h8', name: 'Lucky Home Mỹ Đình', address: '56 Lê Đức Thọ, Nam Từ Liêm' },
    { id: 'h9', name: 'Lucky Home Tây Hồ', address: '12 Lạc Long Quân, Tây Hồ' },
    { id: 'h10', name: 'Lucky Home Long Biên', address: '102 Nguyễn Văn Cừ, LB' }
  ]);

  const [rooms, setRooms] = useState([
    { id: '101', houseId: 'h1', price: 3500000, people: 2, eBikes: 1, status: 'occupied', contractStart: '2024-01-10', contractEnd: '2025-01-10', months: 12, paymentDate: 5, meterId: 'M-101', heaterMeterId: null },
    { id: '201', houseId: 'h1', price: 3200000, people: 2, eBikes: 0, status: 'occupied', contractStart: '2023-12-20', contractEnd: '2024-12-20', months: 12, paymentDate: 5, meterId: 'M-201', heaterMeterId: 'M-HEATER-T2' },
    { id: '203', houseId: 'h1', price: 4500000, people: 4, eBikes: 2, status: 'occupied', contractStart: '2024-01-01', contractEnd: '2024-04-10', months: 3, paymentDate: 5, meterId: 'M-203', heaterMeterId: 'M-HEATER-T2' },
  ]);

  const [meters, setMeters] = useState([
    { id: 'M-101', houseId: 'h1', type: 'electric', name: 'Điện P101', oldVal: 1240, roomIds: ['101'] },
    { id: 'M-201', houseId: 'h1', type: 'electric', name: 'Điện P201', oldVal: 850, roomIds: ['201'] },
    { id: 'M-HEATER-T2', houseId: 'h1', type: 'heater', name: 'BNL Chung T2', oldVal: 4200, roomIds: ['201', '203'] },
  ]);

  const [bills, setBills] = useState([
    {
      id: 'B-101',
      houseId: 'h1',
      roomId: '101',
      month: '03/2024',
      status: 'pending',
      total: 3950000,
      meter: { old: 1200, new: 1240 },
      heaterMeter: null,
      details: { rent: 3500000, elec: 152000, water: 200000, service: 100000, heater: 0, ebikes: 0 }
    }
  ]);

  const [transactions, setTransactions] = useState([
    { id: 't1', houseId: 'h1', type: 'in', amount: 82400000, category: 'Tiền phòng tháng 3', date: '20/03/2024' }
  ]);

  const [config, setConfig] = useState({
    priceElec: 3800, priceWaterPerson: 100000, priceWaterM3: 25000,
    waterCalcMethod: 'person', priceNet: 100000, priceEBike: 100000,
    priceTrash: 30000, priceCleaning: 50000, priceBike: 50000,
    bankName: 'TP BANK', bankAcc: '0347895621', ownerName: 'ADMIN LUCKY'
  });

  // --- Helpers ---
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
      return sum + water + config.priceNet + ((r.eBikes || 0) * config.priceEBike);
    }, 0);
    return { rev: currentTransactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0), total: houseRooms.length, empty: houseRooms.length - occupied.length, people: totalPeople, serviceTotal };
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
      months: months, paymentDate: Number(fd.get('payDay')), meterId: `M-${rid}`,
      heaterMeterId: heaterId
    };

    if (editingRoom) {
      setRooms(rooms.map(r => r.id === editingRoom.id && r.houseId === selectedHouse.id ? newRoom : r));
      showToast("Cập nhật thành công!");
    } else {
      setRooms([...rooms, newRoom]);
      setMeters([...meters, { id: `M-${rid}`, houseId: selectedHouse.id, type: 'electric', name: `Điện P.${rid}`, oldVal: 0, roomIds: [rid] }]);
      showToast(`Đã thêm P.${rid} & công tơ!`);
    }
    setIsAddRoomModalOpen(false); setEditingRoom(null);
  };

  const handleCopyZalo = (bill) => {
    const text = `LUCKY HOME - BIÊN LAI THU TIỀN\nPHÒNG: ${bill.roomId}\nTHÁNG: ${bill.month}\n-----------------\nTiền nhà: ${formatN(bill.details.rent)}đ\nĐiện: ${formatN(bill.details.elec)}đ\nNước & DV: ${formatN(bill.details.water + bill.details.service)}đ\nTỔNG CỘNG: ${formatN(bill.total)}đ\nSTK: ${config.bankAcc} - ${config.bankName}`;

    // Copy using hidden textarea as per environment restrictions
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("Đã copy nội dung Zalo!");
    } catch (err) {
      showToast("Không thể copy!");
    }
    document.body.removeChild(textArea);
    setBottomSheet(null);
  };

  const handleAiQuickCreate = () => {
    if (!aiPrompt) return;
    showToast("AI đang phân tích sơ đồ...");
    setTimeout(() => {
      const id = 'h-' + Date.now();
      setHouses([{ id, name: "Nhà AI Mới", address: "Hà Nội" }, ...houses]);
      showToast("Đã tạo cơ sở mới!");
      setIsAiCreateHouseOpen(false);
      setAiPrompt("");
    }, 1500);
  };

  const toggleMic = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setAiPrompt("Tạo nhà 5 tầng, mỗi tầng 2 phòng giá 3tr5");
        setIsListening(false);
      }, 2000);
    }
  };

  // --- Views ---

  const AddRoomForm = ({ onSave, editingRoom, sharedHeaters }) => {
    const [heaterType, setHeaterType] = useState(editingRoom?.heaterMeterId ? 'shared' : 'private');
    return (
      <form onSubmit={onSave} className="space-y-3 text-left">
        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Mã phòng</label><input name="rid" defaultValue={editingRoom?.id} placeholder="101" required className="w-full p-2.5 bg-slate-50 rounded-lg font-bold text-xs outline-none focus:border-blue-600" /></div>
          <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Giá thuê</label><input name="price" type="text" defaultValue={formatN(editingRoom?.price || 0)} required className="w-full p-2.5 bg-slate-50 rounded-lg font-black text-xs outline-none shadow-inner" onInput={(e) => e.target.value = formatN(parseN(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Số cư dân</label><input name="people" type="number" defaultValue={editingRoom?.people || 2} className="w-full p-2.5 bg-slate-50 rounded-lg font-bold text-xs outline-none" /></div>
          <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Xe máy điện</label><input name="ebikes" type="number" defaultValue={editingRoom?.eBikes || 0} className="w-full p-2.5 bg-slate-50 rounded-lg font-bold text-xs outline-none" /></div>
        </div>
        <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Ngày ký Hợp đồng</label><input name="start" type="date" defaultValue={editingRoom?.contractStart || new Date().toISOString().split('T')[0]} required className="w-full p-2.5 bg-slate-50 rounded-lg font-bold text-xs outline-none" /></div>
        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Hạn đóng (Ngày)</label><input name="payDay" type="number" defaultValue={editingRoom?.paymentDate || 5} min="1" max="31" className="w-full p-2.5 bg-slate-50 rounded-lg font-bold text-xs outline-none" /></div>
          <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Thời hạn (Tháng)</label><input name="months" type="number" defaultValue={editingRoom?.months || 12} className="w-full p-2.5 bg-slate-50 rounded-lg font-bold text-xs outline-none" /></div>
        </div>

        <div className="space-y-1 text-left">
          <label className="text-[8px] font-black text-slate-400 uppercase px-1">Công tơ Bình nóng lạnh</label>
          <select name="heaterType" value={heaterType} onChange={(e) => setHeaterType(e.target.value)} className="w-full p-2.5 bg-slate-50 rounded-lg font-bold text-xs outline-none appearance-none">
            <option value="private">Sử dụng riêng / Không có</option>
            <option value="shared">Dùng chung công tơ tổng</option>
          </select>
        </div>

        {heaterType === 'shared' && (
          <div className="space-y-1 animate-in slide-in-from-top-2 text-left">
            <label className="text-[8px] font-black text-blue-600 uppercase px-1 text-left">Chọn công tơ BNL dùng chung</label>
            <select name="heaterMeterId" defaultValue={editingRoom?.heaterMeterId} className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-lg font-black text-xs outline-none">
              {sharedHeaters.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
              {sharedHeaters.length === 0 && <option value="">Chưa có công tơ BNL nào</option>}
            </select>
          </div>
        )}

        <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-xl mt-2 border-b-4 border-blue-800">
          {editingRoom ? "Lưu thay đổi" : "Kích hoạt & Tạo phòng"}
        </button>
      </form>
    );
  };

  const LoginView = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-left animate-in fade-in duration-700">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6 active:scale-95 transition-all">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1 leading-none">Lucky Home</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Hệ thống quản lý chuỗi trọ</p>
        <form className="space-y-4 text-left" onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }}>
          <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Tài khoản" className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600" required /></div>
          <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="password" placeholder="Mật khẩu" className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600" required /></div>
          <div className="flex gap-2 p-1 bg-slate-200 rounded-xl">
            <button type="button" className="flex-1 py-2.5 bg-white text-blue-600 shadow-sm rounded-lg text-[10px] font-black uppercase">Chủ Trọ</button>
            <button type="button" className="flex-1 py-2.5 text-slate-500 rounded-lg text-[10px] font-black uppercase">Nhân Viên</button>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 border-b-4 border-blue-800">Đăng Nhập</button>
        </form>
      </div>
    </div>
  );

  if (!isLoggedIn) return <LoginView />;

  if (isLoggedIn && !selectedHouse) return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center items-center text-left">
      <div className="w-full max-w-sm flex flex-col h-[80vh]">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 border-l-4 border-blue-600 pl-4 leading-none">Chọn cơ sở vận hành</h2>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mb-4">
          {houses.map(h => (
            <button key={h.id} onClick={() => { setSelectedHouse(h); setActiveTab('dashboard'); }} className="w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-95 group transition-all">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors"><Building2 className="w-5 h-5 text-blue-600 group-hover:text-white" /></div>
                <div className="text-left"><h3 className="font-black text-slate-800 text-sm leading-none uppercase">{h.name}</h3><p className="text-[8px] font-bold text-slate-400 uppercase mt-1 flex items-center"><MapPin className="w-2.5 h-2.5 mr-1 text-blue-600" />{h.address}</p></div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-200" />
            </button>
          ))}
        </div>

        <button onClick={() => setIsAiCreateHouseOpen(true)} className="w-full bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-xl border-b-4 border-blue-600 active:scale-95 transition-all">
          <div className="flex items-center space-x-3 text-left"><Sparkles className="w-5 h-5 text-indigo-400" /><h3 className="font-black text-xs uppercase italic">Tạo nhà nhanh bằng AI</h3></div>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
        </button>

        <button onClick={() => setIsLoggedIn(false)} className="mt-8 text-[10px] font-black text-slate-400 uppercase underline decoration-indigo-500 underline-offset-4 text-center">Đăng xuất</button>
      </div>

      {/* AI Create House Modal */}
      {isAiCreateHouseOpen && (
        <Modal title="AI Quick House Creator" onClose={() => setIsAiCreateHouseOpen(false)}>
          <div className="space-y-4 text-left">
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
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Gợi ý lựa chọn</p>
              <div className="grid grid-cols-2 gap-2">
                {["Nhà 5 tầng 7 phòng", "Nhà 4 tầng 5 phòng", "Nhà 3 tầng 4 phòng", "MBKD + 6 phòng"].map((opt, i) => (
                  <button key={i} onClick={() => setAiPrompt(opt)} className="p-2.5 bg-white border border-slate-100 rounded-lg text-left hover:border-blue-600 active:scale-95 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-700 leading-tight">{opt}</p>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleAiQuickCreate} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Bắt đầu khởi tạo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

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

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-100 shadow-2xl overflow-hidden">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-4 py-2 rounded-full font-black text-[8px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-top duration-300 flex items-center whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-400" /> {toast}
        </div>
      )}

      {/* HEADER PHONG CÁCH ZALO TỐI GIẢN */}
      <header className="px-4 h-12 flex justify-between items-center shrink-0 bg-blue-600 text-white z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <button onClick={() => activeTab === 'dashboard' ? setSelectedHouse(null) : setActiveTab('dashboard')} className="p-1.5 bg-white/10 rounded-lg active:scale-90 transition-all">
            {getTabIcon()}
          </button>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-50">
            {activeTab === 'dashboard' ? 'Tổng quan' : activeTab === 'rooms' ? 'Phòng' : activeTab === 'meters_list' ? 'Chốt số' : activeTab === 'finance' ? 'Thu chi' : 'Bill'}
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-right">
          <div className="flex flex-col items-end" onClick={() => setSelectedHouse(null)}>
            <div className="flex items-center space-x-1 cursor-pointer active:opacity-80">
              <Building2 className="w-3 h-3 opacity-80" />
              <h2 className="text-[11px] font-black uppercase tracking-tighter leading-none">LUCKY HOME</h2>
            </div>
            <p className="text-[8px] font-light text-blue-100 uppercase tracking-widest leading-none mt-0.5 cursor-pointer truncate max-w-[120px]">
              {selectedHouse.name} <MoreHorizontal className="w-3 h-3 ml-1" />
            </p>
          </div>
          <div onClick={() => setActiveTab('settings')} className="w-7 h-7 rounded-full border border-white/30 overflow-hidden cursor-pointer active:scale-90 transition-all shadow-sm">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" className="w-full h-full object-cover" alt="avt" />
          </div>
        </div>
      </header>

      {/* SEARCH BAR & PLUS AREA (NẰM CẠNH NHAU) */}
      {['rooms', 'meters_list', 'finance', 'bills'].includes(activeTab) && (
        <div className="px-4 py-2 shrink-0 bg-white border-b border-slate-100 flex items-center space-x-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã phòng, mục..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400"
            />
          </div>
          <button onClick={() => {
            if (activeTab === 'rooms') { setEditingRoom(null); setIsAddRoomModalOpen(true); }
            if (activeTab === 'finance') setIsAddTransactionModalOpen(true);
            if (activeTab === 'meters_list') setIsAddMeterModalOpen(true);
          }} className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm active:scale-90 transition-all">
            <Plus className="w-4 h-4" strokeWidth={4} />
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full overflow-y-auto px-4 pt-3 pb-32 no-scrollbar scroll-smooth">

        {/* --- TỔNG QUAN --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <div className="grid grid-cols-4 gap-2 text-center text-left">
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
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Xe máy</p>
              </div>
            </div>

            <div className="bg-blue-600 p-5 rounded-xl text-white shadow-xl relative overflow-hidden border-b-6 border-blue-800">
              <TrendingUp className="w-12 h-12 opacity-10 absolute -right-2 -top-2" />
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">Thực thu dự kiến T3</p>
              <h3 className="text-2xl font-black">{formatN(stats.rev)}đ</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="bg-orange-400 p-4 rounded-xl text-white shadow-md relative overflow-hidden">
                <p className="text-[8px] font-black uppercase mb-1 opacity-80">Tiền điện</p>
                <p className="text-sm font-black">2.140.000đ</p>
              </div>
              <div className="bg-sky-500 p-4 rounded-xl text-white shadow-md relative overflow-hidden">
                <p className="text-[8px] font-black uppercase mb-1 opacity-80">Tiền nước</p>
                <p className="text-sm font-black">{formatN(stats.people * config.priceWaterPerson)}đ</p>
              </div>
            </div>
          </div>
        )}

        {/* --- PHÒNG TRỌ --- */}
        {activeTab === 'rooms' && (
          <div className="space-y-3 pb-20 text-left animate-in slide-in-from-right">
            <div className="grid grid-cols-2 gap-3 text-left">
              {currentRooms.map(r => {
                const payDays = diffDays(`${new Date().getFullYear()}-${new Date().getMonth() + 1}-${r.paymentDate}`);
                const endDays = diffDays(r.contractEnd);
                return (
                  <div key={r.id} className={`bg-white p-3.5 rounded-xl border-2 shadow-lg relative active:scale-95 transition-all text-left ${r.status === 'occupied' ? 'border-blue-600 shadow-blue-500/5' : 'opacity-60 border-dashed border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] ${r.status === 'occupied' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>P.{r.id}</span>
                      <Edit3 onClick={() => { setEditingRoom(r); setIsAddRoomModalOpen(true); }} className="w-3.5 h-3.5 text-slate-300 hover:text-blue-600 cursor-pointer" />
                    </div>
                    <p className="text-[14px] font-black text-blue-900 leading-none mb-3">{formatN(r.price)}đ</p>

                    <div className="space-y-1.5 border-t border-slate-50 pt-2 text-left">
                      <div className="flex justify-between items-center text-[7px] font-bold uppercase">
                        <span className="text-slate-400">Đóng tiền:</span>
                        <span className={payDays <= 3 ? 'text-red-500 font-black animate-pulse' : 'text-slate-900'}>{payDays} ngày tới</span>
                      </div>
                      <div className="flex justify-between items-center text-[7px] font-bold uppercase">
                        <span className="text-slate-400">Hợp đồng:</span>
                        <span className={endDays <= 30 ? 'text-orange-500 font-black' : 'text-slate-900'}>{endDays || 0} ngày nữa</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-1.5">
                      <div className="flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-bold"><Users2 className="w-2.5 h-2.5 mr-1" />{r.people}</div>
                      {r.eBikes > 0 && <div className="flex items-center px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-md text-[8px] font-bold"><Zap className="w-2.5 h-2.5 mr-1" />{r.eBikes}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* --- HÓA ĐƠN --- */}
        {activeTab === 'bills' && (
          <div className="space-y-2 pb-20 text-left animate-in slide-in-from-bottom">
            {currentBills.map(bill => (
              <div key={bill.id} onClick={() => setBottomSheet(bill)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-95 transition-all text-left">
                <div className="flex items-center space-x-3 text-left">
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

        {/* --- CÀI ĐẶT --- */}
        {activeTab === 'settings' && (
          <div className="space-y-4 text-left animate-in fade-in pb-20">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4 mb-2 text-left">
              <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white shadow-lg overflow-hidden ring-4 ring-blue-50">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" className="w-full h-full object-cover" alt="avatar" />
              </div>
              <div className="text-left">
                <h3 className="font-black text-sm uppercase text-slate-800 leading-none">ADMIN LUCKY</h3>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1.5 bg-blue-50 px-3 py-0.5 rounded-full w-fit">Chủ cơ sở</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 text-left">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest underline decoration-blue-600 decoration-2 underline-offset-4 mb-2 text-left">Cấu hình Bảng giá dịch vụ</h4>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1 text-left">Điện (/kWh)</label><input type="text" value={formatN(config.priceElec)} onChange={e => setConfig({ ...config, priceElec: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none" /></div>
                <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1 text-left">Tính tiền nước</label>
                  <select value={config.waterCalcMethod} onChange={e => setConfig({ ...config, waterCalcMethod: e.target.value })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none appearance-none">
                    <option value="person">Theo đầu người</option>
                    <option value="m3">Theo khối (m3)</option>
                  </select>
                </div>
                <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1 text-left">Giá Nước</label><input type="text" value={formatN(config.waterCalcMethod === 'person' ? config.priceWaterPerson : config.priceWaterM3)} onChange={e => setConfig({ ...config, [config.waterCalcMethod === 'person' ? 'priceWaterPerson' : 'priceWaterM3']: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none" /></div>
                <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1 text-left">Phí Rác</label><input type="text" value={formatN(config.priceTrash)} onChange={e => setConfig({ ...config, priceTrash: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none" /></div>
                <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1 text-left">Phí Vệ sinh</label><input type="text" value={formatN(config.priceCleaning)} onChange={e => setConfig({ ...config, priceCleaning: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none" /></div>
                <div className="space-y-1 text-left"><label className="text-[8px] font-black text-slate-400 uppercase px-1 text-left">Xe máy điện</label><input type="text" value={formatN(config.priceEBike)} onChange={e => setConfig({ ...config, priceEBike: parseN(e.target.value) })} className="w-full bg-slate-50 p-2.5 rounded-lg font-black text-xs outline-none" /></div>
              </div>
              <button onClick={() => showToast("Đã lưu bảng giá!")} className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-black uppercase text-[9px] shadow-lg flex items-center justify-center gap-2 border-b-4 border-blue-800 active:translate-y-1"><Save className="w-3.5 h-3.5" /> Lưu cài đặt</button>
            </div>

            <div className="bg-slate-900 p-8 rounded-xl text-white shadow-2xl space-y-6 relative overflow-hidden border-b-8 border-blue-600 text-left">
              <QrCode className="absolute top-0 right-0 p-6 opacity-10 rotate-12 scale-150" />
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest relative z-10 text-left">Tài khoản thu tiền</h4>
              <div className="space-y-4 relative z-10 text-left">
                <div className="flex justify-between items-center text-left"><p className="text-[9px] font-bold text-slate-500 uppercase">Ngân hàng</p><p className="font-black uppercase text-sm">{config.bankName}</p></div>
                <div className="flex justify-between items-center text-left"><p className="text-[9px] font-bold text-slate-500 uppercase">Số tài khoản</p><p className="font-black text-blue-400 text-lg tracking-widest">{config.bankAcc}</p></div>
              </div>
              <div className="pt-2 flex justify-center"><img src={`https://api.vietqr.io/image/970423-${config.bankAcc}-compact2.jpg?amount=100000&addInfo=TT%20PHONG%20LUCKY%20HOME`} className="w-40 h-40 rounded-xl border-4 border-white/10 shadow-2xl" alt="VietQR" /></div>
            </div>
          </div>
        )}

        {/* --- CHỐT SỐ --- */}
        {activeTab === 'meters_list' && (
          <div className="space-y-3 pb-20 text-left animate-in slide-in-from-right">
            {currentMeters.map(m => (
              <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-left">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3 text-left">
                    <div className={`w-9 h-9 rounded-lg ${m.type === 'heater' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-500'} flex items-center justify-center`}><Zap className="w-5 h-5" /></div>
                    <div className="text-left"><p className="text-[11px] font-black uppercase text-slate-800 leading-none">{m.id}</p><p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{m.name}</p></div>
                  </div>
                  <button onClick={() => setMappingMeter(m)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg active:bg-blue-600 active:text-white transition-all"><Boxes className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="text-left"><label className="text-[7px] font-black text-slate-400 uppercase mb-1 block px-1 text-left">Chốt cũ</label><div className="bg-slate-50 p-2.5 rounded-lg font-black text-slate-400 text-center text-sm shadow-inner">{formatN(m.oldVal)}</div></div>
                  <div className="text-left"><label className="text-[7px] font-black text-blue-600 uppercase mb-1 block px-1 text-left">Số mới</label><input type="text" placeholder="..." className="w-full bg-blue-50 border border-blue-100 p-2.5 rounded-lg font-black text-blue-600 text-center text-sm outline-none" /></div>
                </div>
              </div>
            ))}
            <button onClick={() => showToast("Đã lưu chỉ số!")} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-xl border-b-4 border-blue-800 mt-4 active:translate-y-1 transition-all">Xác nhận lưu toàn bộ</button>
          </div>
        )}

        {/* --- THU CHI --- */}
        {activeTab === 'finance' && (
          <div className="animate-in fade-in duration-500 pb-20 text-left">
            <div className="bg-slate-900 p-6 rounded-xl text-white shadow-xl relative overflow-hidden mb-6 border-b-8 border-blue-600 text-left">
              <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1 italic text-left">Quỹ tiền cơ sở</p>
              <h3 className="text-3xl font-black text-left tracking-tighter">{formatN(stats.rev)}đ</h3>
            </div>
            <div className="space-y-2 text-left">
              {currentTransactions.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:bg-slate-50 text-left">
                  <div className="flex items-center space-x-3 text-left">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-inner ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <ArrowRight className={`w-4 h-4 ${t.type === 'in' ? 'rotate-[-45deg]' : 'rotate-[135deg]'}`} />
                    </div>
                    <div className="text-left"><p className="text-xs font-black uppercase text-slate-800 leading-none mb-1">{t.category}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{t.date}</p></div>
                  </div>
                  <p className={`font-black text-xs ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === 'in' ? '+' : '-'}{formatN(t.amount)}đ</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER TAB BAR (VUÔNG CẠNH) */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] pointer-events-none">
        <div className="bg-white border-t border-slate-100 h-14 flex items-center justify-around px-2 pointer-events-auto shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
            { id: 'rooms', icon: Home, label: 'Phòng' },
            { id: 'spacer', icon: null, label: '' },
            { id: 'bills', icon: FileText, label: 'Bill' },
            { id: 'meters_list', icon: Zap, label: 'Số' },
          ].map((item, i) => (
            item.id === 'spacer' ? <div key={i} className="w-12" /> : (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(""); }} className={`flex flex-col items-center justify-center px-1 transition-all ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}>
                <div className={`p-1.5 rounded-lg ${activeTab === item.id ? 'bg-blue-50 shadow-inner' : ''}`}><item.icon className="w-4.5 h-4.5" strokeWidth={activeTab === item.id ? 3 : 2} /></div>
                <span className={`text-[6px] font-black uppercase mt-1 transition-all ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
              </button>
            )
          ))}
        </div>
        <button onClick={() => setShowQuickMenu(!showQuickMenu)} className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90 pointer-events-auto border-[4px] border-white ${showQuickMenu ? 'bg-slate-800 rotate-45' : 'bg-blue-600 shadow-blue-300'}`}><Plus className="w-7 h-7 text-white stroke-[4px]" /></button>
      </div>

      {/* QUICK MENU OVERLAY */}
      <div className={`fixed inset-0 z-[500] transition-opacity duration-300 ${showQuickMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowQuickMenu(false)} />
        <div className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[2rem] p-10 pb-36 transition-transform duration-500 transform ${showQuickMenu ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: 'Thêm Khách', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50', action: () => { setEditingRoom(null); setIsAddRoomModalOpen(true); setShowQuickMenu(false); } },
              { label: 'Ghi Tiền', icon: CircleDollarSign, color: 'text-rose-600 bg-rose-50', action: () => { setIsAddTransactionModalOpen(true); setShowQuickMenu(false); } },
              { label: 'Cài Đặt', icon: Settings, color: 'text-slate-600 bg-slate-50', action: () => { setActiveTab('settings'); setShowQuickMenu(false); } },
              { label: 'Chat AI', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50', action: () => { showToast("AI sẵn sàng!"); setShowQuickMenu(false); } },
              { label: 'Map Công Tơ', icon: Boxes, color: 'text-orange-600 bg-orange-50', action: () => { setActiveTab('meters_list'); setShowQuickMenu(false); } },
              { label: 'Đăng Xuất', icon: LogOut, color: 'text-red-600 bg-red-50', action: () => setIsLoggedIn(false) }
            ].map((item, i) => (
              <button key={i} onClick={() => { item.action(); }} className="flex flex-col items-center space-y-3 active:scale-90 transition-all text-left">
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
          <div className="bg-white w-full max-w-md rounded-t-xl p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500 relative max-h-[96vh] flex flex-col no-scrollbar overflow-y-auto">
            <div className="w-14 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 shrink-0" />
            <div className="flex justify-between items-center mb-6 shrink-0 text-left"><h3 className="text-base font-black uppercase text-slate-900 flex items-center tracking-widest"><Receipt className="w-6 h-6 mr-3 text-blue-600" /> Biên lai thu tiền</h3><button onClick={() => setBottomSheet(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 active:rotate-90 transition-all"><X className="w-5 h-5" /></button></div>
            <div className="space-y-6 overflow-y-auto no-scrollbar text-left pb-10">
              <div className="bg-indigo-600 p-8 rounded-xl text-center text-white shadow-xl relative overflow-hidden">
                <p className="text-[10px] font-black text-indigo-100 uppercase mb-2 tracking-[0.4em] opacity-80">Tổng tiền thu</p>
                <p className="text-5xl font-black tracking-tighter leading-none">{formatN(bottomSheet.total)}đ</p>
                <p className="text-[10px] mt-4 opacity-90 font-black bg-white/10 px-6 py-2 rounded-full w-fit mx-auto uppercase tracking-widest border border-white/20">PHÒNG {bottomSheet.roomId} • {bottomSheet.month}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl space-y-4 border-2 border-slate-100 shadow-inner text-left">
                <div className="flex justify-between items-center text-[12px] font-black text-left"><span className="text-slate-400 uppercase tracking-tighter text-left">Tiền thuê phòng</span><span className="text-slate-900">{formatN(bottomSheet.details.rent)}đ</span></div>
                <div className="flex justify-between items-center text-[12px] font-black text-left"><div className="flex flex-col text-left"><span className="text-slate-400 uppercase tracking-tighter text-left">Tiền điện riêng</span><span className="text-[9px] text-blue-600 font-bold italic">Số: {bottomSheet.meter?.old} → {bottomSheet.meter?.new}</span></div><span className="text-slate-900">{formatN(bottomSheet.details.elec)}đ</span></div>
                {bottomSheet.heaterMeter && (
                  <div className="flex justify-between items-center text-[12px] font-black text-left"><div className="flex flex-col text-left"><span className="text-slate-400 uppercase tracking-tighter text-left">Điện BNL Chung</span><span className="text-[9px] text-orange-600 font-bold italic">Số: {bottomSheet.heaterMeter.old} → {bottomSheet.heaterMeter.new}</span></div><span className="text-slate-900">{formatN(bottomSheet.details.heater)}đ</span></div>
                )}
                <div className="flex justify-between items-center text-[12px] font-black text-left"><span className="text-slate-400 uppercase tracking-tighter text-left">Nước & Dịch vụ & Xe</span><span className="text-slate-900">{formatN(bottomSheet.details.water + bottomSheet.details.service + (bottomSheet.details.ebikes || 0))}đ</span></div>
                <div className="border-t-2 border-dashed border-slate-200 pt-4 flex justify-between items-center text-xs font-black uppercase text-indigo-600 tracking-widest"><span>Tổng cộng</span><span className="text-2xl">{formatN(bottomSheet.total)}đ</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleCopyZalo(bottomSheet)} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[12px] uppercase shadow-xl active:scale-95 border-b-4 border-black">Copy Zalo</button>
                {bottomSheet.status === 'pending' && (
                  <button onClick={() => { setBills(bills.map(b => b.id === bottomSheet.id ? { ...b, status: 'paid' } : b)); setBottomSheet(null); showToast("Đã thu tiền!"); }} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black text-[12px] uppercase active:scale-95 shadow-xl border-b-4 border-emerald-800">Gạch nợ &radic;</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM PHÒNG */}
      {isAddRoomModalOpen && (
        <Modal title={editingRoom ? "Cập nhật phòng" : "Thêm phòng mới"} onClose={() => setIsAddRoomModalOpen(false)}>
          <AddRoomForm onSave={handleAddRoom} editingRoom={editingRoom} sharedHeaters={meters.filter(m => m.type === 'heater' && m.houseId === selectedHouse.id)} />
        </Modal>
      )}

      {/* ÁNH XẠ CÔNG TƠ */}
      {mappingMeter && (
        <Modal title={`Ánh xạ: ${mappingMeter.id}`} onClose={() => setMappingMeter(null)}>
          <div className="space-y-4 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase px-1">Chọn các phòng gán vào công tơ này:</p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto no-scrollbar py-2 text-left">
              {rooms.filter(r => r.houseId === selectedHouse.id).map(r => (
                <button key={r.id} onClick={() => {
                  const newIds = mappingMeter.roomIds.includes(r.id) ? mappingMeter.roomIds.filter(id => id !== r.id) : [...mappingMeter.roomIds, r.id];
                  setMeters(meters.map(m => m.id === mappingMeter.id ? { ...m, roomIds: newIds } : m));
                  setRooms(rooms.map(room => room.id === r.id ? { ...room, [mappingMeter.type === 'heater' ? 'heaterMeterId' : 'meterId']: mappingMeter.id } : room));
                  setMappingMeter({ ...mappingMeter, roomIds: newIds });
                }} className={`p-3 rounded-lg border font-black text-xs flex justify-between items-center ${mappingMeter.roomIds.includes(r.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  <span>Phòng {r.id}</span>
                  {mappingMeter.roomIds.includes(r.id) && <CheckCircle2 className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <button onClick={() => setMappingMeter(null)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px]">Hoàn tất ánh xạ</button>
          </div>
        </Modal>
      )}

      {/* MODAL GHI TIỀN */}
      {isAddTransactionModalOpen && (
        <Modal title="Ghi sổ thu chi" onClose={() => setIsAddTransactionModalOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); showToast("Đã lưu!"); setIsAddTransactionModalOpen(false); }} className="space-y-5 text-left">
            <select name="type" className="w-full p-4 bg-slate-100 rounded-xl font-black text-xs outline-none text-center"><option value="in">Phát sinh Thu (+)</option><option value="out">Phát sinh Chi (-)</option></select>
            <div className="space-y-1 text-left"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Số tiền (VND)</label><input type="text" name="amount" required placeholder="0" className="w-full p-4 bg-slate-50 rounded-xl font-black text-sm outline-none border-2 border-transparent focus:border-blue-600 shadow-inner" onInput={(e) => { e.target.value = formatN(parseN(e.target.value)); }} /></div>
            <div className="space-y-1 text-left"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Danh mục</label><input placeholder="VD: Sửa điện, Tiền rác..." required className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs outline-none shadow-inner" /></div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-xl border-b-4 border-blue-800 active:translate-y-1 transition-all">Lưu vào sổ cái</button>
          </form>
        </Modal>
      )}

      {/* MODAL THÊM CÔNG TƠ */}
      {isAddMeterModalOpen && (
        <Modal title="Thêm công tơ mới" onClose={() => setIsAddMeterModalOpen(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            setMeters([...meters, { id: fd.get('mid'), houseId: selectedHouse.id, type: fd.get('type'), name: fd.get('name'), roomIds: [], oldVal: Number(fd.get('val')) }]);
            showToast("Đã tạo!"); setIsAddMeterModalOpen(false);
          }} className="space-y-4 text-left">
            <div className="space-y-1 text-left"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Mã công tơ</label><input name="mid" placeholder="VD: CT-01" required className="w-full p-3 bg-slate-50 rounded-lg font-bold text-xs" /></div>
            <div className="space-y-1 text-left"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Tên mô tả</label><input name="name" placeholder="VD: BNL Tầng 1" required className="w-full p-3 bg-slate-50 rounded-lg font-bold text-xs" /></div>
            <div className="space-y-1 text-left"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Loại thiết bị</label>
              <select name="type" className="w-full p-3 bg-slate-50 rounded-lg font-bold text-xs outline-none appearance-none"><option value="electric">Điện phòng</option><option value="heater">Bình nóng lạnh</option></select>
            </div>
            <div className="space-y-1 text-left"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Chỉ số đầu</label><input name="val" type="number" defaultValue="0" required className="w-full p-3 bg-slate-50 rounded-lg font-bold text-xs" /></div>
            <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-xl border-b-4 border-orange-800">Xác nhận tạo</button>
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