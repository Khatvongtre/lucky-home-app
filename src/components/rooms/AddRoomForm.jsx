import React, { useState } from 'react';
import { CalendarDays, Gauge, Home, UsersRound } from 'lucide-react';
import { formatN, parseN } from '../../utils/formatters';
import { getSafeDate } from '../../utils/date';

const getOptionalSafeDate = (date) => date ? getSafeDate(date) : '';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'px-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500';
const sectionClass = 'rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm';

const Section = ({ icon: Icon, title, children }) => (
    <section className={sectionClass}>
        <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                <Icon className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">{title}</p>
        </div>
        {children}
    </section>
);

const Field = ({ label, children, className = '' }) => (
    <div className={`space-y-1 ${className}`}>
        <label className={labelClass}>{label}</label>
        {children}
    </div>
);

const SuffixNumberInput = ({ name, defaultValue, min = 1, max, suffix = 'tháng / lần' }) => (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
            name={name}
            type="number"
            defaultValue={defaultValue}
            min={min}
            max={max}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-xs font-bold text-slate-700 outline-none"
        />
        <span className="shrink-0 pr-3 text-[10px] font-black text-slate-400">{suffix}</span>
    </div>
);

const AddRoomForm = ({ onSave, onDelete, editingRoom, sharedHeaters }) => {
    const [heaterType, setHeaterType] = useState(editingRoom?.heaterMeterId ? 'shared' : 'private');
    const [status, setStatus] = useState(editingRoom?.status || 'full');
    const [roomType, setRoomType] = useState(editingRoom?.roomType || 'room');
    const [contractStart, setContractStart] = useState(getSafeDate(editingRoom?.contractStart));
    const [meterReadingStartDate, setMeterReadingStartDate] = useState(
        editingRoom
            ? getOptionalSafeDate(editingRoom?.meterReadingStartDate)
            : getSafeDate(editingRoom?.contractStart)
    );

    const handleContractStartChange = (event) => {
        const nextStart = event.target.value;
        setContractStart(nextStart);

        if (!editingRoom) {
            setMeterReadingStartDate((current) => (
                !current || current === contractStart ? nextStart : current
            ));
        }
    };

    const disabledWhenEmpty = status === 'empty' ? 'opacity-50 grayscale pointer-events-none' : '';

    return (
        <form onSubmit={onSave} className="space-y-3 text-left">
            <Section icon={Home} title="Thông tin phòng">
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className={labelClass}>Trạng thái phòng</label>
                        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1">
                            <button type="button" onClick={() => setStatus('full')} className={`rounded-md py-2.5 text-[10px] font-black uppercase transition-all ${status === 'full' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white/70'}`}>Đã chốt</button>
                            <button type="button" onClick={() => setStatus('empty')} className={`rounded-md py-2.5 text-[10px] font-black uppercase transition-all ${status === 'empty' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white/70'}`}>Đang trống</button>
                        </div>
                        <input type="hidden" name="status" value={status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Mã phòng / Tên MB">
                            <input name="rid" defaultValue={editingRoom?.roomCode || editingRoom?.id || ''} required className={inputClass} />
                        </Field>
                        <Field label="Giá thuê">
                            <input name="price" type="text" defaultValue={formatN(editingRoom?.price || 0)} required className={`${inputClass} font-black text-blue-700`} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Loại hình">
                            <select name="roomType" value={roomType} onChange={(e) => setRoomType(e.target.value)} className={`${inputClass} appearance-none`}>
                                <option value="room">Phòng trọ</option>
                                <option value="mbkd">Mặt bằng kinh doanh</option>
                            </select>
                        </Field>
                        {roomType === 'mbkd' && (
                            <Field label="Phí DV hàng tháng" className="animate-in zoom-in-95">
                                <input name="monthlyFee" type="text" defaultValue={formatN(editingRoom?.monthlyFee || 0)} className={`${inputClass} font-black text-blue-700`} onInput={(e) => e.target.value = formatN(parseN(e.target.value))} placeholder="Thu hàng tháng" />
                            </Field>
                        )}
                    </div>
                </div>
            </Section>

            <Section icon={UsersRound} title="Người thuê & hợp đồng">
                <div className={`space-y-3 transition-all duration-300 ${disabledWhenEmpty}`}>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Số cư dân">
                            <input name="people" type="number" defaultValue={editingRoom?.peopleCount ?? editingRoom?.people ?? 2} className={inputClass} />
                        </Field>
                        <Field label="Xe điện">
                            <input name="ebikes" type="number" defaultValue={editingRoom?.eBikeCount ?? editingRoom?.eBikes ?? 0} className={inputClass} />
                        </Field>
                    </div>

                    <Field label="Ngày ký HĐ">
                        <input name="start" type="date" value={contractStart} onChange={handleContractStartChange} required={status === 'full'} className={inputClass} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Hạn đóng (ngày)">
                            <input name="payDay" type="number" defaultValue={editingRoom?.paymentDate || 5} min="1" max="31" className={inputClass} />
                        </Field>
                        <Field label="Thời hạn (tháng)">
                            <input name="months" type="number" defaultValue={editingRoom?.months || 12} min="1" className={inputClass} />
                        </Field>
                    </div>
                </div>
            </Section>

            <Section icon={CalendarDays} title="Lịch thanh toán & chốt điện">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Đóng tiền">
                        <SuffixNumberInput name="paymentPeriodMonths" defaultValue={editingRoom?.paymentPeriodMonths ?? 1} />
                    </Field>
                    <Field label="Chốt điện">
                        <SuffixNumberInput name="meterReadingPeriodMonths" defaultValue={editingRoom?.meterReadingPeriodMonths ?? 1} />
                    </Field>
                    <Field label="Ngày chốt điện">
                        <input name="meterReadingDay" type="number" defaultValue={editingRoom?.meterReadingDay ?? ''} min="1" max="31" className={inputClass} />
                        <p className="px-0.5 text-[8px] font-bold leading-snug text-slate-400">Mặc định ngày đóng tiền của phòng</p>
                    </Field>
                    <Field label="Ngày bắt đầu tính">
                        <input name="meterReadingStartDate" type="date" value={meterReadingStartDate} onChange={(event) => setMeterReadingStartDate(event.target.value)} className={inputClass} />
                    </Field>
                </div>
            </Section>

            <Section icon={Gauge} title="Công tơ bình nóng lạnh">
                <div className="space-y-3">
                    <Field label="Kiểu công tơ BNL">
                        <select name="heaterType" value={heaterType} onChange={(e) => setHeaterType(e.target.value)} className={`${inputClass} appearance-none`}>
                            <option value="private">Dùng riêng / Không có</option>
                            <option value="shared">Dùng chung tổng</option>
                        </select>
                    </Field>

                    {heaterType === 'shared' && (
                        <Field label="Chọn công tơ tổng" className="animate-in slide-in-from-top-2">
                            <select name="heaterMeterId" defaultValue={editingRoom?.heaterMeterId || ''} className={`${inputClass} bg-blue-50 font-black text-blue-700`}>
                                {sharedHeaters && sharedHeaters.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
                                {(!sharedHeaters || sharedHeaters.length === 0) && <option value="">Không có công tơ BNL nào</option>}
                            </select>
                        </Field>
                    )}
                </div>
            </Section>

            <div className="sticky bottom-0 z-10 -mx-1 flex gap-2 bg-white/95 px-1 pt-2 backdrop-blur">
                {editingRoom && (
                    <button type="button" onClick={() => onDelete(editingRoom.id, editingRoom.roomCode)} className="flex-1 rounded-lg bg-rose-500 py-3.5 text-center text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all active:scale-[0.98]">
                        Xóa
                    </button>
                )}
                <button type="submit" className="flex-[2] rounded-lg bg-blue-600 py-3.5 text-center text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all active:scale-[0.98]">
                    {status === 'full' ? 'Lưu phòng' : 'Lưu phòng trống'}
                </button>
            </div>
        </form>
    );
};

export default AddRoomForm;
