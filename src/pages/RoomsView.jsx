import React, { useEffect } from 'react';
import {
    Bike,
    Calendar,
    CreditCard,
    Loader2,
    PlusCircle,
    QrCode,
    Users2,
} from 'lucide-react';
import { api } from '../services/api';
import { formatN } from '../utils/formatters';
import { diffDays, endContract, getDueInfo } from '../utils/date';
import MeterReadingLinkQrModal from '../components/common/MeterReadingLinkQrModal';

const FE_BASE_URL = (import.meta.env.VITE_FE_URL || window.location.origin).replace(/\/+$/g, '');
const LINK_CACHE_KEY = 'lucky_home_meter_links';

const readLinkCache = () => {
    try {
        return JSON.parse(localStorage.getItem(LINK_CACHE_KEY) || '{}');
    } catch {
        return {};
    }
};

const writeLinkCache = (links) => {
    localStorage.setItem(LINK_CACHE_KEY, JSON.stringify(links));
};

const getRoomLinkLabel = (room) => {
    const roomLabel = room.roomCode || room.code || room.name || room.id;
    const houseLabel = room.houseName || room.house?.name || room.house?.houseName || '';
    return `${houseLabel ? `${houseLabel} - ` : ''}Phòng ${roomLabel}`;
};

const copyMeterReadingLink = async (room, link) => {
    const label = getRoomLinkLabel(room);
    await navigator.clipboard.writeText(`${label}\n${link}`);
};

const getMeterReadingTokenFromLink = (link) => {
    try {
        const url = new URL(link, FE_BASE_URL);
        const parts = url.pathname.split('/').filter(Boolean);
        const index = parts.indexOf('meter-reading');
        return index >= 0 ? decodeURIComponent(parts[index + 1] || '') : '';
    } catch {
        return '';
    }
};

const getHouseLabel = (selectedHouse) => (
    selectedHouse?.houseName || selectedHouse?.name || selectedHouse?.title || ''
);

const getPeriodMonths = (value) => {
    const months = Number(value);
    return Number.isInteger(months) && months >= 1 ? months : 1;
};

const getMeterReadingDisplayDay = (room) => room.meterReadingDay ?? room.paymentDate ?? '';

const formatDateVN = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const sortRoomsByType = (rooms = []) => (
    [...rooms].sort((a, b) => {
        const aPriority = a.roomType === 'mbkd' ? 0 : 1;
        const bPriority = b.roomType === 'mbkd' ? 0 : 1;
        return aPriority - bPriority;
    })
);

const resolvePublicLink = (result) => {
    const rawUrl = result?.url || result?.link || result?.publicUrl;
    if (rawUrl) {
        if (rawUrl.startsWith('http')) return rawUrl;
        if (rawUrl.startsWith('/')) return `${FE_BASE_URL}${rawUrl}`;
        if (rawUrl.startsWith('meter-reading/')) return `${FE_BASE_URL}/${rawUrl}`;
        if (!rawUrl.includes('/')) return `${FE_BASE_URL}/meter-reading/${encodeURIComponent(rawUrl)}`;
        return `${FE_BASE_URL}/${rawUrl}`;
    }

    if (result?.tokenHash || result?.hash) {
        throw new Error('API đang trả token hash nên link không mở được. BE cần trả url hoặc token gốc.');
    }

    const token = result?.token || result?.publicToken;
    if (token) return `${FE_BASE_URL}/meter-reading/${encodeURIComponent(token)}`;

    throw new Error('Máy chủ chưa trả về link công tơ.');
};

