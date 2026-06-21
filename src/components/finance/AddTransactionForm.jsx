import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';
import { TRANSACTION_CATEGORIES } from '../../utils/constants';
import { formatN, parseN } from '../../utils/formatters';

const OTHER_NOTE_PRESETS = [
  { key: 'shared_bill', label: 'Hóa đơn chung', tone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', activeTone: 'bg-amber-500 text-white shadow-sm shadow-amber-200', buildNote: () => `Đóng điện nước T${getPreviousMonth()}` },
  { key: 'trash', label: 'Dọn rác', tone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', activeTone: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200', buildNote: () => 'Chi dọn rác' },
  { key: 'cleaning', label: 'Dọn vệ sinh', tone: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', activeTone: 'bg-sky-500 text-white shadow-sm shadow-sky-200', buildNote: () => 'Dọn vệ sinh' },
  { key: 'refund', label: 'Hoàn cọc', tone: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', activeTone: 'bg-rose-500 text-white shadow-sm shadow-rose-200', buildNote: (roomLabel) => (roomLabel ? `Hoàn cọc phòng ${roomLabel}` : 'Hoàn cọc phòng ...') },
];

const getCurrentMonth = () => new Date().getMonth() + 1;
const getPreviousMonth = () => {
  const month = getCurrentMonth();
  return month === 1 ? 12 : month - 1;
};
const getHousePaymentPeriod = (selectedHouse) => Math.max(1, Number(selectedHouse?.paymentPeriod) || 1);
const getAmountSuggestionValues = (amount) => {
  if (!Number.isFinite(amount) || amount <= 0) return [];

  if (amount < 1000) {
    return [amount * 1000, amount * 1000000];
  }

  if (amount < 1000000) {
    return [amount * 10, amount * 1000];
  }

  if (amount < 100000000) {
    return [amount * 10, amount * 100];
  }

  return [amount * 10];
};

const getRoomLabel = (room) => room?.roomCode || room?.code || room?.name || room?.id || '';

const buildSuggestedNote = ({ txType, selectedCat, otherPresetKey, refundRoomLabel, selectedHouse }) => {
  if (txType !== 'out') return '';

  switch (selectedCat) {
    case 'ELEC':
      return `Đóng tiền điện T${getPreviousMonth()}`;
    case 'WATER':
      return `Đóng tiền nước T${getPreviousMonth()}`;
    case 'INTERNET':
      return `Đóng tiền internet tháng ${getCurrentMonth()}`;
    case 'HOUSE': {
      const paymentPeriod = getHousePaymentPeriod(selectedHouse);
      return `Đóng ${paymentPeriod} tháng tiền nhà`;
    }
    case 'OTHER': {
      const preset = OTHER_NOTE_PRESETS.find(item => item.key === otherPresetKey);
      return preset ? preset.buildNote(refundRoomLabel) : '';
    }
    default:
      return '';
  }
};

const AddTransactionForm = ({
  onSave,
  onDelete,
  editingTransaction,
  canManageTransactions,
  selectedHouse,
  rooms = [],
  txType,
  setTxType,
  selectedCat,
  setSelectedCat,
  isCatOpen,
  setIsCatOpen,
}) => {
  const [amountInput, setAmountInput] = React.useState(() => (
    editingTransaction ? formatN(editingTransaction.amount) : ''
  ));
  const [note, setNote] = React.useState(() => editingTransaction?.note || '');
  const [otherPresetKey, setOtherPresetKey] = React.useState('');
  const [refundRoomId, setRefundRoomId] = React.useState('');
  const [refundRooms, setRefundRooms] = React.useState(() => (Array.isArray(rooms) ? rooms : []));
  const [isRefundRoomsLoading, setIsRefundRoomsLoading] = React.useState(false);
  const visibleCategoryEntries = React.useMemo(() => (
    Object.entries(TRANSACTION_CATEGORIES).filter(([key]) => !(txType === 'out' && key === 'RENT'))
  ), [txType]);
  const amountNumber = React.useMemo(() => parseN(amountInput || '0') || 0, [amountInput]);
  const amountQuickOptions = React.useMemo(() => {
    if (amountNumber <= 0) return [];
    return Array.from(new Set(getAmountSuggestionValues(amountNumber)))
      .filter(value => value !== amountNumber)
      .slice(0, 2)
      .map((value, index) => ({
        key: `amount-suggestion-${index}-${value}`,
        label: formatN(value),
        value,
      }));
  }, [amountNumber]);

  const refundRoomLabel = React.useMemo(() => {
    const room = refundRooms.find(item => String(item.id) === String(refundRoomId));
    return getRoomLabel(room);
  }, [refundRoomId, refundRooms]);

  React.useEffect(() => {
    setAmountInput(editingTransaction ? formatN(editingTransaction.amount) : '');
    setNote(editingTransaction?.note || '');
    setOtherPresetKey('');
    setRefundRoomId('');
  }, [editingTransaction]);

  React.useEffect(() => {
    if (Array.isArray(rooms) && rooms.length > 0) setRefundRooms(rooms);
  }, [rooms]);

  React.useEffect(() => {
    if (txType !== 'out') return;
    const suggested = buildSuggestedNote({ txType, selectedCat, otherPresetKey, refundRoomLabel, selectedHouse });
    if (suggested) setNote(suggested);
  }, [otherPresetKey, refundRoomLabel, selectedCat, selectedHouse, txType]);

  React.useEffect(() => {
    if (txType === 'out' && selectedCat === 'RENT') {
      setSelectedCat('OTHER');
    }
  }, [selectedCat, setSelectedCat, txType]);

  React.useEffect(() => {
    if (selectedCat !== 'OTHER' && otherPresetKey) setOtherPresetKey('');
    if (selectedCat !== 'OTHER' || otherPresetKey !== 'refund') {
      setRefundRoomId('');
    }
  }, [otherPresetKey, selectedCat]);

  React.useEffect(() => {
    if (selectedCat !== 'OTHER' || otherPresetKey !== 'refund' || refundRooms.length > 0 || !selectedHouse?.id) return;

    let cancelled = false;
    const loadRooms = async () => {
      setIsRefundRoomsLoading(true);
      try {
        const result = await api.get(`/room/${selectedHouse.id}`);
        if (!cancelled) setRefundRooms(Array.isArray(result) ? result : []);
      } catch {
        if (!cancelled) setRefundRooms([]);
      } finally {
        if (!cancelled) setIsRefundRoomsLoading(false);
      }
    };

    void loadRooms();
    return () => {
      cancelled = true;
    };
  }, [otherPresetKey, refundRooms.length, selectedCat, selectedHouse?.id]);

  const handleAmountChange = (event) => {
    setAmountInput(formatN(parseN(event.target.value)));
  };

  const handleApplySuggestedAmount = (value) => setAmountInput(formatN(value));

  const handleSelectCategory = (key) => {
    setSelectedCat(key);
    setIsCatOpen(false);
  };

  return (
    <form onSubmit={onSave} className="space-y-5 text-left p-1">
      <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1.5">
        <button
          type="button"
          onClick={() => setTxType('in')}
          className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${txType === 'in' ? 'bg-white text-emerald-600' : 'text-slate-400'}`}
        >
          <div className={`w-2 h-2 rounded-full ${txType === 'in' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          Thu vào (+)
        </button>
        <button
          type="button"
          onClick={() => setTxType('out')}
          className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${txType === 'out' ? 'bg-white text-rose-600' : 'text-slate-400'}`}
        >
          <div className={`w-2 h-2 rounded-full ${txType === 'out' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
          Chi ra (-)
        </button>
      </div>

      <div className="space-y-2">
        <label className="block px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Số tiền (VND)</label>
        <div className="relative">
          <input
            type="text"
            name="amount"
            required
            placeholder="0"
            value={amountInput}
            className="w-full p-4 bg-slate-50 rounded-xl font-black text-2xl outline-none border-2 transition-all shadow-inner tabular-nums"
            onChange={handleAmountChange}
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">đ</span>
        </div>
        {amountQuickOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {amountQuickOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleApplySuggestedAmount(option.value)}
                className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100 transition-all active:scale-95"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 relative">
        <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Danh mục</label>

        <button
          type="button"
          onClick={() => setIsCatOpen(!isCatOpen)}
          className="w-full p-4 bg-slate-50 rounded-xl font-bold text-sm text-left flex justify-between items-center border-2 border-transparent hover:border-slate-200 transition-all shadow-inner active:scale-[0.99]"
        >
          <span className="text-slate-700">
            {TRANSACTION_CATEGORIES[selectedCat]?.label || TRANSACTION_CATEGORIES.RENT.label}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isCatOpen ? 'rotate-180' : ''}`} />
        </button>

        {isCatOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsCatOpen(false)} />
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
              <div className="max-h-60 overflow-y-auto p-1">
                {visibleCategoryEntries.map(([key, category]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectCategory(key)}
                    className={`w-full px-4 py-3.5 text-left text-sm font-bold flex justify-between items-center transition-colors rounded-xl mb-0.5 last:mb-0 ${selectedCat === key ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}
                  >
                    <span>{category.label}</span>
                    {selectedCat === key && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {txType === 'out' && selectedCat === 'OTHER' && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Gợi ý nhanh</label>
          <div className="flex flex-wrap gap-2">
            {OTHER_NOTE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setOtherPresetKey(preset.key)}
                className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase transition-all active:scale-95 ${
                  otherPresetKey === preset.key
                    ? preset.activeTone
                    : preset.tone
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {txType === 'out' && selectedCat === 'OTHER' && otherPresetKey === 'refund' && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Phòng hoàn cọc</label>
          <select
            value={refundRoomId}
            onChange={(event) => setRefundRoomId(event.target.value)}
            className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-200"
          >
            <option value="">{isRefundRoomsLoading ? 'Đang tải phòng...' : 'Chọn phòng'}</option>
            {refundRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {getRoomLabel(room) ? `Phòng ${getRoomLabel(room)}` : `Phòng ${room.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Nội dung chi tiết</label>
        <textarea
          name="note"
          rows="2"
          placeholder="Ghi chú thêm..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full p-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-600/20 shadow-inner resize-none"
        />
      </div>

      <div className="flex gap-2 pt-3">
        {editingTransaction && canManageTransactions && (
          <button type="button" onClick={() => onDelete(editingTransaction.id)} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[11px] active:scale-95 border-b-1 border-red-200">
            Xóa
          </button>
        )}
        <button type="submit" className={`flex-[2] text-white py-4 rounded-xl font-black uppercase text-[11px] transition-all active:scale-95 border-b-1 ${txType === 'in' ? 'bg-emerald-600 border-emerald-800' : 'bg-rose-600 border-rose-800'}`}>
          {editingTransaction ? 'Lưu thay đổi' : 'Xác nhận'}
        </button>
      </div>

      <input type="hidden" name="type" value={txType} />
      <input type="hidden" name="category" value={TRANSACTION_CATEGORIES[selectedCat]?.id ?? 0} />
    </form>
  );
};

export default AddTransactionForm;
