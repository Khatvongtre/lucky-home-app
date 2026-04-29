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
  Edit, Trash2, ZapOff, PiggyBank, Landmark
} from 'lucide-react';

import { toPng } from 'html-to-image';
import jsQR from 'jsqr';

// ==========================================
// CẤU HÌNH API BACKEND (.NET 8)
// ==========================================
const API_URL = import.meta.env.VITE_API_URL;
console.log("API URL:", API_URL);

// ==========================================
// UTILS
// ==========================================
const formatN = (num) => {
  if (!num && num !== 0) return "0";
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
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  } catch (e) { return 0; }
};

const getDueInfo = (dueDay) => {
  if (!dueDay) return null;

  const now = new Date();
  let dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);

  if (now.getDate() > dueDay) {
    dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  }

  if (dueDate.getDate() !== dueDay) {
    dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);
  }

  const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

  return {
    dueDate,
    daysLeft
  };
};

const endContract = (startDateStr, months) => {
  if (!startDateStr || !months) return null;

  try {
    const startDate = new Date(startDateStr);

    // clone để tránh mutate
    const endDate = new Date(startDate);

    // cộng tháng
    endDate.setMonth(endDate.getMonth() + months);

    // trừ 1 ngày (vì hợp đồng thường tính đến hết ngày trước đó)
    endDate.setDate(endDate.getDate() - 1);

    return endDate;
  } catch (e) {
    return null;
  }
};