const RoomsView = ({
    currentRooms,
    setEditingRoom,
    setIsAddRoomModalOpen,
    isManagerOrAbove,
    highlightedItemId,
    setHighlightedItemId,
    showToast,
    requestConfirm,
    selectedHouse,
}) => {
    const [meterLinks, setMeterLinks] = React.useState(() => readLinkCache());
    const [linkLoadingRoomId, setLinkLoadingRoomId] = React.useState(null);
    const [qrLinkInfo, setQrLinkInfo] = React.useState(null);

    useEffect(() => {
        if (highlightedItemId && currentRooms?.length > 0) {
            const hId = String(highlightedItemId);
            const targetRoom = currentRooms.find(room => String(room.id) === hId || String(room.roomCode) === hId);
            if (targetRoom) {
                let attempts = 0;
                const scrollInterval = setInterval(() => {
                    const element = document.getElementById(`room-card-${targetRoom.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        clearInterval(scrollInterval);
                    }
                    attempts += 1;
                    if (attempts >= 10) clearInterval(scrollInterval);
                }, 200);
                return () => clearInterval(scrollInterval);
            }
        }
    }, [highlightedItemId, currentRooms]);

    const saveMeterLink = (roomId, result) => {
        const fullUrl = resolvePublicLink(result);
        const nextValue = {
            url: fullUrl,
            expiresAt: result?.expiresAt || null,
            recurring: result?.recurring ?? true,
            reset: Boolean(result?.reset),
            updatedAt: new Date().toISOString(),
        };

        setMeterLinks(prev => {
            const next = { ...prev, [roomId]: nextValue };
            writeLinkCache(next);
            return next;
        });

        return fullUrl;
    };

    const handleShowMeterLinkQr = async (event, room) => {
        event?.stopPropagation?.();

        try {
            setLinkLoadingRoomId(room.id);
            const link = meterLinks[room.id]?.url || saveMeterLink(room.id, await api.post('/meter-reading/link', { roomId: room.id }));
            setQrLinkInfo({
                url: link,
                label: getRoomLinkLabel(room),
                houseLabel: getHouseLabel(selectedHouse),
                roomLabel: room.roomCode || room.code || room.name || room.id,
                room,
            });
        } catch (error) {
            showToast?.(error.message || 'Không mở được QR link công tơ.', 'error');
        } finally {
            setLinkLoadingRoomId(null);
        }
    };

    const handleValidateMeterLink = async (linkInfo) => {
        const token = getMeterReadingTokenFromLink(linkInfo?.url || '');
        if (!token) return false;

        try {
            await api.get(`/meter-reading/session/${encodeURIComponent(token)}`);
            return true;
        } catch {
            return false;
        }
    };

    const handleResetMeterLink = async (linkInfo, options = {}) => {
        const room = linkInfo?.room;
        if (!room) return false;

        if (!options.skipConfirm) {
            const confirmed = await requestConfirm?.({
                title: 'Reset link công tơ',
                message: 'Reset link sẽ làm link cũ không còn truy cập được. Chỉ dùng khi phòng có khách thuê mới hoặc nghi link bị lộ.',
            });
            if (!confirmed) return false;
        }

        try {
            setLinkLoadingRoomId(room.id);
            const result = await api.post('/meter-reading/link/reset', { roomId: room.id });
            const fullUrl = saveMeterLink(room.id, result);
            setQrLinkInfo(prev => prev ? { ...prev, url: fullUrl } : prev);
            if (!options.autoOpen) {
                await copyMeterReadingLink(room, fullUrl);
            } else {
                await copyMeterReadingLink(room, fullUrl).catch(() => null);
            }
            showToast?.(options.autoOpen ? `Link phòng ${room.roomCode || room.id} bị hỏng. Đã tạo link mới, hãy gửi lại cho khách.` : `Đã reset và copy link mới phòng ${room.roomCode || room.id}`, 'success');
            return fullUrl;
        } catch (error) {
            showToast?.(error.message || 'Không reset được link công tơ.', 'error');
            throw error;
        } finally {
            setLinkLoadingRoomId(null);
        }
    };

    return (
        <div className="space-y-4 pb-20 animate-in slide-in-from-right">
            <div className="grid grid-cols-1 gap-2">
                {currentRooms.length === 0 && (
                    <p className="text-xs text-slate-400 italic mt-5 col-span-2 text-center">
                        Chưa có phòng nào. Bấm Thêm phòng mới bên dưới.
                    </p>
                )}

                {sortRoomsByType(currentRooms).map(room => {
                    const roomCode = room.roomCode || room.id;
                    const roomTypeLabel = room.roomType === 'mbkd' ? 'MBKD' : 'Phòng';
                    const roomTitle = room.roomType === 'mbkd' ? roomCode : `P.${roomCode}`;
                    const roomTitleBadgeStyle = room.roomType === 'mbkd' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white';
                    const roomTypeStyle = room.roomType === 'mbkd'
                        ? 'bg-purple-50 text-purple-700 ring-purple-100'
                        : 'bg-blue-50 text-blue-700 ring-blue-100';
                    const payDays = getDueInfo(room.paymentDate)?.daysLeft || 0;
                    const contractEndDate = endContract(room.contractStart, room.months);
                    const endDays = diffDays(contractEndDate);
                    const paymentPeriodMonths = getPeriodMonths(room.paymentPeriodMonths);
                    const meterReadingPeriodMonths = getPeriodMonths(room.meterReadingPeriodMonths);
                    const meterReadingDisplayDay = getMeterReadingDisplayDay(room);
                    const meterReadingStartLabel = formatDateVN(room.meterReadingStartDate);
                    const isPayUrgent = room.status === 'full' && payDays <= 3;
                    const isPaySoon = room.status === 'full' && payDays > 3 && payDays <= 7;
                    const showContractWarning = room.status === 'full' && contractEndDate && endDays <= 30;
                    const hId = highlightedItemId ? String(highlightedItemId) : null;
                    const isHighlighted = hId && (String(room.id) === hId || String(room.roomCode) === hId);
                    const isLinkLoading = linkLoadingRoomId === room.id;

                    let cardStyle = room.status !== 'full'
                        ? 'border-slate-200 bg-white opacity-80'
                        : isPayUrgent
                            ? 'border-red-200 bg-white shadow-red-100'
                            : isPaySoon
                                ? 'border-amber-200 bg-white shadow-amber-100'
                                : 'border-slate-200 bg-white shadow-slate-100';
                    if (isHighlighted) cardStyle += ' border-red-500 shadow-red-200 animate-pulse ring-2 ring-red-200';

                    const statusPillStyle = room.status !== 'full'
                        ? 'bg-slate-100 text-slate-600 ring-slate-200'
                        : isPayUrgent
                            ? 'bg-red-50 text-red-700 ring-red-200'
                            : isPaySoon
                                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                : 'bg-blue-50 text-blue-700 ring-blue-200';
                    const payColor = isPayUrgent ? 'text-red-700 bg-red-50 ring-red-200' : isPaySoon ? 'text-amber-700 bg-amber-50 ring-amber-200' : 'text-emerald-700 bg-emerald-50 ring-emerald-200';
                    const endColor = endDays <= 7 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                    const statusRail = room.status !== 'full'
                        ? 'bg-slate-300'
                        : isPayUrgent
                            ? 'bg-red-500'
                            : isPaySoon
                                ? 'bg-amber-500'
                                : 'bg-blue-500';

                    return (
                        <div
                            id={`room-card-${room.id}`}
                            key={room.id}
                            onClick={() => {
                                if (isHighlighted && setHighlightedItemId) setHighlightedItemId(null);
                                setEditingRoom(room);
                                setIsAddRoomModalOpen(true);
                            }}
                            className={`relative cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-all active:scale-[0.99] ${cardStyle}`}
                        >
                            <div className={`absolute inset-y-0 left-0 w-1 ${statusRail}`} />

                            <div className="p-3 pl-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            {isManagerOrAbove ? (
                                                <button
                                                    type="button"
                                                    onClick={(event) => handleShowMeterLinkQr(event, room)}
                                                    disabled={isLinkLoading}
                                                    className={`min-w-0 truncate rounded-md px-2 py-1 text-left text-[13px] font-black uppercase leading-none shadow-sm active:scale-[0.98] disabled:opacity-60 ${roomTitleBadgeStyle}`}
                                                    title="Mở QR ghi điện"
                                                >
                                                    {roomTitle}
                                                </button>
                                            ) : (
                                                <h3 className={`truncate rounded-md px-2 py-1 text-[13px] font-black uppercase leading-none shadow-sm ${roomTitleBadgeStyle}`}>
                                                    {roomTitle}
                                                </h3>
                                            )}
                                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-black uppercase leading-none ring-1 ${roomTypeStyle}`}>
                                                {roomTypeLabel}
                                            </span>
                                            {room.status === 'empty' && (
                                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-500 ring-1 ring-slate-200">
                                                    Trống
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isManagerOrAbove && (
                                        <button
                                            type="button"
                                            onClick={(event) => handleShowMeterLinkQr(event, room)}
                                            disabled={isLinkLoading}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-700 shadow-sm transition-all active:scale-95 disabled:opacity-60"
                                            title="QR ghi điện"
                                        >
                                            {isLinkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                                        </button>
                                    )}
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`truncate text-[18px] font-black leading-none tabular-nums ${isPayUrgent ? 'text-red-700' : isPaySoon ? 'text-amber-700' : 'text-blue-700'}`}>
                                            {formatN(room.price)}
                                        </p>
                                    </div>
                                    {room.status === 'full' && (
                                        <div className={`rounded-md px-2 py-1 text-right ring-1 ${payColor}`}>
                                            <p className="text-[10px] font-black leading-none">Còn {payDays > 0 ? payDays : 0} ngày</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-y border-slate-100 py-1.5">
                                    <div className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 ring-1 ring-slate-200">
                                        <Users2 className="mr-1 h-3 w-3 text-blue-600" />{room.peopleCount ?? room.people ?? 0} người
                                    </div>
                                    {room.eBikeCount > 0 && (
                                        <div className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 ring-1 ring-slate-200">
                                            <Bike className="mr-1 h-3 w-3 text-amber-600" />{room.eBikeCount ?? room.ebikes ?? 0} xe điện
                                        </div>
                                    )}
                                    {showContractWarning && (
                                        <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-black ${endColor}`}>
                                            <Calendar className="mr-1 h-3 w-3" /> HĐ còn {endDays > 0 ? endDays : 0} ngày
                                        </div>
                                    )}
                                    <div className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ring-1 ${statusPillStyle}`}>
                                        {room.status === 'full' ? 'Đang thuê' : 'Đang trống'}
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
                                    <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-black text-blue-700 ring-1 ring-blue-100">Đóng {paymentPeriodMonths} tháng/lần</span>
                                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-black text-amber-700 ring-1 ring-amber-100">Điện {meterReadingPeriodMonths} tháng/lần</span>
                                    <span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-black text-slate-700 ring-1 ring-slate-200">Ngày {meterReadingDisplayDay || '-'}</span>
                                    {meterReadingStartLabel && (
                                        <span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-black text-slate-700 ring-1 ring-slate-200">Từ {meterReadingStartLabel}</span>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>

            {isManagerOrAbove && (
                <button
                    type="button"
                    onClick={() => { setEditingRoom(null); setIsAddRoomModalOpen(true); }}
                    className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <PlusCircle className="w-4 h-4 text-white" /> Thêm Phòng Mới
                </button>
            )}

            <MeterReadingLinkQrModal
                linkInfo={qrLinkInfo}
                onClose={() => setQrLinkInfo(null)}
                onCopy={(currentLinkInfo) => currentLinkInfo && copyMeterReadingLink(currentLinkInfo.room, currentLinkInfo.url)}
                onReset={handleResetMeterLink}
                onValidateLink={handleValidateMeterLink}
            />
        </div>
    );
};

export default RoomsView;
