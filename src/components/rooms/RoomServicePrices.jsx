import { useState } from 'react';
import { roomServicePriceFields } from '../../utils/roomServicePrices';

const controlClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const displayPrice = (value) => value == null ? 'Chưa có giá' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const formatPriceInput = (value) => {
  const [integer, decimal] = String(value).split('.');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimal === undefined ? '' : `.${decimal}`);
};

const ChoiceGroup = ({ label, value, options, onChange }) => (
  <div role="group" aria-label={label} className="flex gap-1 rounded-lg bg-slate-100 p-1">
    {options.map(option => (
      <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`min-w-0 flex-1 rounded-md px-2 py-2 text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${value === option.value ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'}`}>
        <span className={option.value === 'custom' ? 'text-red-600' : undefined}>{option.label}</span>
      </button>
    ))}
  </div>
);

export default function RoomServicePrices({ room, config = {} }) {
  const [values, setValues] = useState(() => Object.fromEntries(roomServicePriceFields.map(({ key }) => [key, room?.[`${key}Override`] ?? null])));
  const [waterMethod, setWaterMethod] = useState(room?.waterCalcMethodOverride ?? '');
  const inheritedMethod = (room?.waterCalcMethodOverride == null ? room?.effectiveServicePrices?.waterCalcMethod : null) ?? config.waterCalcMethod;
  const effectiveMethod = waterMethod || inheritedMethod;

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-slate-500">Mỗi khoản mặc định theo giá nhà. Chọn giá riêng để áp dụng cho phòng; nhập 0 nếu miễn phí.</p>
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-600">Cách tính nước</span>
        <ChoiceGroup label="Cách tính nước" value={waterMethod} onChange={setWaterMethod} options={[{ value: '', label: 'Theo nhà' }, { value: 'person', label: 'Theo người' }, { value: 'm3', label: 'Theo m³' }]} />
        <input type="hidden" name="waterCalcMethodOverride" value={waterMethod} />
        <span className="block text-[10px] text-slate-500">Áp dụng: {effectiveMethod === 'person' ? 'Theo người' : effectiveMethod === 'm3' ? 'Theo m³' : 'Chưa có cấu hình'}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {roomServicePriceFields.map(({ key, label, unit }) => {
          const value = values[key];
          const isOverride = value !== null;
          const inherited = (room?.[`${key}Override`] == null ? room?.effectiveServicePrices?.[key] : null) ?? config[key];
          const effective = isOverride ? (value === '' ? null : Number(value)) : inherited;
          return (
            <div key={key} className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-[10px] font-bold text-slate-600">{label} ({unit})</p>
              <ChoiceGroup label={`Chọn giá ${label.toLowerCase()}`} value={isOverride ? 'custom' : 'house'} onChange={mode => setValues(current => ({ ...current, [key]: mode === 'house' ? null : '' }))} options={[{ value: 'house', label: 'Theo giá nhà' }, { value: 'custom', label: 'Giá riêng' }]} />
              {isOverride ? (
                <input aria-label={`Giá riêng ${label.toLowerCase()}`} type="text" inputMode="decimal" required pattern="[0-9,]+(\.[0-9]{1,2})?" value={formatPriceInput(value)} onChange={event => {
                  const input = event.target;
                  const raw = input.value.replace(/,/g, '');
                  if (!/^\d*(\.\d{0,2})?$/.test(raw)) return;
                  const prefixLength = input.value.slice(0, input.selectionStart).replace(/,/g, '').length;
                  setValues(current => ({ ...current, [key]: raw }));
                  requestAnimationFrame(() => {
                    const formatted = formatPriceInput(raw);
                    let position = 0;
                    let count = 0;
                    while (position < formatted.length && count < prefixLength) {
                      if (formatted[position] !== ',') count += 1;
                      position += 1;
                    }
                    input.setSelectionRange(position, position);
                  });
                }} className={`${controlClass} tabular-nums`} placeholder={inherited == null ? `Nhập giá ${label.toLowerCase()} (${unit})` : `Giá nhà: ${displayPrice(inherited)} ${unit}`} />
              ) : null}
              <input type="hidden" name={`${key}Override`} value={value ?? ''} />
              <p className="text-[10px] text-slate-500">Áp dụng: <span className={`font-bold ${isOverride && effective != null ? 'text-red-600' : 'text-blue-700'}`}>{displayPrice(effective)}</span>{effective != null ? ` ${unit}` : ''}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] leading-relaxed text-slate-500">Giá mới dùng cho kỳ hóa đơn tiếp theo. Hóa đơn đã lưu giữ nguyên đơn giá. Phí dịch vụ riêng của MBKD vẫn theo cấu hình hiện tại.</p>
    </div>
  );
}