const getSafeDate = (dStr) => {
  try {
    const d = dStr ? new Date(dStr) : new Date();

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

const TRANSACTION_CATEGORIES = {
  RENT: { id: 0, label: 'Hóa đơn tiền phòng' },
  ELEC: { id: 1, label: 'Hóa đơn điện' },
  WATER: { id: 2, label: 'Hóa đơn nước' },
  INTERNET: { id: 3, label: 'Hóa đơn internet' },
  GENERAL: { id: 4, label: 'Hóa đơn chung' },
  OTHER: { id: 5, label: 'Khác' },
};

// ==========================================
// BỘ GIẢI MÃ VIETQR (EMVCo Parser)
// ==========================================
const parseVietQR = (qrString) => {
  let bin = '';
  let acc = '';
  try {
    let idx = 0;
    while (idx < qrString.length) {
      const tag = qrString.substring(idx, idx + 2);
      const len = parseInt(qrString.substring(idx + 2, idx + 4), 10);
      const val = qrString.substring(idx + 4, idx + 4 + len);

      // Thẻ 38 là Thông tin Tài khoản (Merchant Account Information)
      if (tag === '38') {
        let subIdx = 0;
        while (subIdx < val.length) {
          const subTag = val.substring(subIdx, subIdx + 2);
          const subLen = parseInt(val.substring(subIdx + 2, subIdx + 4), 10);
          const subVal = val.substring(subIdx + 4, subIdx + 4 + subLen);

          // Thẻ 01 bên trong 38 là Tổ chức thụ hưởng (Beneficiary Organization)
          if (subTag === '01') {
            let innerIdx = 0;
            while (innerIdx < subVal.length) {
              const innerTag = subVal.substring(innerIdx, innerIdx + 2);
              const innerLen = parseInt(subVal.substring(innerIdx + 2, innerIdx + 4), 10);
              const innerVal = subVal.substring(innerIdx + 4, innerIdx + 4 + innerLen);

              if (innerTag === '00') bin = innerVal; // Mã BIN Ngân hàng
              if (innerTag === '01') acc = innerVal; // Số tài khoản
              innerIdx += 4 + innerLen;
            }
          }
          subIdx += 4 + subLen;
        }
      }
      idx += 4 + len;
    }
  } catch (err) { console.error("Lỗi giải mã QR", err); }
  return { bin, acc };
};

const getBankNameFromBin = (bin) => {
  const banks = {
    '970422': 'MB BANK', '970436': 'VIETCOMBANK', '970407': 'TECHCOMBANK',
    '970415': 'VIETINBANK', '970418': 'BIDV', '970432': 'VPBANK',
    '970423': 'TPBANK', '970416': 'ACB', '970403': 'SACOMBANK',
    '970405': 'AGRIBANK', '970448': 'OCB', '970429': 'SCB',
    '970414': 'OCEANBANK', '970437': 'HDBANK', '970425': 'ABBANK'
  };
  return banks[bin] || 'Ngân hàng khác';
};

// ==========================================
// COMPONENTS CON
// ==========================================
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-[85vh] relative animate-in zoom-in-95 duration-300">
      <div className="sticky top-0 bg-blue-600 flex justify-between items-center p-3.5 shrink-0 rounded-t-xl z-10 text-left">
        <h3 className="font-black text-white uppercase text-[10px] tracking-widest">{title}</h3>
        <button type="button" onClick={onClose} className="p-1.5 bg-white/20 rounded-lg text-white active:scale-90 transition-all"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5 overflow-y-auto no-scrollbar">{children}</div>
    </div>
  </div>
);

// Component Hiển thị Thông báo
const ToastNotification = ({ toast }) => {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[1000] px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-top flex items-center text-white ${isError ? 'bg-red-600' : 'bg-slate-900'}`}>
      {isError ? <AlertCircle className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />}
      {toast.text}
    </div>
  );
};

const AuthView = ({ fetchApi, setIsLoggedIn, setUser, showToast }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [authForm, setAuthForm] = useState({ fullName: '', username: '', password: '' });

  const handleAuth = async (e, type) => {
    e.preventDefault();
    try {
      if (type === 'register') {
        await fetchApi('/auth/register', 'POST', authForm);
        showToast("Đăng ký thành công! Vui lòng đăng nhập.", "success");
        setIsRegistering(false);
      } else if (type === 'forgot') {
        await fetchApi('/auth/forgot-password', 'POST', { username: authForm.username });
        showToast("Đã gửi yêu cầu khôi phục mật khẩu. Vui lòng kiểm tra email/SĐT.", "success");
        setIsForgotPassword(false);
      } else {
        const res = await fetchApi('/auth/login', 'POST', authForm);
        localStorage.setItem('smartstay_token', res.token);
        localStorage.setItem('smartstay_user', JSON.stringify(res.user));
        setUser(res.user);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.log("Auth error:", error);
      showToast(error.message || "Lỗi xác thực", "error");
    }
  };

  return (
    <div className="w-full max-w-sm text-center">
      <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6 active:scale-95 transition-all">
        <Building2 className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 tracking-tighter uppercase mb-2">Lucky Home</h1>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-10">Quản lý trọ toàn diện</p>

      {isForgotPassword ? (
        <form className="space-y-3 text-left animate-in slide-in-from-bottom" onSubmit={(e) => handleAuth(e, 'forgot')}>
          <p className="text-xs text-slate-500 mb-4 font-medium text-center">Vui lòng nhập SĐT/Tên đăng nhập để nhận lại mật khẩu.</p>
          <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="text" placeholder="SĐT / Tên đăng nhập" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} required /></div>

          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all mt-4 border-b-1 border-indigo-800 text-center">
            Gửi yêu cầu
          </button>
          <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 text-center hover:text-blue-600 transition-colors">
            Quay lại Đăng nhập
          </button>
        </form>
      ) : (
        <form className="space-y-3 text-left animate-in slide-in-from-bottom" onSubmit={(e) => handleAuth(e, isRegistering ? 'register' : 'login')}>
          {isRegistering && (
            <div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="text" placeholder="Họ và tên" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm" value={authForm.fullName} onChange={e => setAuthForm({ ...authForm, fullName: e.target.value })} required /></div>
          )}
          <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="text" placeholder="SĐT / Tên đăng nhập" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} required /></div>
          <div className="relative group"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" /><input type="password" placeholder="Mật khẩu" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 shadow-sm" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required /></div>

          {!isRegistering && (
            <div className="text-right">
              <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline transition-all">
                Quên mật khẩu?
              </button>
            </div>
          )}

          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all mt-4 border-b-1 border-indigo-800 text-center">
            {isRegistering ? "Tạo Tài Khoản" : "Đăng Nhập"}
          </button>
          <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 text-center hover:text-blue-600 transition-colors">
            {isRegistering ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
          </button>
        </form>
      )}
    </div>
  );
};

const AddRoomForm = ({ onSave, onDelete, editingRoom, sharedHeaters, formatN, parseN }) => {
  const [heaterType, setHeaterType] = useState(editingRoom?.heaterMeterId ? 'shared' : 'private');
  const [status, setStatus] = useState(editingRoom?.status || 'full');
  const [roomType, setRoomType] = useState(editingRoom?.roomType || 'room');

  return (
    <form onSubmit={onSave} className="space-y-4 text-left">
      <div className="space-y-2">
        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Trạng thái phòng</label>
        <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
          <button type="button" onClick={() => setStatus('full')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${status === 'full' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Đã chốt</button>
          <button type="button" onClick={() => setStatus('empty')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${status === 'empty' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Đang trống</button>
        </div>
        <input type="hidden" name="status" value={status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Mã phòng / Tên MB</label><input name="rid" defaultValue={editingRoom?.roomCode || editingRoom?.id || ''} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Giá thuê</label><input name="price" type="text" defaultValue={formatN(editingRoom?.price || 0)} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-blue-600" onInput={(e) => e.target.value = formatN(parseN(e.target.value))} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase px-1">Loại hình</label>
          <select name="roomType" value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600 appearance-none">
            <option value="room">Phòng trọ</option>
            <option value="mbkd">Mặt bằng kinh doanh</option>
          </select>
        </div>
        {roomType === 'mbkd' && (
          <div className="space-y-1 animate-in zoom-in-95">
            <label className="text-[8px] font-black text-slate-400 uppercase px-1">Phí DV hàng tháng</label>
            <input name="monthlyFee" type="text" defaultValue={formatN(editingRoom?.monthlyFee || 0)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-blue-600 text-blue-700" onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="Thu hàng tháng" />
          </div>
        )}
      </div>

      <div className={`grid grid-cols-2 gap-3 text-left transition-all duration-300 ${status === 'empty' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Số cư dân</label><input name="people" type="number" defaultValue={editingRoom?.peopleCount ?? editingRoom?.people ?? 2} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Xe điện</label><input name="ebikes" type="number" defaultValue={editingRoom?.eBikeCount ?? editingRoom?.eBikes ?? 0} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
      </div>

      <div className={`space-y-1 text-left transition-all duration-300 ${status === 'empty' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Ngày ký HĐ</label>
        <input name="start" type="date" defaultValue={getSafeDate(editingRoom?.contractStart)} required={status === 'full'} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" />
      </div>

      <div className={`grid grid-cols-2 gap-3 text-left transition-all duration-300 ${status === 'empty' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Hạn đóng (Ngày)</label><input name="payDay" type="number" defaultValue={editingRoom?.paymentDate || 5} min="1" max="31" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Thời hạn (Tháng)</label><input name="months" type="number" defaultValue={editingRoom?.months || 12} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
      </div>

      <div className="space-y-1 text-left">
        <label className="text-[8px] font-black text-slate-400 uppercase px-1">Công tơ BNL</label>
        <select name="heaterType" value={heaterType} onChange={(e) => setHeaterType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600 appearance-none">
          <option value="private">Dùng riêng / Không có</option>
          <option value="shared">Dùng chung tổng</option>
        </select>
      </div>

      {heaterType === 'shared' && (
        <div className="space-y-1 animate-in slide-in-from-top-2 text-left">
          <label className="text-[8px] font-black text-blue-600 uppercase px-1">Chọn công tơ tổng</label>
          <select name="heaterMeterId" defaultValue={editingRoom?.heaterMeterId || ''} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-black text-xs outline-none focus:border-blue-600 text-blue-700">
            {sharedHeaters && sharedHeaters.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
            {(!sharedHeaters || sharedHeaters.length === 0) && <option value="">Không có công tơ BNL nào</option>}
          </select>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {editingRoom && (
          <button type="button" onClick={() => onDelete(editingRoom.id, editingRoom.roomCode)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-b-1 border-red-200 active:translate-y-1 transition-all text-center">
            Xóa
          </button>
        )}
        <button type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-b-1 border-blue-800 active:translate-y-1 transition-all text-center">
          {status === 'full' ? 'Lưu phòng' : 'Lưu phòng trống'}
        </button>
      </div>
    </form>
  );
};

// ==========================================
// ỨNG DỤNG CHÍNH
// ==========================================
const App = () => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [changePasswordForm, setChangePasswordForm] = useState({ oldPassword: '', newPassword: '' });

  // --- App State ---
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [toast, setToast] = useState(null); // { text, type }
  const [searchQuery, setSearchQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const toastTimer = useRef(null);

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
  const [savings, setSavings] = useState([]);
  const [isAddSavingModalOpen, setIsAddSavingModalOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState(null);
  const [savingCalc, setSavingCalc] = useState({ amount: 0, rate: 0, months: 0 });
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
  const [config, setConfig] = useState({});
  const [aiMessages, setAiMessages] = useState([{ role: 'assistant', text: 'Chào bạn! Tôi là trợ lý AI. Hệ thống đang sẵn sàng.' }]);


  // --- OTHER
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  // --- A. STATE QUẢN LÝ ---
  const [viewDate, setViewDate] = useState(new Date());
  const [txType, setTxType] = useState('in'); // 'in' hoặc 'out'
  const [selectedCat, setSelectedCat] = useState('OTHER'); // Lưu KEY
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('this-month');
  const [isFinanceStatsOpen, setIsFinanceStatsOpen] = useState(true);
  const [isSavingsStatsOpen, setIsSavingsStatsOpen] = useState(true);

  // Hàm hiển thị thông báo với Type (success/error)
  const showToast = useCallback((text, type = 'success') => {
    setToast({ text: String(text), type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // --- Logic phân quyền dựa trên từng Nhà được chọn ---
  // Các quyền: 'SuperAdmin', 'Owner', 'Manager', 'Staff'
  const currentRole = selectedHouse?.userRole;
  const isOwnerOrAdmin = ['SuperAdmin', 'Owner'].includes(currentRole);
  const isManagerOrAbove = ['SuperAdmin', 'Owner', 'Manager'].includes(currentRole);

  // --- STATE QUÉT QR ---
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
    // Reset thêm các state dữ liệu để bảo mật
    setHouses([]);
    setRooms([]);
    setBills([]);
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

      // Nếu lỗi 401 (Unauthorized) hoặc 403 (Forbidden) - Thường là do hết hạn hoặc token fake
      if (res.status === 401 || res.status === 403) {
        handleLogout(); // Xóa sạch localStorage và reset state
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


  // Kiểm tra token khi mới vào web
  useEffect(() => {
    const token = localStorage.getItem('smartstay_token');
    const savedUser = localStorage.getItem('smartstay_user');

    if (token && savedUser) {
      // 1. Tạm thời set login từ local
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);

      // 2. Kiểm tra "sức khỏe" của token với backend (Tùy chọn nhưng nên có)
      // Bạn có thể tạo 1 endpoint /auth/me hoặc đơn giản là gọi /house
      fetchApi('/house')
        .then(data => setHouses(data))
        .catch(err => {
          // Nếu lỗi ở đây (thường là 401), fetchApi sẽ tự gọi handleLogout()
          console.error("Session expired on load");
        });
    } else {
      handleLogout();
    }

    // Load html2canvas...
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [fetchApi, handleLogout]); // Thêm các phụ thuộc vào đây

  useEffect(() => {
    if (isLoggedIn && activeTab === 'savings') loadSavings();
  }, [isLoggedIn, activeTab, loadSavings]);

  // Lấy danh sách nhà
  useEffect(() => {
    if (isLoggedIn && !selectedHouse) {
      fetchApi('/house')
        .then(data => setHouses(data))
        .catch(err => {
          showToast(err.message, 'error');
        });
    }
  }, [isLoggedIn, selectedHouse, fetchApi, showToast]);

  const loadHouseData = useCallback(async (houseId) => {
    try {
      const now = new Date();
      const month = viewDate.getMonth() + 1;
      const year = viewDate.getFullYear();

      setMeters([]);
      setBills([]);

      // Cập nhật lại danh sách nhà để đồng bộ Doanh thu / Chi phí mới nhất
      const updatedHouses = await fetchApi('/house');
      setHouses(updatedHouses);
      const h = updatedHouses.find(x => x.id === houseId);
      if (h) {
        setConfig({ ...h });
        setSelectedHouse(h);
      }

      const summaryData = await fetchApi(`/management/dashboard/summary/${houseId}?year=${year}&month=${month}`);
      setDashboardSummary(summaryData);

      const roomsData = await fetchApi(`/room/${houseId}`);
      setRooms(roomsData);

      const metersData = await fetchApi(`/meter/${houseId}?year=${year}&month=${month}`);
      setMeters(metersData.map(m => ({ ...m, roomIds: JSON.parse(m.roomIdsJson || '[]') })));

      const billsData = await fetchApi(`/bill/${houseId}?year=${year}&month=${month}`);
      setBills(billsData.map(b => ({
        ...b, roomId: b.roomCode, details: JSON.parse(b.detailsJson || '{}'), meter: JSON.parse(b.meterInfoJson || '{}'), heaterMeter: b.heaterInfoJson ? JSON.parse(b.heaterInfoJson) : null
      })));

    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [houses, fetchApi, user, rooms.length, showToast, viewDate]);

  useEffect(() => {
    if (selectedHouse) {
      loadHouseData(selectedHouse.id);
    }
  }, [activeTab, selectedHouse?.id, viewDate]);
  // Thêm activeTab vào dependency để mỗi khi bấm chuyển Tab nó sẽ refresh lại dữ liệu mới nhất từ DB

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
    if (!window.confirm("Bạn có chắc chắn muốn xóa sổ tiết kiệm này?")) return;
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

    // Thu thập toàn bộ dữ liệu từ form
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
        // Cập nhật nhà hiện tại (BẠN CẦN CHUẨN BỊ API PUT Ở BACKEND)
        await fetchApi(`/house/${editingHouse.id}`, 'PUT', houseData);
        setHouses(houses.map(h => h.id === editingHouse.id ? { ...h, ...houseData } : h));
        showToast("Cập nhật cơ sở thành công!", "success");
      } else {
        // Thêm nhà mới
        const res = await fetchApi('/house', 'POST', houseData);
        setHouses([...houses, res]);
        showToast("Tạo cơ sở thành công!", "success");
      }
      // [QUAN TRỌNG]: Thay vì tự setHouses thủ công, hãy gọi lại API lấy danh sách mới nhất
      // Điều này đảm bảo house mới có đầy đủ UserRole và các trường thống kê từ Backend
      const data = await fetchApi('/house', 'GET');
      setHouses(data);

      setIsAiCreateHouseOpen(false);
      setEditingHouse(null);
    }
    catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  };
  // --- HÀM XỬ LÝ NHẬN DIỆN GIỌNG NÓI ---
  const handleMicClick = () => {
    // Kiểm tra xem trình duyệt có hỗ trợ không
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN'; // Set tiếng Việt
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
      // Nối tiếp văn bản nếu đang có sẵn chữ
      setAiPrompt(prev => prev ? prev + " " + transcript : transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Lỗi Mic:", event.error);
      setIsListening(false);
      showToast("Lỗi nhận diện giọng nói hoặc chưa cấp quyền Mic", "error");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

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
      houseId: selectedHouse?.id,
      roomCode: fd.get('rid'),
      roomType: fd.get('roomType') || 'room', // <-- THÊM MỚI
      monthlyFee: parseN(fd.get('monthlyFee') || '0'), // <-- THÊM MỚI
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
      showToast("Lưu phòng thành công!", "success");
      setIsAddRoomModalOpen(false);
      setEditingRoom(null);
    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  };

  const handleDeleteHouse = async (houseId, houseName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa cơ sở "${houseName}" và TOÀN BỘ dữ liệu liên quan không?`)) return;
    try {
      await fetchApi(`/house/${houseId}`, 'DELETE');
      setHouses(houses.filter(h => h.id !== houseId));
      if (selectedHouse?.id === houseId) setSelectedHouse(null);
      showToast("Đã xóa cơ sở thành công!", "success");
    } catch (e) { showToast("Lỗi xóa: " + e.message, "error"); }
  };

  const handleDeleteRoom = async (roomId, roomCode) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng/MBKD "${roomCode}" không?`)) return;
    try {
      await fetchApi(`/room/${roomId}`, 'DELETE');
      await loadHouseData(selectedHouse?.id);
      setIsAddRoomModalOpen(false);
      setEditingRoom(null);
      showToast("Đã xóa phòng thành công!", "success");
    } catch (e) { showToast("Lỗi xóa phòng: " + e.message, "error"); }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phiếu thu chi này không?`)) return;
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
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleDeleteMeter = async (meterId) => {
    if (!window.confirm("Bạn có chắc muốn xóa công tơ này?")) return;
    try {
      await fetchApi(`/meter/${meterId}`, 'DELETE');
      await loadHouseData(selectedHouse?.id);
      setIsAddMeterModalOpen(false);
      setEditingMeter(null);
      showToast("Đã xóa công tơ", "success");
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleSaveMeterMapping = async () => {
    if (!mappingMeter) return;
    try {
      await fetchApi(`/meter/${mappingMeter.id}/map`, 'PUT', {
        roomIds: mappingMeter.roomIds
      });
      showToast("Đã cập nhật sơ đồ công tơ!", "success");
      setMappingMeter(null);
    } catch (e) {
      showToast("Lỗi lưu sơ đồ: " + e.message, "error");
    }
  };

  const handleSaveMetersAndGenerateBills = async () => {
    try {
      const monthSelected = viewDate.getMonth() + 1;
      const yearSelected = viewDate.getFullYear();

      // 1. Lọc và đóng gói dữ liệu công tơ để lưu
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

      // 2. Gửi lệnh lưu chỉ số công tơ
      await fetchApi('/meter/update', 'POST', updates);

      // 3. TỰ ĐỘNG LẬP HÓA ĐƠN cho các phòng đã có số mới
      // Lọc những phòng mà công tơ điện (electric) vừa được cập nhật newVal
      const updatedMeterIds = updates.map(u => u.id);
      const roomsToGenerate = rooms.filter(r =>
        r.status === 'full' &&
        meters.some(m => m.type === 'electric' && m.roomIds?.includes(r.id) && (m.newVal !== null && m.newVal !== ""))
      );

      if (roomsToGenerate.length > 0) {
        const currentMonthFull = viewDate.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });

        const newBills = roomsToGenerate.map(room => {
          const meterAll = calcMeterAll(room, meters, rooms, config);
          const isPerson = config.waterCalcMethod === 'person';
          const waterCost = isPerson ? (config.priceWaterPerson || 0) * (room.peopleCount || 1) : 0;
          const serviceCost = (config.priceService || 0) * (room.peopleCount || 1);
          const netCost = config.priceNet || 0;
          const bikeCost = (room.eBikeCount || 0) * (config.priceEBike || 0);
          const monthlyFeeCost = room.roomType === 'mbkd' ? (room.monthlyFee || 0) : 0;

          const total = room.price + meterAll.elecRoomCost + meterAll.elecHeaterCost +
            waterCost + serviceCost + netCost + bikeCost + monthlyFeeCost;

          return {
            id: 'b-' + Date.now() + Math.random().toString(36).substr(2, 4),
            houseId: selectedHouse?.id,
            roomId: room.roomCode || room.id,
            month: monthSelected,
            year: yearSelected,
            currentMonthFull: currentMonthFull,
            status: 'pending',
            total: total,
            meter: { old: meterAll.meterRoomOld, new: meterAll.meterRoomNew },
            meterHeater: { old: meterAll.meterHeaterOld, new: meterAll.meterHeaterNew },
            details: {
              rent: room.price,
              elec: meterAll.elecRoomCost,
              heater: meterAll.elecHeaterCost,
              water: waterCost,
              internet: netCost,
              service: serviceCost,
              ebikes: bikeCost,
              monthlyFee: monthlyFeeCost,
              discount: 0
            }
          };
        });

        // Gửi lệnh tạo hóa đơn hàng loạt (Bulk Update/Insert)
        await fetchApi('/bill/generate-bulk', 'POST', newBills);
        showToast(`Đã lưu chỉ số & tự động lập ${roomsToGenerate.length} hóa đơn!`, "success");
      } else {
        showToast(`Đã lưu chỉ số ${monthDisplay}!`, "success");
      }

      // 4. Reload dữ liệu để đảm bảo quay lại là có thông tin mới nhất
      await loadHouseData(selectedHouse?.id);

    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  };

  // --- HÀM 1: Bấm nút "Lập hóa đơn" ở giao diện chính ---
  const handleGenerateClick = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Kiểm tra xem tháng này đã có hóa đơn chưa
    const alreadyGenerated = bills.some(b => b.month === month && b.year === year);

    if (alreadyGenerated) {
      setIsOverwriteModalOpen(true); // Nếu có rồi thì hiện Modal "đẹp"
    } else {
      executeGenerateBills(); // Nếu chưa có thì chạy thẳng luôn
    }
  };

  // --- HÀM 2: Logic tạo hóa đơn thực tế (chuyển từ hàm cũ sang) ---
  const executeGenerateBills = async () => {
    setIsOverwriteModalOpen(false); // Đóng modal nếu đang mở

    const currentMonthFull = new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const occupiedRooms = rooms.filter(r => r.status === 'full');
    if (occupiedRooms.length === 0) return showToast("Không có phòng nào đang thuê!", "error");

    const newBills = occupiedRooms.map(room => {
      const meterAll = calcMeterAll(room, meters, rooms, config);
      const isPerson = config.waterCalcMethod === 'person';
      const waterCost = isPerson ? (config.priceWaterPerson || 100000) * (room.peopleCount ?? room.people ?? 1) : 0;
      const serviceCost = (config.priceService || 0) * (room.peopleCount ?? room.people ?? 1);
      const netCost = config.priceNet || 100000;
      const bikeCost = (room.eBikeCount ?? room.ebikes ?? 0) * (config.priceEBike || 50000);
      const discount = 0;

      const monthlyFeeCost = room.roomType === 'mbkd' ? (room.monthlyFee || 0) : 0;
      const total = room.price + meterAll.elecRoomCost + meterAll.elecHeaterCost + waterCost + serviceCost + netCost + bikeCost + monthlyFeeCost - discount;

      return {
        id: 'b-' + Date.now() + Math.random().toString(36).substr(2, 4),
        houseId: selectedHouse?.id,
        roomId: room.roomCode || room.id,
        month: month,
        currentMonthFull: currentMonthFull,
        year: year,
        status: 'pending',
        total: total,
        meter: { old: meterAll?.meterRoomOld || 0, new: meterAll?.meterRoomNew || 0 },
        meterHeater: { old: meterAll?.meterHeaterOld || 0, new: meterAll?.meterHeaterNew || 0 },
        details: {
          rent: room.price,
          elec: meterAll.elecRoomCost,
          heater: meterAll.elecHeaterCost,
          water: waterCost,
          internet: netCost,
          service: serviceCost,
          ebikes: bikeCost,
          monthlyFee: monthlyFeeCost,
          discount: discount
        }
      };
    });

    try {
      await fetchApi('/bill/generate-bulk', 'POST', newBills);
      await loadHouseData(selectedHouse?.id);
      showToast("Đã lập hóa đơn thành công!", "success");
    } catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
  };

  const calcMeterAll = (room, meters, rooms, config) => {
    const priceElec = config.priceElec || 4000;
    const priceHeater = config.priceHeater || 4000;

    // =====================
    // 1. Điện phòng (electric)
    // =====================
    const meterRoom = meters.find(m => m.type === "electric" && m.roomIds?.includes(room.id));
    const elecRoomUsed = Math.max(0, (meterRoom?.newVal || 0) - (meterRoom?.oldVal || 0));
    const elecRoomCost = elecRoomUsed * priceElec;
    const meterRoomOld = meterRoom?.oldVal || 0;
    const meterRoomNew = meterRoom?.newVal || 0;

    // =====================
    // 2. BNL (heater - dùng chung)
    // =====================
    const meterHeater = meters.find(m => m.type === "heater" && m.roomIds?.includes(room.id));
    const elecHeaterUsed = Math.max(0, (meterHeater?.newVal || 0) - (meterHeater?.oldVal || 0));
    let elecHeaterCost = elecHeaterUsed * priceHeater;
    const meterHeaterOld = meterHeater?.oldVal || 0;
    const meterHeaterNew = meterHeater?.newVal || 0;

    // 👉 chia đều theo phòng (có thể đổi sang theo người)
    let heaterUsedPerRoom = 0;

    if (meterHeater) {
      const sharedRooms = rooms.filter(r => meterHeater.roomIds.includes(r.id));

      const totalPeople = sharedRooms.reduce((sum, r) => sum + (r.peopleCount || 1), 0);
      const roomPeople = room.peopleCount || 1;
      const totalHeaterUsed = Math.max(0, (meterHeater.newVal || 0) - (meterHeater.oldVal || 0));

      elecHeaterCost = totalPeople > 0 ? ((totalHeaterUsed * roomPeople) / totalPeople) * priceHeater : 0;
      console.log(`Tổng ${roomPeople} / ${totalPeople} người. Tiêu thụ BNL: ${totalHeaterUsed} => Phân bổ cho phòng này: ${elecHeaterCost}`);
    }
    // =====================
    // 3. Tổng
    // =====================
    return {
      elecRoomUsed,
      elecRoomCost,
      meterRoomOld,
      meterRoomNew,
      elecHeaterUsed,
      elecHeaterCost,
      meterHeaterOld,
      meterHeaterNew,
    };
  };

  // ==========================================
  // XỬ LÝ NHẬP GIẢM GIÁ (DISCOUNT) TẠI BOTTOM SHEET
  // ==========================================
  const handleDiscountChange = (billId, val) => {
    const dVal = parseN(String(val)) || 0;

    // 1. Tìm hóa đơn cần cập nhật (Đồng bộ ngay lập tức để input không bị delay)
    const targetBill = bills.find(b => b.id === billId);
    if (!targetBill) return;

    // 2. Tính lại tổng tiền
    const baseTotal = targetBill.details.rent + targetBill.details.elec + (targetBill.details.heater || 0) + targetBill.details.water + (targetBill.details.internet || 0) + (targetBill.details.service || 0) + (targetBill.details.ebikes || 0);
    const newTotal = Math.max(0, baseTotal - dVal);

    // 3. Chuẩn bị Object hóa đơn mới
    const updatedBillData = {
      ...targetBill,
      total: newTotal,
      details: { ...targetBill.details, discount: dVal }
    };

    // 4. Update cả 2 State cùng lúc
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
    } catch (e) {
      showToast("Đã có lỗi xảy ra ! (" + e.message + ")", "error");
    }
  };

  const handleAddTx = async (e) => {
    e.preventDefault();
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
    }
    catch (e) {
      showToast("Lỗi: " + e.message, "error");
    }
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

  const handleSaveConfig = async () => {
    try {
      await fetchApi(`/house/${selectedHouse?.id}/config`, 'PUT', config);
      showToast("Đã lưu cấu hình lên máy chủ!", "success");
    } catch (e) {
      showToast("Đã có lỗi xảy ra ! (" + e.message + ")", "error");
    }
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
    // Dùng ID động theo id hóa đơn để tránh trùng lặp DOM khi chụp ảnh
    const el = document.getElementById(`hidden-receipt-export-${billData.id}`);

    if (!el) {
      showToast("Giao diện chưa sẵn sàng, vui lòng thử lại sau 1 giây", "error");
      return;
    }

    setIsGeneratingImage(true);

    try {
      // Đợi ảnh QR load xong
      const qrImg = el.querySelector('img');
      if (qrImg && !qrImg.complete) {
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
        });
      }

      await new Promise(r => setTimeout(r, 400)); // Nghỉ 400ms cho DOM ổn định

      let canvas = null;

      // 3. ƯU TIÊN: toPng với cấu hình ép nền trắng và bật sáng
      try {
        const dataUrl = await toPng(el, {
          pixelRatio: 2.5,
          cacheBust: true,
          backgroundColor: '#ffffff', // Bắt buộc để tránh viền đen
          style: {
            opacity: '1' // Trả lại độ sáng cho ảnh được chụp
          }
        });

        const img = new Image();
        img.src = dataUrl;

        await new Promise(resolve => {
          img.onload = resolve;
        });

        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

      } catch (err) {
        console.warn("toPng lỗi → fallback html2canvas", err);
      }

      // ===== FALLBACK =====
      if (!canvas) {
        if (!window.html2canvas) {
          throw new Error("Thiếu html2canvas");
        }

        canvas = await window.html2canvas(el, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: null, // 🔥 QUAN TRỌNG
        });
      }

      // ===== 🔥 AUTO CROP =====
      const cropCanvas = (canvas) => {
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        const data = ctx.getImageData(0, 0, width, height).data;

        let top = null, left = null, right = null, bottom = null;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i + 3] > 0) {
              if (top === null) top = y;
              if (left === null || x < left) left = x;
              if (right === null || x > right) right = x;
              bottom = y;
            }
          }
        }

        const w = right - left;
        const h = bottom - top;

        const cropped = document.createElement('canvas');
        cropped.width = w;
        cropped.height = h;

        cropped.getContext('2d').drawImage(
          canvas,
          left,
          top,
          w,
          h,
          0,
          0,
          w,
          h
        );

        return cropped;
      };

      const finalCanvas = cropCanvas(canvas);

      // ===== COPY =====
      const blob = await new Promise(resolve =>
        finalCanvas.toBlob(resolve, 'image/png')
      );

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      showToast("Đã copy ảnh vào clipboard!", "success");

    } catch (e) {
      console.error(e);
      showToast("Lỗi khi tạo ảnh: " + e.message, "error");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // --- HÀM XỬ LÝ NHẬN DIỆN ẢNH QR MỚI ---
  const handleUploadQR = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningQR(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Vẽ ảnh lên canvas tạm để lấy dữ liệu pixel
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Quét mã QR
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const { bin, acc } = parseVietQR(code.data);
          if (bin && acc) {
            setConfig(prev => ({
              ...prev,
              bankBin: bin,
              bankAcc: acc,
              bankName: getBankNameFromBin(bin)
            }));
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
    e.target.value = null; // Reset để có thể up lại cùng 1 ảnh
  };

  const monthLabels = {
    'this-month': 'Tháng này',
    'last-month': 'Tháng trước',
    'all': 'Tất cả'
  };

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



  // --- B. LOGIC CHỌN THÁNG ---

  // Hàm lùi tháng (Chỉ làm nhiệm vụ đổi State)
  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  // Hàm tiến tháng (Chỉ làm nhiệm vụ đổi State)
  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  // TỰ ĐỘNG tải lại dữ liệu khi viewDate hoặc selectedHouse thay đổi
  // useEffect(() => {
  //   const fetchMetersByDate = async () => {
  //     if (!selectedHouse?.id) return;

  //     const monthSelected = viewDate.getMonth() + 1;
  //     const yearSelected = viewDate.getFullYear();
  //     const houseIdSelected = selectedHouse.id;

  //     try {
  //       // Gọi API lấy dữ liệu theo tháng/năm đã chọn
  //       const metersData = await fetchApi(
  //         `/meter/${houseIdSelected}?year=${yearSelected}&month=${monthSelected}`
  //       );

  //       // Cập nhật State meters
  //       setMeters(metersData.map(m => ({
  //         ...m,
  //         roomIds: JSON.parse(m.roomIdsJson || '[]')
  //       })));
  //     } catch (error) {
  //       console.error("Lỗi khi tải dữ liệu công tơ:", error);
  //       // showToast("Không thể tải dữ liệu tháng này", "error");
  //     }
  //   };

  //   fetchMetersByDate();
  // }, [viewDate, selectedHouse?.id]); // Chạy lại mỗi khi đổi tháng hoặc đổi nhà

  // Biến hiển thị
  const monthDisplay = `Tháng ${viewDate.getMonth() + 1}, ${viewDate.getFullYear()}`;

  // --- C. TÍNH TOÁN TỔNG HỢP (Đặt sau khi đã có hàm và state) ---
  const summary = useMemo(() => {
    // Nếu không có dữ liệu, trả về tất cả bằng 0
    if (!currentMeters || currentMeters.length === 0) {
      return { kwh: 0, heater: 0, money: 0 };
    }

    let totalKwh = 0;
    let totalHeater = 0;

    currentMeters.forEach(m => {
      // KIỂM TRA NGHIÊM NGẶT: Nếu 1 trong 2 ô trống thì bỏ qua không cộng vào tổng
      const isOldEmpty = m.oldVal === null || m.oldVal === "";
      const isNewEmpty = m.newVal === null || m.newVal === "";

      if (!isOldEmpty && !isNewEmpty) {
        const vOld = parseN(m.oldVal);
        const vNew = parseN(m.newVal);

        // Chỉ cộng nếu số mới >= số cũ
        const diff = vNew >= vOld ? (vNew - vOld) : 0;

        totalKwh += diff;

        // Nếu là loại bình nóng lạnh thì cộng thêm vào mục heater
        if (m.type === 'heater') {
          totalHeater += diff;
        }
      }
    });

    // Tính tổng tiền dựa trên tổng kWh hợp lệ
    const totalMoney = totalKwh * (config?.priceElec || 3500);

    return {
      kwh: totalKwh,
      heater: totalHeater,
      money: totalMoney
    };
  }, [currentMeters, config?.priceElec]);
  // Hàm này sẽ tự động chạy lại mỗi khi bạn nhập số vào bất kỳ ô nào

  // --- LOGIC TẢI GIAO DỊCH THEO LOẠI ---
  useEffect(() => {
    const loadTransactions = async () => {
      if (!selectedHouse?.id) return;

      try {
        // Truyền tham số type vào URL (ví dụ: ?type=this_month)
        const txData = await fetchApi(
          `/transaction/${selectedHouse.id}?type=${selectedMonth}`
        );

        // Cập nhật danh sách giao dịch
        setTransactions(txData);

      } catch (e) {
        console.error("Lỗi khi tải giao dịch:", e.message);
        // showToast("Không thể tải dữ liệu tài chính", "error");
      }
    };

    loadTransactions();
  }, [selectedMonth, selectedHouse?.id]); // Chạy lại khi đổi loại tháng hoặc đổi nhà

  // ==========================================
  // RENDER QUYẾT ĐỊNH LUỒNG
  // ==========================================

  // 1. CHƯA ĐĂNG NHẬP -> HIỂN THỊ FORM LOGIN/REGISTER
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-left animate-in fade-in duration-700">
        <ToastNotification toast={toast} />
        <AuthView fetchApi={fetchApi} setIsLoggedIn={setIsLoggedIn} setUser={setUser} showToast={showToast} />
      </div>
    );
  }

  // 2. ĐÃ ĐĂNG NHẬP NHƯNG CHƯA CHỌN CƠ SỞ -> CHỌN CƠ SỞ
  if (isLoggedIn && !selectedHouse) {
    // --- LOGIC TÌM KIẾM & THỐNG KÊ ---
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

    // --- LOGIC TÍNH NGÀY ĐẾN HẠN NÂNG CAO (HỖ TRỢ ĐÓNG NHIỀU THÁNG) ---
    const getAdvancedDueInfo = (startDate, paymentDay, paymentPeriod) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const period = paymentPeriod || 1; // Mặc định 1 tháng/lần
      const day = paymentDay || 5;       // Mặc định ngày mùng 5

      // Lấy mốc thời gian bắt đầu
      let start = new Date();
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) start = d;
      }

      // Tính số tháng đã trôi qua từ lúc bắt đầu đến hiện tại
      let monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
      if (monthsDiff < 0) monthsDiff = 0;

      // Tính xem đã qua bao nhiêu chu kỳ, từ đó tìm ra tháng của kỳ đóng tiền hiện tại
      let periodsPassed = Math.floor(monthsDiff / period);
      let targetMonth = start.getMonth() + (periodsPassed * period);

      // Ngày hạn đóng tiền của kỳ này
      let dueDate = new Date(start.getFullYear(), targetMonth, day);

      // Nếu hôm nay đã vượt qua hạn đóng tiền của kỳ này, chuyển sang tính cho kỳ tiếp theo
      if (today > dueDate) {
        dueDate = new Date(start.getFullYear(), targetMonth + period, day);
      }

      // Tính số ngày còn lại
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return { daysLeft: diffDays, dueDate };
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center">
        <ToastNotification toast={toast} />

        <div className="w-full max-w-sm flex flex-col h-screen relative overflow-hidden">

          {/* PHẦN FIXED/STICKY TOP */}
          <div className="sticky top-0 z-20 bg-slate-50 pt-4 px-3 pb-2 space-y-3 shadow-sm border-b border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-[18px] font-black text-slate-900 uppercase tracking-tighter border-l-4 border-blue-600 pl-3">Chọn Cơ Sở</h2>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">{user?.role}</span>
                <button onClick={handleLogout} className="p-1.5 bg-red-50 text-red-500 rounded-lg active:scale-90 transition-all hover:bg-red-100 hover:text-red-600">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Box Thống kê */}
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

            {/* Ô Search */}
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

          {/* DANH SÁCH NHÀ */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-3 pt-3 pb-28 space-y-2.5 relative">
            {filteredHouses.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center mt-8">Không tìm thấy cơ sở nào.</p>
            )}

            {filteredHouses.map(h => {
              const payInfo = getAdvancedDueInfo(h.startDate, h.paymentDay, h.paymentPeriod);

              const isUrgentPay = payInfo.daysLeft <= 3;
              const isWarningPay = payInfo.daysLeft <= 7;
              const shouldShowPayInfo = payInfo.daysLeft <= 30; // Chỉ hiện nếu hạn đóng tiền <= 10 ngày
              const isFull = h.emptyRooms === 0;

              // Xác định màu nền của toàn bộ Card dựa trên mức độ ưu tiên
              const cardStyle = isUrgentPay
                ? 'bg-red-50/50 border-red-100'
                : isFull
                  ? 'bg-emerald-50/30 border-emerald-100'
                  : 'bg-white border-slate-100';

              // Chuyển đổi vai trò sang Tiếng Việt và màu sắc tương ứng
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
                      onClick={() => { setSelectedHouse(h); setSearchQuery(''); }}
                      className="flex-1 flex items-center space-x-2 text-left overflow-hidden"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${isUrgentPay ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`font-black text-[13px] uppercase tracking-tight leading-tight truncate ${isUrgentPay ? 'text-red-700' : 'text-slate-800'}`}>
                            {h.name}
                          </h3>
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${roleInfo.class}`}>
                            {roleInfo.text}
                          </span>
                        </div>
                        <p className="text-[9px] font-medium text-slate-400 mt-0.5 flex items-center truncate">
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
                      <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-md ${isFull ? 'text-emerald-700 bg-emerald-100/50' : 'text-slate-500 bg-slate-100/50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isFull ? '' : 'animate-pulse'} ${getRoomStatusColor()}`} />
                        {isFull ? `Đã lấp đầy (${h.totalRooms} phòng)` : `Trống ${h.emptyRooms} / ${h.totalRooms} phòng`}
                      </div>
                    </div>

                    {/* LOGIC MỚI: Chỉ hiển thị nếu hạn đóng tiền <= 10 ngày */}
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

          {/* VÙNG NÚT CỐ ĐỊNH Ở ĐÁY */}
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

        {/* MODAL PHÂN QUYỀN VÀ CHIA SẺ CƠ SỞ */}
        {isShareModalOpen && (
          <Modal title="PHÂN QUYỀN & CHIA SẺ CƠ SỞ" onClose={() => { setIsShareModalOpen(false); setSharingHouse(null); }}>
            <form onSubmit={handleAssignRole} className="space-y-4 text-left">
              <p className="text-[10px] font-bold text-slate-500 mb-2">Thêm tài khoản quản lý cho cơ sở <span className="text-blue-600 font-black">{sharingHouse?.name}</span></p>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tài khoản (SĐT/Username)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" required value={assignForm.username} onChange={(e) => setAssignForm({ ...assignForm, username: e.target.value })}
                    placeholder="Nhập SĐT hoặc tên đăng nhập..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vai trò (Role)</label>
                <select
                  value={assignForm.role} onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-600 transition-all appearance-none"
                >
                  <option value="Manager">Quản lý (Manager)</option>
                  <option value="Staff">Nhân viên (Staff)</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-2 border-b-1 border-blue-800 text-center mt-4 active:scale-95 transition-all">
                <UserCheck className="w-4 h-4" /> Xác nhận cấp quyền
              </button>
            </form>
          </Modal>
        )}

        {/* MODAL THÊM/SỬA NHÀ (FORM GIỮ NGUYÊN) */}
        {isAiCreateHouseOpen && (
          <Modal title={editingHouse ? "SỬA THÔNG TIN CƠ SỞ" : "TẠO CƠ SỞ MỚI"} onClose={() => { setIsAiCreateHouseOpen(false); setEditingHouse(null); }}>
            <form onSubmit={handleAddHouse} className="space-y-4 text-left">
              {/* Form giữ nguyên y như phiên bản trước */}
              <div className="space-y-3">
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Tên Cơ Sở</label><input name="name" defaultValue={editingHouse?.name || ''} required placeholder="VD: Lucky Cầu Giấy" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">Địa chỉ</label><input name="address" defaultValue={editingHouse?.address || ''} required placeholder="VD: Số 10, Ngõ 12..." className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200">
                <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 flex items-center tracking-widest"><FileText className="w-3.5 h-3.5 mr-1" /> Thông tin hợp đồng thuê</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase px-1">1. Giá thuê nhà / tháng</label><input name="rentPrice" defaultValue={formatN(editingHouse?.rentPrice || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 15.000.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-blue-600 text-blue-700" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">2. Ngày bắt đầu</label><input type="date" name="startDate" defaultValue={getSafeDate(editingHouse?.startDate || '')} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">3. Thời hạn thuê (Tháng)</label><input type="number" name="leaseTerm" defaultValue={editingHouse?.leaseTerm || ''} placeholder="VD: 60" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">4. Tiền cọc</label><input name="deposit" defaultValue={formatN(editingHouse?.deposit || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 30.000.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">5. Đóng tiền mấy tháng/lần</label><input type="number" name="paymentPeriod" defaultValue={editingHouse?.paymentPeriod || 1} placeholder="VD: 3" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">6. Ngày đóng hàng tháng</label><input type="number" name="paymentDay" min="1" max="31" defaultValue={editingHouse?.paymentDay || 5} placeholder="VD: 5" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase px-1">7. Phí Internet / tháng</label><input name="internetFee" defaultValue={formatN(editingHouse?.internetFee || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 250.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                  <div className="space-y-1 col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase px-1">8. Chi phí khác</label><input name="otherFees" defaultValue={formatN(editingHouse?.otherFees || '')} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="VD: 100.000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
                  <div className="space-y-1 col-span-2"><label className="text-[8px] font-black text-slate-400 uppercase px-1">9. Ghi chú</label><textarea name="notes" defaultValue={editingHouse?.notes || ''} rows="2" placeholder="Ghi chú thêm..." className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600 resize-none" /></div>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-2 border-b-1 border-blue-800 text-center mt-4">
                <Save className="w-4 h-4" /> {editingHouse ? "Lưu thay đổi" : "Khởi tạo cơ sở"}
              </button>
            </form>
          </Modal>
        )}

        {/* MODAL TẠO NHÀ BẰNG AI (GIỮ NGUYÊN) */}
        {isAiPromptModalOpen && (
          <Modal title="TRỢ LÝ AI TẠO NHÀ" onClose={() => { setIsAiPromptModalOpen(false); setIsListening(false); setAiFeedback(""); }}>
            <div className="space-y-4 text-left">

              {/* Lời nhắn phản hồi của AI (Chỉ hiện khi AI hỏi lại) */}
              {aiFeedback && (
                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-start space-x-2 animate-in slide-in-from-top-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-black text-indigo-700 leading-snug">{aiFeedback}</p>
                </div>
              )}

              {/* BOX TRẠNG THÁI NHẬN DIỆN (LÀM THÔNG MINH) */}
              <div className="flex flex-wrap gap-2 p-3 bg-slate-900 rounded-xl shadow-inner border border-white/5">
                <div className="flex flex-col items-center flex-1">
                  <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Địa chỉ</p>
                  <div className={`w-full py-1.5 rounded-lg text-center text-[10px] font-black transition-all ${aiPrompt.includes(',') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>
                    {aiPrompt.split(',')[0].slice(0, 15) || "---"}
                  </div>
                </div>
                <div className="flex flex-col items-center px-4 border-x border-white/10">
                  <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Số tầng</p>
                  <div className={`px-4 py-1.5 rounded-lg text-center text-[10px] font-black transition-all ${/(\d+)\s*(tầng|tang|tnagf|lầu|lau)/i.test(aiPrompt) ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-600'}`}>
                    {aiPrompt.match(/(\d+)\s*(tầng|tang|tnagf|lầu|lau)/i)?.[1] || "0"}
                  </div>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Số phòng</p>
                  <div className={`w-full py-1.5 rounded-lg text-center text-[10px] font-black transition-all ${/(\d+)\s*(phòng|phong|p\s|p$)/i.test(aiPrompt) ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-slate-600'}`}>
                    {aiPrompt.match(/(\d+)\s*(phòng|phong|p\s|p$)/i)?.[1] || "0"}
                  </div>
                </div>
              </div>

              {/* VÙNG 1: Ô nhập liệu và Mic */}
              <div className="relative">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center mb-2">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> {aiFeedback ? "Bạn hãy bổ sung thêm ở dưới:" : "Bạn muốn tạo nhà thế nào?"}
                </label>
                <div className="relative">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="VD: 180 Nam Dư, Vĩnh Hưng, Hà Nội Nhà 4 tầng 6 phòng giá 3.5tr..."
                    className="w-full p-3.5 pr-12 bg-indigo-50/50 border border-indigo-100 rounded-xl font-bold text-[13px] outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none min-h-[100px] text-slate-700 leading-relaxed shadow-inner"
                  />
                  {/* Nút Mic */}
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className={`absolute right-2 bottom-2 p-2.5 rounded-xl transition-all shadow-sm ${isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-red-200'
                      : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'
                      }`}
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
                {isListening && <p className="text-[9px] font-bold text-red-500 italic mt-1 text-right animate-pulse">Đang nghe...</p>}
              </div>

              {/* VÙNG 2: Các mẫu có sẵn (Quick Templates) */}
              <div className="pt-2 border-t border-dashed border-slate-200">
                <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2.5 tracking-widest">Mẫu thực tế chuyên sâu</h4>
                <div className="flex flex-col gap-2">
                  {[
                    "180 Nam Dư, Vĩnh Hưng Hà Nội Nhà 4 tầng 6 phòng giá 10.5tr",
                    "Ngõ 10 Cầu Giấy, Nhà 5 lầu 12 phòng, tầng trệt kinh doanh giá 15 củ",
                    "Số 50 Trần Duy Hưng, Nhà 3 tầng 4 phòng, tầng 1 để xe giá 8 triệu"
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAiPrompt(tpl)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 active:scale-95 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-left leading-tight"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* VÙNG 3: Nút Submit */}
              <button
                onClick={async () => {
                  if (!aiPrompt.trim()) {
                    showToast("Vui lòng nhập mô tả hoặc chọn mẫu!", "error");
                    return;
                  }

                  showToast("AI đang xử lý... vui lòng đợi!", "success");

                  try {
                    // Gọi API Backend đã tạo
                    const res = await fetchApi('/house/ai-generate', 'POST', { prompt: aiPrompt });

                    if (res.isSuccess === false) {
                      // Bị thiếu thông tin, hiện thông báo đòi nhập thêm
                      setAiFeedback(res.message);
                      showToast("AI cần thêm thông tin!", "error");
                    } else {
                      // Tạo thành công
                      const updatedHouses = await fetchApi('/house', 'GET');
                      setHouses(updatedHouses);
                      showToast("Phép màu đã xảy ra! Nhà đã được tạo.", "success");
                      setIsAiPromptModalOpen(false);
                      setAiPrompt("");
                      setAiFeedback("");
                    }
                  } catch (e) {
                    showToast("Lỗi khi tạo AI: " + e.message, "error");
                  }
                }}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-black uppercase text-[11px] flex items-center justify-center gap-2 border-b-1 border-indigo-800 text-center mt-4 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 text-indigo-100" /> Bắt đầu tạo tự động
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }



  // 3. ĐÃ VÀO TRONG APP -> RENDER GIAO DIỆN CHÍNH
  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col max-w-lg mx-auto w-full relative border-x border-slate-100 shadow-2xl overflow-hidden">
      <ToastNotification toast={toast} />

      {/* HEADER */}
      <header className="px-4 h-14 flex items-center justify-between shrink-0 bg-blue-600 text-white z-50 shadow-md relative">
        <div className="flex items-center space-x-2">
          <button onClick={() => activeTab === 'dashboard' ? setSelectedHouse(null) : setActiveTab('dashboard')} className="p-1.5 bg-white/10 rounded-lg active:scale-90 transition-all flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-50 mt-0.5">
            {activeTab === 'dashboard' ? 'Trang chủ' : activeTab === 'rooms' ? 'Phòng' : activeTab === 'meters_list' ? 'Chốt số điện' : activeTab === 'bills' ? 'Hóa đơn' : activeTab === 'finance' ? 'Thu chi' : activeTab === 'savings' ? 'Sổ tiết kiệm' : activeTab === 'ai' ? 'Chat AI' : 'Cài đặt'}
          </h2>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center space-x-1.5">
          <Building2 className="w-4 h-4 opacity-80" />
          <h2 className="text-sm font-black uppercase tracking-tighter mt-0.5">Lucky Home</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex flex-row items-center space-x-1 cursor-pointer active:opacity-80" onClick={() => setSelectedHouse(null)}>
            <p className="text-[8px] font-light text-blue-100 uppercase tracking-widest truncate max-w-[100px] mt-0.5">{selectedHouse.name}</p>
            <MoreHorizontal className="w-3.5 h-3.5 opacity-60" />
          </div>
          {isOwnerOrAdmin && (
            <div onClick={() => setActiveTab('settings')} className="w-8 h-8 rounded-full border border-white/30 overflow-hidden cursor-pointer active:scale-90 shadow-sm bg-white flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          )}
        </div>
      </header>

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
            if (activeTab === 'savings') { setEditingSaving(null); setSavingCalc({ amount: 0, rate: 0, months: 0 }); setIsAddSavingModalOpen(true); }
          }} className="p-1.5 bg-blue-600 text-white rounded-lg active:scale-90 transition-all flex items-center justify-center">
            <Plus className="w-4.5 h-4.5" strokeWidth={4} />
          </button>
        </div>
      )}

      {/* KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH */}
      <main className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-32 no-scrollbar scroll-smooth">

        {/* --- TỔNG QUAN --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            {shouldShowMeterBanner && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-xl text-white shadow-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg"><Zap className="w-5 h-5" /></div>
                  <div><p className="font-black text-sm uppercase">Đến hạn chốt điện</p><p className="text-[9px] font-bold opacity-90">Kỳ chốt công tơ điện tháng này</p></div>
                </div>
                <button onClick={() => setActiveTab('meters_list')} className="px-4 py-2 bg-white text-orange-600 rounded-lg font-black text-[10px] active:scale-95">Ghi Số</button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-blue-600">{dashboardSummary?.totalRooms || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Phòng</p></div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-emerald-600">{dashboardSummary?.emptyRooms || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Trống</p></div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-indigo-600">{dashboardSummary?.totalPeople || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Người</p></div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center"><p className="text-[13px] font-black text-orange-600">{dashboardSummary?.totalEbikes || 0}</p><p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Xe điện</p></div>
            </div>

            {isOwnerOrAdmin && (
              <div className="bg-slate-900 p-5 rounded-xl text-white shadow-xl relative overflow-hidden border-b-1 border-emerald-500">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Tổng doanh thu dự kiến</p>
                    <h3 className="text-3xl font-black text-emerald-400 tabular-nums leading-none">+{formatN(dashboardSummary?.revenue || 0)}</h3>
                  </div>
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-700/80 pt-3 mt-4 relative z-10">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-400">Tổng chi phí</p>
                    <p className="text-sm font-black text-rose-400">-{formatN(dashboardSummary?.expense || 0)}</p>
                  </div>
                  <div className="text-right border-l border-slate-700/80 pl-4">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-400">Lợi nhuận ròng</p>
                    <p className="text-sm font-black text-blue-400">{formatN(dashboardSummary?.profit || 0)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-orange-400 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Zap className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Điện dự tính</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedElecCost || 0)}</p></div>
              <div className="bg-sky-500 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Droplets className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Nước dự tính</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedWaterCost || 0)}</p></div>
              <div className="bg-purple-400 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Activity className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Dịch vụ</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedServiceCost || 0)}</p></div>
              <div className="bg-emerald-500 p-4 rounded-xl text-white shadow-md relative overflow-hidden"><Wifi className="w-8 h-8 absolute -right-1 -top-1 opacity-20" /><p className="text-[8px] font-black uppercase mb-1 opacity-80">Internet</p><p className="text-sm font-black">{formatN(dashboardSummary?.expectedInternetCost || 0)}</p></div>
            </div>

            {isOwnerOrAdmin && (
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h4 className="font-black text-slate-400 uppercase text-[8px] mb-4 tracking-widest flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-2 text-blue-600" /> BIỂU ĐỒ DOANH THU</h4>
                <div className="h-28 flex items-end justify-between px-1 gap-2.5 relative">
                  <div className="absolute w-full h-[1px] bg-slate-50 bottom-[33%]"></div>
                  <div className="absolute w-full h-[1px] bg-slate-50 bottom-[66%]"></div>
                  <div className="absolute w-full h-[1px] bg-slate-50 top-0"></div>
                  {revenueChartData.map((d, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col items-center justify-end relative z-10 group cursor-pointer">
                      <div className="absolute -top-7 bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {formatN(d.value)} đ
                      </div>
                      <div className="w-full flex-1 flex items-end">
                        <div className={`w-full rounded-t-md transition-all duration-1000 ${d.isCurrent ? 'bg-gradient-to-t from-blue-600 to-sky-400 shadow-md' : 'bg-gradient-to-t from-slate-200 to-slate-100 group-hover:from-blue-300 group-hover:to-blue-200'}`} style={{ height: `${d.height}%`, minHeight: d.height > 0 ? '4px' : '0' }}></div>
                      </div>
                      <span className={`text-[6px] font-black mt-2 uppercase ${d.isCurrent ? 'text-blue-600' : 'text-slate-400'}`}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SỔ TIẾT KIỆM --- */}
        {activeTab === 'savings' && (
          <div className="animate-in fade-in pb-20">
            {/* Sticky Header with Totals */}
            <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md pt-2 pb-4 px-1">
              <div className="bg-slate-900 p-6 rounded-xl text-white shadow-xl relative border-b-8 border-slate-950">
                <div className="flex justify-between items-center">
                  <button onClick={() => setIsSavingsStatsOpen(!isSavingsStatsOpen)} className="flex items-center gap-1 active:scale-95 transition-all text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền gửi tiết kiệm</p>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${!isSavingsStatsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {uniqueBankNames.length > 0 && (
                    <button
                      onClick={() => {
                        if (collapsedSavingsBanks.length === uniqueBankNames.length) {
                          setCollapsedSavingsBanks([]);
                        } else {
                          setCollapsedSavingsBanks(uniqueBankNames);
                        }
                      }}
                      className="flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors bg-white/5 px-2 py-1 rounded shadow-sm active:scale-95"
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        {collapsedSavingsBanks.length === uniqueBankNames.length ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsedSavingsBanks.length !== uniqueBankNames.length ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {isSavingsStatsOpen && (
                  <div className="animate-in slide-in-from-top-2 duration-200 mt-3">
                    <h3 className="text-4xl font-black tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">
                      {formatN(summarySavings.reduce((a, b) => a + (b.amount || 0), 0))}
                    </h3>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 relative overflow-hidden">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Lãi / tháng</p>
                        <p className="text-base font-black text-amber-400 tabular-nums">+{formatN(summarySavings.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) / 12), 0))}</p>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 relative overflow-hidden">
                        <PiggyBank className="w-10 h-10 absolute -right-2 -bottom-2 opacity-10 text-white" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng lãi dự kiến</p>
                        <p className="text-base font-black text-amber-400 tabular-nums">+{formatN(summarySavings.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) * ((b.termMonths || 0) / 12)), 0))}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* List */}
            <div className="px-1 mt-4 pb-4">
              {currentSavings.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center mt-10">Chưa có sổ tiết kiệm nào.</p>
              )}
              {Object.entries(
                currentSavings.reduce((acc, s) => {
                  const bank = s.bankName || 'Khác';
                  if (!acc[bank]) acc[bank] = [];
                  acc[bank].push(s);
                  return acc;
                }, {})
              ).map(([bank, items]) => {
                const groupAmount = items.reduce((a, b) => a + (b.amount || 0), 0);
                const groupInterest = items.reduce((a, b) => a + Math.round((b.amount || 0) * ((b.interestRate || 0) / 100) * ((b.termMonths || 0) / 12)), 0);
                const isSelected = !unselectedSavingsBanks.includes(bank);
                const isCollapsed = collapsedSavingsBanks.includes(bank);

                return (
                  <div key={bank} className="mb-6 last:mb-0 animate-in fade-in">
                    <div className="flex flex-col mb-3 bg-gradient-to-r from-slate-100 to-white p-3 rounded-xl border border-slate-200 shadow-sm gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center shrink-0 ml-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setUnselectedSavingsBanks(unselectedSavingsBanks.filter(b => b !== bank));
                              else setUnselectedSavingsBanks([...unselectedSavingsBanks, bank]);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shadow-inner shrink-0">
                          <Landmark className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 flex justify-between items-center gap-1 min-w-0">
                          <h4 className="text-[13px] font-black text-blue-900 uppercase tracking-wider leading-tight truncate pr-2">{bank}</h4>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded shadow-sm">{items.length} SỔ</span>
                            <button
                              onClick={() => {
                                if (isCollapsed) {
                                  setCollapsedSavingsBanks(collapsedSavingsBanks.filter(b => b !== bank));
                                } else {
                                  setCollapsedSavingsBanks([...collapsedSavingsBanks, bank]);
                                }
                              }}
                              className="p-1 -mr-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors shadow-none"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between px-1">
                        <div className="flex-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng gốc</p>
                          <p className="text-[13px] font-black text-indigo-700 tabular-nums">{formatN(groupAmount)}<span className="text-[9px] text-indigo-400 ml-0.5">đ</span></p>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-200 mx-4"></div>
                        <div className="flex-1 text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng lãi</p>
                          <p className="text-[13px] font-black text-emerald-600 tabular-nums">+{formatN(groupInterest)}<span className="text-[9px] text-emerald-600/50 ml-0.5">đ</span></p>
                        </div>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <div className={`space-y-3 transition-all ${!isSelected ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                        {items.map(s => {
                          const endDate = new Date(s.startDate);
                          const tMonths = s.termMonths || 0;
                          endDate.setMonth(endDate.getMonth() + Math.floor(tMonths)); // Cộng phần nguyên (tháng)
                          endDate.setDate(endDate.getDate() + Math.round((tMonths - Math.floor(tMonths)) * 30)); // Cộng phần dư (ngày)
                          const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                          const isMatured = daysLeft <= 0;
                          const interest = Math.round((s.amount || 0) * ((s.interestRate || 0) / 100) * ((s.termMonths || 0) / 12));
                          const startDate = new Date(s.startDate);
                          const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                          const passedDays = Math.max(0, totalDays - daysLeft);
                          const progress = totalDays > 0 ? Math.min(100, (passedDays / totalDays) * 100) : 100;

                          return (
                            <div key={s.id} onClick={() => { setEditingSaving(s); setSavingCalc({ amount: s.amount || 0, rate: s.interestRate || 0, months: s.termMonths || 0 }); setIsAddSavingModalOpen(true); }} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden ml-2 border-l-4 border-l-amber-500">
                              {isMatured && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase z-10 shadow-sm">Đã đến hạn</div>}
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center space-x-3 w-[60%]">
                                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-inner shrink-0"><PiggyBank className="w-5 h-5" /></div>
                                  <div className="overflow-hidden w-full">
                                    <h4 className="font-black text-[13px] text-blue-900 uppercase leading-tight mb-0.5">{s.note || `Sổ tiết kiệm`}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Gửi: {startDate.toLocaleDateString('vi-VN')}</p>
                                  </div>
                                </div>
                                <div className="text-right w-[40%] pl-2 shrink-0">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số tiền gốc</p>
                                  <p className="text-[15px] font-black text-indigo-700 tabular-nums">{formatN(s.amount)}<span className="text-[10px] text-indigo-400 ml-0.5">đ</span></p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lãi suất</p>
                                    <p className="text-[11px] font-black text-purple-600">{s.interestRate}%<span className="text-[9px] text-purple-400 font-bold">/năm</span></p>
                                  </div>
                                  <div className="w-[1px] h-6 bg-slate-200"></div>
                                  <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kỳ hạn</p>
                                    <p className="text-[11px] font-black text-emerald-600">{s.termMonths} <span className="text-[9px] text-emerald-500 font-bold">tháng</span></p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lãi dự kiến</p>
                                  <p className="text-[13px] font-black text-emerald-600 tabular-nums">+{formatN(interest)} đ</p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between px-1 gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden relative">
                                  <div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isMatured ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isMatured ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {isMatured ? 'Đáo hạn' : `Còn ${daysLeft} ngày`}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* --- PHÒNG TRỌ --- */}
        {activeTab === 'rooms' && (
          <div className="space-y-4 pb-20 animate-in slide-in-from-right">
            <div className="grid grid-cols-2 gap-2">
              {currentRooms.length === 0 && <p className="text-xs text-slate-400 italic mt-5 col-span-2 text-center">Chưa có phòng nào. Bấm Thêm phòng mới bên dưới.</p>}
              {currentRooms.map(r => {
                const payDays = getDueInfo(r.paymentDate).daysLeft;
                const endDays = diffDays(endContract(r.contractStart, r.months));
                const payColor = payDays <= 3 ? 'bg-red-100 text-red-700 border-red-200' : payDays <= 7 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-slate-600 border-slate-200';
                const endColor = endDays <= 30 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-slate-600 border-slate-200';

                return (
                  <div key={r.id} className={`bg-white p-2.5 rounded-xl border-2 shadow-sm relative transition-all flex flex-col ${r.status === 'full' ? 'border-blue-100' : 'opacity-70 border-dashed border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[10px] shadow-sm ${r.status === 'full' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                        {r.roomType === 'mbkd' ? 'MBKD ' : 'P.'}{r.roomCode || r.id} {r.status === 'empty' ? '- TRỐNG' : ''}
                      </span>
                      <button onClick={() => { setEditingRoom(r); setIsAddRoomModalOpen(true); }} className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-300 hover:text-white active:scale-95 transition-all"><LucideEdit className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[13px] font-black text-rose-800 leading-none mb-2">{formatN(r.price)}</p>

                    {r.status === 'full' && (
                      <div className="space-y-1 border-t border-slate-50 pt-1.5 flex-1">
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase"><span className="text-rose-600 flex items-center"><CreditCard className="w-3 h-3 mr-1" /> Đóng tiền:</span><span className={`px-1.5 py-0.5 rounded border text-center ${payColor}`}>Còn {payDays > 0 ? payDays : 0} ngày</span></div>
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase"><span className="text-orange-600 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Hợp đồng:</span><span className={`px-1.5 py-0.5 rounded border bg-green-300 text-green-900 text-center ${endColor}`}>Còn {endDays > 0 ? endDays : 0} ngày</span></div>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-50 pt-2">
                      <div className="flex items-center text-blue-600 font-bold text-[9px] bg-blue-50 px-1.5 py-0.5 rounded-md"><Users2 className="w-3 h-3 mr-1" />{r.peopleCount ?? r.people ?? 0} người</div>
                      {r.eBikeCount > 0 && <div className="flex items-center text-orange-600 font-bold text-[9px] bg-orange-50 px-1.5 py-0.5 rounded-md"><Bike className="w-3 h-3 mr-1" />{r.eBikeCount ?? r.ebikes ?? 0} xe điện</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* NÚT THÊM PHÒNG CHO NGƯỜI DÙNG */}
            {isManagerOrAbove && (
              <button onClick={() => { setEditingRoom(null); setIsAddRoomModalOpen(true); }} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                <PlusCircle className="w-4 h-4 text-white" /> Thêm Phòng Mới
              </button>
            )}
          </div>
        )}

        {/* --- HÓA ĐƠN --- */}
        {/* MODAL XÁC NHẬN GHI ĐÈ HÓA ĐƠN */}
        {isOverwriteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay mờ phía sau */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"></div>

            {/* Nội dung Modal */}
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 text-center">
                {/* Icon Cảnh báo */}
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10 text-orange-500 animate-bounce" />
                </div>

                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">
                  Phát hiện trùng lặp!
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">
                  Hóa đơn <span className="font-bold text-blue-600">Tháng {new Date().getMonth() + 1}</span> đã tồn tại trên hệ thống. Bạn có muốn xóa bản cũ và tạo lại không?
                </p>
              </div>

              {/* Nút bấm điều hướng */}
              <div className="flex p-4 gap-3 bg-slate-50">
                <button
                  onClick={() => setIsOverwriteModalOpen(false)}
                  className="flex-1 py-4 bg-white text-slate-400 font-black uppercase text-[10px] rounded-2xl border border-slate-200 active:scale-95 transition-all"
                >
                  Để sau
                </button>
                <button
                  onClick={executeGenerateBills}
                  className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[10px] rounded-2xl active:scale-95 transition-all border-b-1 border-blue-800"
                >
                  Đồng ý tạo lại
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="space-y-4 pb-20 animate-in fade-in">

            {/* STICKY HEADER: CHỌN THÁNG & THỐNG KÊ */}
            <div className="sticky top-0 z-30 bg-indigo-600 rounded-xl p-4 space-y-4 shadow-lg">
              {/* Bộ chọn tháng */}
              <div className="bg-white p-1 rounded-xl flex items-center">
                <button onClick={handlePrevMonth} className="p-3 text-indigo-600"><ChevronLeft /></button>
                <div className="flex-1 text-center font-black uppercase text-xs">Hóa đơn {monthDisplay}</div>
                <button onClick={handleNextMonth} className="p-3 text-indigo-600"><ChevronRight /></button>
              </div>

              {/* Box thông số */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-xl text-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase">Đã lập</p>
                  <p className="text-sm font-black text-emerald-600">{currentBills.length}/{rooms.filter(r => r.status === 'full').length}</p>
                </div>
                <div className="bg-white p-3 rounded-xl text-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase">Chưa thu</p>
                  <p className="text-sm font-black text-rose-600">{currentBills.filter(b => b.status !== 'paid').length}</p>
                </div>
                <div className="bg-white p-3 rounded-xl text-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase">Tổng tiền</p>
                  <p className="text-sm font-black text-indigo-600">{formatN(currentBills.reduce((s, b) => s + b.total, 0))}</p>
                </div>
              </div>
            </div>

            {/* DANH SÁCH HÓA ĐƠN */}
            <div className="space-y-2">
              {currentBills.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic text-xs">
                  Chưa có hóa đơn nào trong tháng này.
                </div>
              ) : (
                currentBills.map(bill => (
                  <div
                    key={bill.id}
                    onClick={() => setBottomSheet({ type: 'bill', data: bill })}
                    className={`bg-white p-3.5 rounded-xl border-2 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer ${bill.status === 'paid' ? 'border-emerald-100/60' : 'border-rose-100'
                      }`}
                  >
                    {/* Box bên trái: Icon + Thông tin phòng */}
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                        }`}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[12px] font-black uppercase text-slate-800 leading-none mb-1.5">
                          Phòng {bill.roomId}
                        </p>
                        <div className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider inline-flex items-center ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                          {bill.status === 'paid' ? 'Đã thu tiền' : 'Chưa thu'}
                        </div>
                      </div>
                    </div>

                    {/* Box bên phải: Tổng tiền */}
                    <div className="text-right">
                      <p className={`font-black text-[15px] tracking-tight tabular-nums ${bill.status === 'paid' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                        {formatN(bill.total)}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Tổng cộng
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- CHỐT SỐ --- */}
        {activeTab === 'meters_list' && (
          <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* --- PHẦN CỐ ĐỊNH: CHỌN THÁNG & TỔNG HỢP --- */}
            <div className="sticky top-0 z-30 bg-blue-600 rounded-xl border border-blue-600 backdrop-blur-md p-4 space-y-4">
              {/* BỘ CHỌN THÁNG */}
              <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm flex items-center">
                <button type="button" onClick={handlePrevMonth} className="p-3 hover:bg-slate-50 rounded-xl text-blue-600 active:scale-90 transition-all">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center">
                  <p className="text-[8px] font-black uppercase text-blue-600">Kỳ chốt số điện</p>
                  <div className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-1.5 rounded-full w-fit mx-auto">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-black text-white uppercase">{monthDisplay}</span>
                  </div>
                </div>
                <button type="button" onClick={handleNextMonth} className="p-3 hover:bg-slate-50 rounded-xl text-blue-600 active:scale-90 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* BẢNG TỔNG HỢP */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-xl text-center">
                  <p className="text-[7px] font-black text-rose-400 uppercase mb-1">Tổng điện</p>
                  <div className="flex items-baseline gap-1 text-rose-600 justify-center">
                    <span className="text-sm font-black">{formatN(summary.kwh)}</span>
                    <span className="text-[7px] font-bold">kWh</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[7px] font-black text-orange-400 uppercase mb-1">Nóng lạnh</p>
                  <div className="flex items-baseline gap-1 text-orange-600 justify-center">
                    <span className="text-sm font-black">{formatN(summary.heater)}</span>
                    <span className="text-[7px] font-bold">kWh</span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[7px] font-black text-emerald-500 uppercase mb-1">Tổng tiền</p>
                  <div className="flex items-baseline gap-0.5 text-emerald-600 justify-center">
                    <span className="text-sm font-black">{formatN(summary.money)}</span>
                    <span className="text-[7px] font-bold">đ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DANH SÁCH CÔNG TƠ */}
            <div className="space-y-3 px-0.5">
              {(!currentMeters || currentMeters.length === 0) && (
                <div className="py-20 text-center">
                  <ZapOff className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 italic">Chưa có dữ liệu kỳ này.</p>
                </div>
              )}
              {currentMeters?.map(m => {
                // --- LOGIC KIỂM TRA TÍNH HỢP LỆ ---
                // Kiểm tra xem các ô có thực sự trống (null/rỗng) hay không
                const isOldEmpty = m.oldVal === null || m.oldVal === "";
                const isNewEmpty = m.newVal === null || m.newVal === "";

                let consumption = 0;
                let totalPrice = 0;

                // CHỈ TÍNH KHI CẢ 2 Ô ĐỀU KHÔNG TRỐNG
                if (!isOldEmpty && !isNewEmpty) {
                  const vOld = parseN(m.oldVal);
                  const vNew = parseN(m.newVal);
                  // Nếu số mới >= số cũ thì tính, không thì mặc định 0
                  consumption = vNew >= vOld ? (vNew - vOld) : 0;
                  totalPrice = consumption * (config.priceElec || 0);
                }

                return (
                  <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === 'heater' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-600'}`}>
                          {m.type === 'heater' ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase text-rose-800 leading-none">{m.name}</p>
                          <p className="text-[8px] font-bold text-blue-400 mt-1">
                            {/* Kết quả sẽ là 0 nếu số cũ đang trống trơn */}
                            Tổng: {formatN(consumption)} số - Tiền: {formatN(totalPrice)} đ
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingMeter(m); setIsAddMeterModalOpen(true); }} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-all">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setMappingMeter(m)} className="p-2 bg-slate-50 text-slate-400 rounded-xl active:bg-orange-50 active:text-orange-500 transition-all">
                          <Boxes className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block px-1">Số cũ</label>
                        {/* Ô này nếu để trống thì dòng trên sẽ hiện 0 số */}
                        <input type="number" value={m.oldVal || ''} onChange={(e) => handleUpdateOldMeterUI(m.id, e.target.value)} className="w-full bg-slate-50 border-2 border-transparent p-3 rounded-xl font-black text-slate-500 text-center text-sm outline-none focus:border-purple-200 transition-all shadow-inner" />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-rose-600 uppercase mb-1 block px-1">Số mới</label>
                        <input type="number" value={m.newVal || ''} onChange={(e) => handleUpdateMeterUI(m.id, e.target.value)} className="w-full bg-blue-50/50 border-2 border-transparent p-3 rounded-xl font-black text-red-600 text-center text-sm outline-none focus:border-red-200 transition-all shadow-inner" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NÚT LƯU CỐ ĐỊNH Ở DƯỚI */}
            {currentMeters?.length > 0 && (
              <div className="fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
                <button
                  onClick={handleSaveMetersAndGenerateBills}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] border-b-1 border-blue-800 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4" /> Xác nhận lưu & Lập hóa đơn {monthDisplay}
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- THU CHI --- */}
        {activeTab === 'finance' && isManagerOrAbove && (
          <div className="animate-in fade-in pb-20">
            {/* BOX TỔNG HỢP - STICKY */}
            <div className="sticky top-0 z-30 bg-slate-50 pt-4 pb-4 -mt-4 -mx-4 px-5">
              <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-2xl relative border-b-1 border-blue-600 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                {/* Header Row: Label + Custom Dropdown */}
                <div className="flex justify-between items-center relative z-10">
                  <button onClick={() => setIsFinanceStatsOpen(!isFinanceStatsOpen)} className="flex items-center gap-2 active:scale-95 transition-all text-left">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <Wallet className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest flex items-center gap-1">
                      Báo cáo tài chính
                      <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform duration-300 ${!isFinanceStatsOpen ? 'rotate-180' : ''}`} />
                    </p>
                  </button>

                  {/* CUSTOM DROPDOWN UI */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMonthOpen(!isMonthOpen)}
                      className="flex items-center gap-2 bg-white/10 border border-white/10 py-1.5 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-white/20 transition-all active:scale-95"
                    >
                      {monthLabels[selectedMonth]}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Menu đổ xuống */}
                    {isMonthOpen && (
                      <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                        <div className="p-1">
                          {Object.keys(monthLabels).map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setSelectedMonth(key); // Cập nhật state -> Kích hoạt useEffect gọi API
                                setIsMonthOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl mb-0.5 last:mb-0 ${selectedMonth === key
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                              <span>{monthLabels[key]}</span>
                              {selectedMonth === key && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isFinanceStatsOpen && (
                  <div className="animate-in slide-in-from-top-2 duration-200 mt-5">
                    <div className="text-center mb-5 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lợi nhuận ròng</p>
                      <h3 className="text-4xl font-black tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-400">
                        {formatN(financeStats.rev - financeStats.exp)}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative z-10">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tổng Doanh Thu</p>
                        <p className="text-lg font-black text-emerald-400">+{formatN(financeStats.rev)}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tổng Chi Phí</p>
                        <p className="text-lg font-black text-rose-400 mb-2">-{formatN(financeStats.exp)}</p>
                        <div className="space-y-1 border-t border-white/10 pt-2">
                          <div className="flex justify-between items-center text-[8px] font-bold">
                            <span className="text-slate-400">Phí cố định</span>
                            <span className="text-slate-300">{formatN(financeStats.fixedCosts)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[8px] font-bold">
                            <span className="text-slate-400">Phát sinh</span>
                            <span className="text-slate-300">{formatN(financeStats.txExp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DANH SÁCH GIAO DỊCH - SCROLLABLE */}
            <div className="space-y-2 px-1">
              {currentTransactions.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center mt-10">Chưa có giao dịch thu chi nào.</p>
              )}
              {currentTransactions.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <ArrowRight className={`w-5 h-5 ${t.type === 'in' ? 'rotate-[-45deg]' : 'rotate-[135deg]'}`} />
                    </div>
                    <div>
                      <p className={`text-[11px] font-black uppercase leading-none mb-1.5 ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.note}
                      </p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">
                        {new Date(t.date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-black text-sm text-right tabular-nums ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'in' ? '+' : '-'}{formatN(t.amount)}
                    </p>
                    <button onClick={() => {
                      setEditingTransaction(t);
                      setTxType(t.type);
                      const catKey = Object.keys(TRANSACTION_CATEGORIES).find(k => TRANSACTION_CATEGORIES[k].id === t.category) || 'OTHER';
                      setSelectedCat(catKey);
                      setIsAddTransactionModalOpen(true);
                    }} className="p-1.5 bg-slate-50 text-slate-400 rounded-md hover:text-blue-600 transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAddTransactionModalOpen && (
          <Modal title="Ghi sổ thu chi" onClose={() => setIsAddTransactionModalOpen(false)}>
            <form onSubmit={handleAddTx} className="space-y-5 text-left p-1">

              {/* 1. CHỌN LOẠI THU/CHI */}
              <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTxType('in')}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${txType === 'in' ? 'bg-white text-emerald-600' : 'text-slate-400'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${txType === 'in' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  Thu vào (+)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('out')}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${txType === 'out' ? 'bg-white text-rose-600' : 'text-slate-400'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${txType === 'out' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
                  Chi ra (-)
                </button>
              </div>

              {/* 2. NHẬP SỐ TIỀN */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Số tiền (VND)</label>
                <div className="relative">
                  <input
                    type="text" name="amount" required placeholder="0"
                    defaultValue={editingTransaction ? formatN(editingTransaction.amount) : ''}
                    className={`w-full p-4 bg-slate-50 rounded-xl font-black text-2xl outline-none border-2 transition-all shadow-inner tabular-nums ... (giữ nguyên style cũ)`}
                    onInput={(e) => { e.target.value = formatN(parseN(e.target.value)); }}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">đ</span>
                </div>
              </div>

              {/* 3. CHỌN DANH MỤC (COMBOBOX) */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Danh mục</label>

                {/* Nút bấm hiển thị mục đang chọn */}
                <button
                  type="button"
                  onClick={() => setIsCatOpen(!isCatOpen)}
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-sm text-left flex justify-between items-center border-2 border-transparent hover:border-slate-200 transition-all shadow-inner active:scale-[0.99]"
                >
                  {/* TRUY XUẤT LABEL: Nếu selectedCat chưa có giá trị, mặc định hiện 'RENT' */}
                  <span className="text-slate-700">
                    {TRANSACTION_CATEGORIES[selectedCat]?.label || TRANSACTION_CATEGORIES['RENT'].label}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isCatOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* PHẦN ĐỔ XUỐNG (MENU) */}
                {isCatOpen && (
                  <>
                    {/* Lớp phủ kín màn hình để click ra ngoài là đóng */}
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsCatOpen(false)}></div>

                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                      <div className="max-h-60 overflow-y-auto p-1">
                        {/* LẶP QUA CÁC KEY: RENT, ELEC, WATER... */}
                        {Object.keys(TRANSACTION_CATEGORIES).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setSelectedCat(key); // Lưu KEY (ví dụ: 'RENT') vào state
                              setIsCatOpen(false); // Đóng menu
                            }}
                            className={`w-full px-4 py-3.5 text-left text-sm font-bold flex justify-between items-center transition-colors rounded-xl mb-0.5 last:mb-0 ${selectedCat === key
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'
                              }`}
                          >
                            {/* HIỂN THỊ TIẾNG VIỆT TẠI ĐÂY */}
                            <span>{TRANSACTION_CATEGORIES[key].label}</span>
                            {selectedCat === key && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 4. NỘI DUNG CHI TIẾT */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Nội dung chi tiết</label>
                <textarea
                  name="note" rows="2" placeholder="Ghi chú thêm..."
                  defaultValue={editingTransaction?.note || ''}
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-600/20 shadow-inner resize-none"
                />
              </div>

              {/* 5. NÚT XÁC NHẬN */}
              <div className="flex gap-2 pt-3">
                {editingTransaction && (
                  <button type="button" onClick={() => handleDeleteTransaction(editingTransaction.id)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[11px] active:scale-95 border-b-1 border-red-200">
                    Xóa
                  </button>
                )}
                <button type="submit" className={`flex-[2] text-white py-4 rounded-xl font-black uppercase text-[11px] transition-all active:scale-95 border-b-1 ${txType === 'in' ? 'bg-emerald-600 border-emerald-800' : 'bg-rose-600 border-rose-800'}`}>
                  {editingTransaction ? 'Lưu thay đổi' : 'Xác nhận'}
                </button>
              </div>

              {/* DỮ LIỆU GỬI XUỐNG C# (ID SỐ) */}
              <input type="hidden" name="type" value={txType} />
              <input type="hidden" name="category" value={TRANSACTION_CATEGORIES[selectedCat]?.id ?? 0} />
            </form>
          </Modal>
        )}

        {/* --- CHAT AI --- */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 no-scrollbar pb-10">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-200' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm whitespace-pre-wrap'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiLoading && <div className="flex justify-start"><div className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl rounded-bl-none"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div></div>}
            </div>
            <form onSubmit={handleAiChat} className="p-3 bg-white border-t border-slate-100 flex space-x-2">
              <input name="q" placeholder="Hỏi AI Lucky Home..." disabled={isAiLoading} className="flex-1 bg-slate-100 border-none rounded-lg px-3 text-xs font-bold outline-none focus:bg-blue-50 transition-colors" />
              <button type="submit" disabled={isAiLoading} className="p-2.5 bg-blue-600 text-white rounded-lg active:scale-90 flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        )}

        {/* --- CÀI ĐẶT --- */}
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
              {/* HEADER CÓ THÊM NÚT TẢI ẢNH */}
              <div className="bg-blue-600 px-5 py-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSettingsExpanded(prev => ({ ...prev, qr: !prev.qr }))}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Thông tin VietQR</h4>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${settingsExpanded.qr ? 'rotate-180' : ''}`} />
                </button>

                {/* Input file ẩn đi */}
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

        {/* LỖI PHÂN QUYỀN */}
        {(activeTab === 'finance' || activeTab === 'settings') && !isManagerOrAbove && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ShieldCheck className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-800 uppercase">Không có quyền truy cập</h3>
            <p className="text-xs text-slate-500 mt-2">Chức năng này chỉ dành cho Chủ Sở Hữu.</p>
            <button onClick={() => setActiveTab('dashboard')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase">Về trang chủ</button>
          </div>
        )}
      </main>

      {/* FOOTER TAB BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] pointer-events-none">
        <div className="bg-white border-t border-slate-100 h-14 flex items-center justify-around px-2 pointer-events-auto shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Trang chủ' },
            shouldShowMeterBanner
              ? { id: 'meters_list', icon: Boxes, label: 'Chốt số' }
              : { id: 'rooms', icon: Home, label: 'Phòng' },
            { id: 'spacer', icon: null, label: '' },
            { id: 'bills', icon: FileText, label: 'Hóa đơn' },
            { id: 'finance', icon: Wallet, label: 'Thu Chi', hidden: !isManagerOrAbove },
            { id: 'ai', icon: Sparkles, label: 'AI Chat', hidden: isManagerOrAbove }
          ].filter(i => !i.hidden).map((item, i) => (
            item.id === 'spacer' ? <div key={i} className="w-12" /> : (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(""); }} className={`flex flex-col items-center justify-center px-1 transition-all ${activeTab === item.id ? 'text-blue-600 scale-105' : 'text-slate-400 opacity-60'}`}>
                <div className={`p-1.5 rounded-lg ${activeTab === item.id ? 'bg-blue-50 shadow-inner' : ''} flex items-center justify-center`}><item.icon className="w-4.5 h-4.5" strokeWidth={activeTab === item.id ? 3 : 2} /></div>
                <span className={`text-[6px] font-black uppercase mt-1 transition-all ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
              </button>
            )
          ))}
        </div>
        <button onClick={() => setShowQuickMenu(!showQuickMenu)} className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-[1.4rem] flex items-center justify-center transition-all duration-500 active:scale-90 pointer-events-auto border-[4px] border-white ${showQuickMenu ? 'bg-slate-800 rotate-45' : 'bg-blue-600'}`}><Plus className="w-7 h-7 text-white stroke-[4px]" /></button>
      </div>

      {/* QUICK MENU */}
      <div className={`fixed inset-0 z-[500] transition-opacity duration-300 ${showQuickMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowQuickMenu(false)} />
        <div className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[2.5rem] p-8 pb-36 transition-transform duration-500 transform ${showQuickMenu ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Thêm Phòng', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50', action: () => { setEditingRoom(null); setIsAddRoomModalOpen(true); setShowQuickMenu(false); } },
              shouldShowMeterBanner
                ? { label: 'Phòng', icon: Home, color: 'text-blue-600 bg-blue-50', action: () => { setActiveTab('rooms'); setShowQuickMenu(false); } }
                : { label: 'Chốt số điện', icon: Boxes, color: 'text-orange-600 bg-orange-50', action: () => { setActiveTab('meters_list'); setShowQuickMenu(false); } },
              { label: 'Hóa Đơn', icon: Receipt, color: 'text-purple-600 bg-purple-50', action: () => { setActiveTab('bills'); setShowQuickMenu(false); } },
              { label: 'AI Chat', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50', action: () => { setActiveTab('ai'); setShowQuickMenu(false); } },
              { label: 'Thu chi', icon: CircleDollarSign, color: 'text-rose-600 bg-rose-50', action: () => { setIsAddTransactionModalOpen(true); setShowQuickMenu(false); }, hidden: user?.role !== 'Owner' },
              { label: 'Sổ tiết kiệm', icon: PiggyBank, color: 'text-amber-600 bg-amber-50', action: () => { setActiveTab('savings'); setShowQuickMenu(false); } },
              { label: 'Cài Đặt', icon: Settings, color: 'text-slate-600 bg-slate-50', action: () => { setActiveTab('settings'); setShowQuickMenu(false); }, hidden: user?.role !== 'Owner' },
              { label: 'Đăng Xuất', icon: LogOut, color: 'text-red-600 bg-red-50', action: () => handleLogout() }
            ].filter(i => !i.hidden).map((item, i) => (
              <button key={i} onClick={() => item.action()} className="flex flex-col items-center space-y-2 active:scale-90 transition-all">
                <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center`}><item.icon className="w-6 h-6" strokeWidth={1.5} /></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BIÊN LAI CHI TIẾT VÀ ẢNH HÓA ĐƠN ẨN */}
      {bottomSheet && bottomSheet.type === 'bill' && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBottomSheet(null)} />
          <div className="bg-white w-full max-w-md rounded-t-xl p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500 relative max-h-[96vh] flex flex-col no-scrollbar overflow-y-auto">
            <div className="w-14 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 shrink-0" />
            <div className="flex justify-between items-center mb-6 shrink-0"><h3 className="text-base font-black uppercase text-slate-900 flex items-center tracking-widest"><Receipt className="w-6 h-6 mr-3 text-blue-600" /> Hóa đơn thu tiền</h3><button onClick={() => setBottomSheet(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button></div>

            <div className="space-y-6 overflow-y-auto no-scrollbar pb-10">
              <div className="bg-indigo-600 p-8 rounded-xl text-center text-white shadow-xl relative overflow-hidden">
                <p className="text-[10px] font-black text-indigo-100 uppercase mb-2 tracking-[0.4em] opacity-80">Tổng tiền thu</p>
                <p className="text-5xl font-black tracking-tighter leading-none">{formatN(bottomSheet.data.total)}</p>
                <p className="text-[10px] mt-4 opacity-90 font-black bg-white/10 px-6 py-2 rounded-full w-fit mx-auto uppercase tracking-widest border border-white/20">PHÒNG {bottomSheet.data.roomId} • {bottomSheet.data.currentMonthFull}</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl space-y-4 border-2 border-slate-100 shadow-inner">
                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Tiền phòng</span><span className="text-slate-900">{formatN(bottomSheet.data.details.rent)}</span></div>
                <div className="flex justify-between items-center text-[12px] font-black">
                  <div className="flex flex-col"><span className="text-slate-400 uppercase tracking-tighter">Tiền điện riêng</span><span className="text-[9px] text-blue-600 font-bold italic">Số: {bottomSheet.data.meter?.old} → {bottomSheet.data.meter?.new} ({bottomSheet.data.meter?.new - bottomSheet.data.meter?.old} số)</span></div>
                  <span className="text-slate-900">{formatN(bottomSheet.data.details.elec)}</span>
                </div>
                {bottomSheet.data.heaterMeter && (
                  <div className="flex justify-between items-center text-[12px] font-black">
                    <div className="flex flex-col">
                      <span className="text-slate-400 uppercase tracking-tighter">Điện BNL Chung</span><span className="text-[9px] text-orange-600 font-bold italic">Số: {bottomSheet.data.heaterMeter.old} → {bottomSheet.data.heaterMeter.new} ({bottomSheet.data.heaterMeter.new - bottomSheet.data.heaterMeter.old} số)</span>
                    </div>
                    <span className="text-slate-900">{formatN(bottomSheet.data.details.heater)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Tiền nước</span><span className="text-slate-900">{formatN(bottomSheet.data.details.water)}</span></div>
                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Phí dịch vụ</span><span className="text-slate-900">{formatN(bottomSheet.data.details.service || 0)}</span></div>
                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Internet</span><span className="text-slate-900">{formatN(bottomSheet.data.details.internet)}</span></div>
                <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Phí xe điện</span><span className="text-slate-900">{formatN(bottomSheet.data.details.ebikes)}</span></div>
                {bottomSheet.data.details.monthlyFee > 0 && (
                  <div className="flex justify-between items-center text-[12px] font-black"><span className="text-slate-400 uppercase tracking-tighter">Phí DV Hàng tháng (MBKD)</span><span className="text-slate-900">{formatN(bottomSheet.data.details.monthlyFee)}</span></div>
                )}
                {/* DÒNG NHẬP GIẢM GIÁ (CHỈ CHỦ TRỌ MỚI SỬA ĐƯỢC KHI HÓA ĐƠN PENDING) */}
                <div className="flex justify-between items-center text-[12px] font-black">
                  <span className="text-slate-400 uppercase tracking-tighter">Giảm giá</span>
                  {bottomSheet.data.status === 'pending' && isManagerOrAbove ? (
                    <div className="flex items-center space-x-1 border-b border-dashed border-red-300">
                      <span className="text-red-500">-</span>
                      <input
                        type="text"
                        value={formatN(bottomSheet.data.details.discount || 0)}
                        onChange={(e) => handleDiscountChange(bottomSheet.data.id, e.target.value)}
                        onBlur={(e) => handleDiscountBlur(bottomSheet.data.id, parseN(e.target.value))}
                        className="w-20 text-right bg-transparent text-red-600 font-black outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-red-600">-{formatN(bottomSheet.data.details.discount || 0)}</span>
                  )}
                </div>

                <div className="border-t-2 border-dashed border-slate-200 pt-4 flex justify-between items-center text-xs font-black uppercase text-indigo-600 tracking-widest">
                  <span>Tổng cộng</span><span className="text-2xl">{formatN(bottomSheet.data.total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button disabled={isGeneratingImage} onClick={() => handleShareZaloImage(bottomSheet.data)} className="w-full bg-[#0068FF] text-white py-4 rounded-xl font-black text-[12px] uppercase active:scale-95 border-b-1 border-[#004BBF] flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                  {isGeneratingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  {isGeneratingImage ? 'ĐANG TẠO ẢNH...' : 'COPY ẢNH CHO ZALO'}
                </button>

                {bottomSheet.data.status === 'pending' && isManagerOrAbove && (
                  <button onClick={() => handlePayBill(bottomSheet.data.id)} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[12px] uppercase active:scale-95 border-b-1 border-emerald-800 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Xác Nhận Đã Thu Tiền
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TEMPLATE ẨN: RENDER ẢNH HÓA ĐƠN Y HỆT THIẾT KẾ ĐỂ XUẤT RA CLIPBOARD --- */}
      {bottomSheet && bottomSheet.type === 'bill' && (
        <div
          // 🔥 KEY CỰC KỲ QUAN TRỌNG: Ép React xóa sạch HTML cũ khi đổi phòng
          key={bottomSheet.data.id}

          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: -100,
            opacity: 0.01,
            pointerEvents: 'none',
          }}
        >
          <div
            id={`hidden-receipt-export-${bottomSheet.data.id}`}
            style={{
              // 🔥 HACK: Thêm một số thập phân siêu nhỏ ngẫu nhiên vào width
              // Để bẻ khóa (bust) lỗi cache SVG/Canvas cực kỳ cứng đầu của trình duyệt (đặc biệt Safari/iOS và Chrome)
              // Lỗi này khiến html-to-image trả về ảnh cũ nếu kích thước DOM hoàn toàn giống nhau!
              width: 420 + Math.random() * 0.01,
              background: '#ffffff',
              fontFamily: 'Arial, Helvetica, sans-serif',
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            {/* 🔥 CARD CHÍNH */}
            <div
              style={{
                background: '#ffffff',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Header - Nằm cùng 1 hàng để giảm chiều dài */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-5 text-center">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <h1 className="text-2xl font-black uppercase">
                    Lucky Home
                  </h1>
                </div>
                <p className="text-[10px] font-bold uppercase opacity-80">
                  Hóa đơn thanh toán
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* 1. Thông tin phòng & Kỳ thanh toán */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase mb-0.5">Phòng</p>
                    <p className="text-xl font-black text-blue-600 leading-none">{bottomSheet.data.roomId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-blue-500 uppercase mb-0.5">Kỳ thanh toán</p>
                    <p className="text-base font-black text-blue-600 leading-none">{bottomSheet.data.currentMonthFull}</p>
                  </div>
                </div>

                {/* 2. Chi tiết các khoản phí - Đã căn giữa (items-center) */}
                <div className="border border-slate-200 rounded-xl px-4 py-1 bg-white">

                  {/* Tiền phòng */}
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-slate-200">
                    <span className="text-[12px] font-bold text-slate-500 uppercase">Tiền phòng</span>
                    <span className="text-sm font-black text-slate-800">{formatN(bottomSheet.data.details.rent)}</span>
                  </div>

                  {/* Tiền điện riêng */}
                  <div className="flex justify-between items-center py-3 border-b border-dashed border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-slate-500 uppercase leading-tight">Tiền điện riêng</span>
                      <p className="text-[10px] text-blue-600 font-semibold leading-tight mt-0.5">
                        Số: {bottomSheet.data.meter?.old} → {bottomSheet.data.meter?.new} ({bottomSheet.data.meter?.new - bottomSheet.data.meter?.old} số)
                      </p>
                    </div>
                    <span className="text-sm font-black text-slate-800">{formatN(bottomSheet.data.details.elec)}</span>
                  </div>

                  {/* Điện BNL Chung */}
                  {bottomSheet.data.heaterMeter && (
                    <div className="flex justify-between items-center py-3 border-b border-dashed border-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-500 uppercase leading-tight">Điện BNL Chung</span>
                        <p className="text-[10px] text-rose-600 font-semibold leading-tight mt-0.5">
                          Số: {bottomSheet.data.heaterMeter.old} → {bottomSheet.data.heaterMeter.new} ({bottomSheet.data.heaterMeter.new - bottomSheet.data.heaterMeter.old} số)
                        </p>
                      </div>
                      <span className="text-sm font-black text-slate-800">{formatN(bottomSheet.data.details.heater)}</span>
                    </div>
                  )}

                  {/* Các mục khác */}
                  {[
                    { label: "Tiền nước", val: bottomSheet.data.details.water },
                    { label: "Phí dịch vụ", val: bottomSheet.data.details.service || 0 },
                    { label: "Internet", val: bottomSheet.data.details.internet || 0 },
                    { label: "Xe điện", val: bottomSheet.data.details.ebikes || 0 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 border-b border-dashed border-slate-200 last:border-0">
                      <span className="text-[12px] font-bold text-slate-500 uppercase">{item.label}</span>
                      <span className="text-sm font-black text-slate-800">{formatN(item.val)}</span>
                    </div>
                  ))}
                  {bottomSheet.data.details.monthlyFee > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-dashed border-slate-200">
                      <span className="text-[12px] font-bold text-slate-500 uppercase">Phí DV Hàng tháng (MBKD)</span>
                      <span className="text-sm font-black text-slate-800">{formatN(bottomSheet.data.details.monthlyFee)}</span>
                    </div>
                  )}
                  {bottomSheet.data.details.discount > 0 && (
                    <div className="flex justify-between items-center py-3 border-t border-dashed border-slate-200">
                      <span className="text-[12px] font-bold text-red-600 uppercase">Giảm giá</span>
                      <span className="text-sm font-black text-red-600">-{formatN(bottomSheet.data.details.discount)}</span>
                    </div>
                  )}
                </div>

                {/* 3. Tổng cộng */}
                <div className="bg-indigo-600 px-6 py-4 rounded-xl text-white flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-widest">Tổng Cộng</span>
                  <span className="text-2xl font-black leading-none">{formatN(bottomSheet.data.total)}</span>
                </div>

                {/* 4. Thông tin chuyển khoản & QR */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Thông tin chuyển khoản</p>
                    <p className="text-xs font-black text-slate-700 uppercase">{config.bankName || "MB BANK"}</p>
                    <p className="text-lg font-black text-blue-600 tracking-tighter">{config.bankAcc || "0000"}</p>
                  </div>
                  <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                    <img
                      key={`qr-${bottomSheet.data.id}`}
                      src={`${API_URL}/vietqr/generate?bankBin=${config.bankBin || '970422'}&bankAcc=${config.bankAcc || '0'}&amount=${bottomSheet.data.total}&addInfo=${encodeURIComponent(`P${bottomSheet.data.roomId} ${bottomSheet.data.currentMonthFull}`)}&t=${Date.now()}`}
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              </div>

              <div className="pb-4 text-center">
                <p className="text-[12px] text-slate-400 font-medium italic">Cảm ơn quý khách đã tin tưởng Lucky Home!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS PHỤ TRỢ (Mở bằng nút + ở Quick Menu hoặc Search Bar) */}
      {isAddRoomModalOpen && (
        <Modal title={editingRoom ? "Cập nhật phòng" : "Thêm phòng mới"} onClose={() => setIsAddRoomModalOpen(false)}>
          <AddRoomForm onSave={handleAddRoom} onDelete={handleDeleteRoom} editingRoom={editingRoom} sharedHeaters={meters.filter(m => m.type === 'heater' && m.houseId === selectedHouse?.id)} formatN={formatN} parseN={parseN} />
        </Modal>
      )}

      {mappingMeter && (
        <Modal title={`Chọn phòng: ${mappingMeter.name}`} onClose={() => setMappingMeter(null)}>
          <div className="space-y-4 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase px-1">Chọn các phòng sử dụng chung công tơ này:</p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto no-scrollbar py-2">
              {rooms.filter(r => r.houseId === selectedHouse?.id).map(r => {
                const isSelected = mappingMeter.roomIds.includes(r.id);
                return (
                  <button key={r.id} onClick={() => {
                    const newIds = isSelected ? mappingMeter.roomIds.filter(id => id !== r.id) : [...mappingMeter.roomIds, r.id];
                    setMeters(prev => prev.map(m => m.id === mappingMeter.id ? { ...m, roomIds: newIds } : m));
                    setMappingMeter({ ...mappingMeter, roomIds: newIds });
                  }} className={`p-3 rounded-xl border-2 font-black text-xs flex justify-between items-center transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'}`}>
                    <span>Phòng {r.roomCode}</span>{isSelected && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                )
              })}
            </div>
            <button onClick={handleSaveMeterMapping} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all border-b-1 border-blue-800 text-center">Hoàn tất</button>
          </div>
        </Modal>
      )}

      {isAddMeterModalOpen && (
        <Modal title={editingMeter ? "Cập nhật công tơ" : "Thêm công tơ mới"} onClose={() => { setIsAddMeterModalOpen(false); setEditingMeter(null); }}>
          <form onSubmit={handleSaveMeter} className="space-y-4 text-left">
            <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Tên mô tả</label><input name="name" defaultValue={editingMeter?.name || ''} placeholder="VD: BNL Tầng 1" required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Loại thiết bị</label><select name="type" defaultValue={editingMeter?.type || 'electric'} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none appearance-none focus:border-blue-600"><option value="electric">Điện phòng</option><option value="heater">Bình nóng lạnh chung</option></select></div>
            <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase px-1">Chỉ số đầu</label><input name="val" type="number" defaultValue={editingMeter?.oldVal || '0'} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-600" /></div>
            <div className="flex gap-2 mt-4">
              {editingMeter && (
                <button type="button" onClick={() => handleDeleteMeter(editingMeter.id)} className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-black uppercase text-[10px] border-b-1 border-red-200 active:translate-y-1 transition-all text-center">Xóa</button>
              )}
              <button type="submit" className="flex-[2] bg-orange-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] border-b-1 border-orange-800 active:translate-y-1 transition-all text-center">{editingMeter ? 'Lưu thay đổi' : 'Tạo công tơ'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL THÊM SỔ TIẾT KIỆM */}
      {isAddSavingModalOpen && (
        <Modal title={editingSaving ? "Cập nhật sổ tiết kiệm" : "Thêm sổ tiết kiệm"} onClose={() => setIsAddSavingModalOpen(false)}>
          <form onSubmit={handleAddSaving} className="space-y-4 text-left p-1">
            {savingCalc.amount > 0 && savingCalc.rate > 0 && savingCalc.months > 0 && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tiền lãi dự tính</span>
                <span className="text-base font-black text-emerald-600">+{formatN(Math.round((savingCalc.amount * (savingCalc.rate / 100) * (savingCalc.months / 12))))} đ</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ngân hàng / Tên sổ</label>
              <div className="relative group">
                <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <input type="text" name="bankName" list="bank-names-list" required defaultValue={editingSaving?.bankName} placeholder="VD: Vietcombank, Sổ tiết kiệm 1..." className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" />
                <datalist id="bank-names-list">
                  {uniqueBankNames.map((name, idx) => (
                    <option key={idx} value={name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền gửi (VNĐ)</label>
              <input type="text" name="amount" required defaultValue={editingSaving ? formatN(editingSaving.amount) : ''} onInput={(e) => { e.target.value = formatN(parseN(e.target.value)); setSavingCalc(prev => ({ ...prev, amount: parseN(e.target.value) })); }} placeholder="0" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-800 outline-none focus:border-amber-500 shadow-inner" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lãi suất (%/năm)</label><input type="number" step="0.1" name="interestRate" required defaultValue={editingSaving?.interestRate} onChange={(e) => setSavingCalc(prev => ({ ...prev, rate: Number(e.target.value) }))} placeholder="VD: 5.5" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kỳ hạn (Tháng)</label><input type="number" step="any" name="termMonths" required defaultValue={editingSaving?.termMonths} onChange={(e) => setSavingCalc(prev => ({ ...prev, months: Number(e.target.value) }))} placeholder="VD: 6, hoặc 0.5..." className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" /></div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ngày gửi</label>
              <input type="date" name="startDate" required defaultValue={getSafeDate(editingSaving?.startDate)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500 shadow-inner" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ghi chú thêm</label>
              <textarea name="note" rows="2" defaultValue={editingSaving?.note} placeholder="Tùy chọn..." className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm outline-none focus:border-amber-500 shadow-inner resize-none"></textarea>
            </div>

            <div className="flex gap-2 pt-3">
              {editingSaving && (
                <button type="button" onClick={() => handleDeleteSaving(editingSaving.id)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[11px] active:scale-95 border-b-1 border-red-200 transition-all">Xóa sổ</button>
              )}
              <button type="submit" className={`flex-[2] text-white py-4 rounded-xl font-black uppercase text-[11px] shadow-lg transition-all active:scale-95 border-b-1 bg-slate-900 border-slate-950 hover:bg-slate-800`}>
                {editingSaving ? 'Lưu thay đổi' : 'Thêm sổ tiết kiệm'}
              </button>
            </div>
          </form>
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