import { ChevronDown, Loader2, Lock, LogOut, QrCode, Save, User } from 'lucide-react';
import { formatN, parseN } from '../utils/formatters';

const SettingsSection = ({ title, isExpanded, onToggle, children }) => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full bg-blue-600 px-5 py-4 flex items-center justify-between active:bg-blue-700 transition-colors"
    >
      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{title}</h4>
      <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
    </button>
    {isExpanded && children}
  </div>
);

const ConfigInput = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-slate-400 uppercase px-1">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none focus:border-blue-600 border border-transparent transition-all"
    />
  </div>
);

const SettingsView = ({
  user,
  config,
  setConfig,
  settingsExpanded,
  setSettingsExpanded,
  handleLogout,
  handleSaveConfig,
  handleUploadQR,
  qrFileRef,
  isScanningQR,
  changePasswordForm,
  setChangePasswordForm,
  handleChangePassword,
}) => {
  const toggleSection = (section) => {
    setSettingsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const setConfigValue = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const waterPriceKey = config.waterCalcMethod === 'person' ? 'priceWaterPerson' : 'priceWaterM3';

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white shadow-lg flex items-center justify-center text-white">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase text-slate-800 leading-none">{user.fullName || 'ADMIN'}</h3>
            <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1.5 bg-blue-50 px-3 py-0.5 rounded-full w-fit">Chủ cơ sở</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 bg-red-50 text-red-600 rounded-xl active:scale-90 transition-all flex flex-col items-center justify-center shadow-sm border border-red-100 hover:bg-red-100">
          <LogOut className="w-5 h-5 mb-1" />
          <span className="text-[8px] font-black uppercase tracking-widest">Đăng xuất</span>
        </button>
      </div>

      <SettingsSection
        title="Bảng giá dịch vụ"
        isExpanded={settingsExpanded.services}
        onToggle={() => toggleSection('services')}
      >
        <div className="p-5 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            <ConfigInput label="Điện (/kWh)" value={formatN(config.priceElec)} onChange={e => setConfigValue('priceElec', parseN(e.target.value))} />
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase px-1">Tính tiền nước</label>
              <select
                value={config.waterCalcMethod || 'person'}
                onChange={e => setConfigValue('waterCalcMethod', e.target.value)}
                className="w-full bg-slate-50 p-3 rounded-xl font-black text-xs outline-none appearance-none focus:border-blue-600 border border-transparent transition-all"
              >
                <option value="person">Theo người</option>
                <option value="m3">Theo khối</option>
              </select>
            </div>
            <ConfigInput label="Giá Nước" value={formatN(config[waterPriceKey])} onChange={e => setConfigValue(waterPriceKey, parseN(e.target.value))} />
            <ConfigInput label="Phí Dịch Vụ" value={formatN(config.priceService)} onChange={e => setConfigValue('priceService', parseN(e.target.value))} />
            <ConfigInput label="Internet" value={formatN(config.priceNet)} onChange={e => setConfigValue('priceNet', parseN(e.target.value))} />
            <ConfigInput label="Xe máy điện" value={formatN(config.priceEBike)} onChange={e => setConfigValue('priceEBike', parseN(e.target.value))} />
            <div className="col-span-2 mt-2">
              <button onClick={handleSaveConfig} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-blue-800 active:translate-y-1 transition-all">
                <Save className="w-4 h-4" /> Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden text-center">
        <div className="bg-blue-600 px-5 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => toggleSection('qr')}
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
              <div className="col-span-2">
                <ConfigInput label="Ngân hàng" value={config.bankName} onChange={e => setConfigValue('bankName', e.target.value)} placeholder="VD: MB BANK" />
              </div>
              <ConfigInput label="Mã BIN" value={config.bankBin || '970422'} onChange={e => setConfigValue('bankBin', e.target.value)} />
              <ConfigInput label="Số tài khoản" value={config.bankAcc} onChange={e => setConfigValue('bankAcc', e.target.value)} placeholder="9999..." />
              <div className="col-span-2 mt-2">
                <button onClick={handleSaveConfig} className="w-full bg-slate-800 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-slate-950 active:translate-y-1 transition-all">
                  <Save className="w-4 h-4" /> Lưu STK VietQR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SettingsSection
        title="Đổi Mật Khẩu"
        isExpanded={settingsExpanded.pass}
        onToggle={() => toggleSection('pass')}
      >
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
              <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-b-1 border-rose-800 active:translate-y-1 transition-all">
                <Lock className="w-4 h-4" /> Xác Nhận Đổi Mật Khẩu
              </button>
            </div>
          </div>
        </form>
      </SettingsSection>
    </div>
  );
};

export default SettingsView;
