import React, { useEffect } from 'react';
import {
    Bike,
    Calendar,
    Copy,
    CreditCard,
    Link2,
    Loader2,
    LucideEdit,
    PlusCircle,
    QrCode,
    RotateCcw,
    Users2,
} from 'lucide-react';
import { api } from '../services/api';
import { formatN } from '../utils/formatters';
import { diffDays, endContract, getDueInfo } from '../utils/date';
import MeterReadingLinkQrModal from '../components/common/MeterReadingLinkQrModal';

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

const resolvePublicLink = (result) => {
    const rawUrl = result?.url || result?.link || result?.publicUrl;
    if (rawUrl) {
        if (rawUrl.startsWith('http')) return rawUrl;
        if (rawUrl.startsWith('/')) return `${window.location.origin}${rawUrl}`;
        if (rawUrl.startsWith('meter-reading/')) return `${window.location.origin}/${rawUrl}`;
        if (!rawUrl.includes('/')) return `${window.location.origin}/meter-reading/${encodeURIComponent(rawUrl)}`;
        return `${window.location.origin}/${rawUrl}`;
    }

    if (result?.tokenHash || result?.hash) {
        throw new Error('API đang trả token hash nên link không mở được. BE cần trả url hoặc token gốc.');
    }

    const token = result?.token || result?.publicToken;
    if (token) return `${window.location.origin}/meter-reading/${encodeURIComponent(token)}`;

    throw new Error('Máy chủ chưa trả về link công tơ.');
};

const formatExpiresAt = (value) => {
    if (!value) return 'Dùng hàng tháng';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Dùng hàng tháng';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

    const handleCreateMeterLink = async (event, room) => {
        event.stopPropagation();

        try {
            setLinkLoadingRoomId(room.id);
            const result = await api.post('/meter-reading/link', { roomId: room.id });
            const fullUrl = saveMeterLink(room.id, result);
            await copyMeterReadingLink(room, fullUrl);
            showToast?.(`Đã tạo và copy link công tơ phòng ${room.roomCode || room.id}`, 'success');
        } catch (error) {
            showToast?.(error.message || 'Không tạo được link công tơ.', 'error');
        } finally {
            setLinkLoadingRoomId(null);
        }
    };

    const handleCopyMeterLink = async (event, room) => {
        event.stopPropagation();
        const link = meterLinks[room.id]?.url;
        if (!link) {
            await handleCreateMeterLink(event, room);
            return;
        }

        try {
            await copyMeterReadingLink(room, link);
            showToast?.(`Đã copy link công tơ phòng ${room.roomCode || room.id}`, 'success');
        } catch {
            showToast?.('Không copy được link, vui lòng thử lại.', 'error');
        }
    };

    const handleShowMeterLinkQr = async (event, room) => {
        event.stopPropagation();

        try {
            setLinkLoadingRoomId(room.id);
            const link = meterLinks[room.id]?.url || saveMeterLink(room.id, await api.post('/meter-reading/link', { roomId: room.id }));
            setQrLinkInfo({
                url: link,
                label: getRoomLinkLabel(room),
                room,
            });
        } catch (error) {
            showToast?.(error.message || 'Không mở được QR link công tơ.', 'error');
        } finally {
            setLinkLoadingRoomId(null);
        }
    };

    const handleResetMeterLink = async (event, room) => {
        event.stopPropagation();
        const confirmed = await requestConfirm?.({
            title: 'Reset link công tơ',
            message: 'Reset link sẽ làm link cũ không còn truy cập được. Chỉ dùng khi phòng có khách thuê mới hoặc nghi link bị lộ.',
        });
        if (!confirmed) return;

        try {
            setLinkLoadingRoomId(room.id);
            const result = await api.post('/meter-reading/link/reset', { roomId: room.id });
            const fullUrl = saveMeterLink(room.id, result);
            await copyMeterReadingLink(room, fullUrl);
            showToast?.(`Đã reset và copy link mới phòng ${room.roomCode || room.id}`, 'success');
        } catch (error) {
            showToast?.(error.message || 'Không reset được link công tơ.', 'error');
        } finally {
            setLinkLoadingRoomId(null);
        }
    };

    return (
        <div className="space-y-4 pb-20 animate-in slide-in-from-right">
            <div className="grid grid-cols-2 gap-2">
                {currentRooms.length === 0 && (
                    <p className="text-xs text-slate-400 italic mt-5 col-span-2 text-center">
                        Chưa có phòng nào. Bấm Thêm phòng mới bên dưới.
                    </p>
                )}

                {currentRooms.map(room => {
                    const payDays = getDueInfo(room.paymentDate)?.daysLeft || 0;
                    const contractEndDate = endContract(room.contractStart, room.months);
                    const endDays = diffDays(contractEndDate);
                    const isPayUrgent = room.status === 'full' && payDays <= 3;
                    const isPaySoon = room.status === 'full' && payDays > 3 && payDays <= 7;
                    const showContractWarning = room.status === 'full' && contractEndDate && endDays <= 30;
                    const hId = highlightedItemId ? String(highlightedItemId) : null;
                    const isHighlighted = hId && (String(room.id) === hId || String(room.roomCode) === hId);
                    const roomLink = meterLinks[room.id];
                    const isLinkLoading = linkLoadingRoomId === room.id;

                    let cardStyle = room.status !== 'full'
                        ? 'bg-white/70 border-dashed border-slate-200 opacity-75'
                        : isPayUrgent
                            ? 'bg-red-50 border-red-200 shadow-red-100'
                            : isPaySoon
                                ? 'bg-amber-50 border-amber-200 shadow-amber-100'
                                : 'bg-white border-slate-200 shadow-slate-100';
                    if (isHighlighted) cardStyle += ' border-red-500 shadow-red-200 animate-pulse bg-red-50 ring-2 ring-red-200';

                    const roomBadgeStyle = room.status !== 'full'
                        ? 'bg-slate-200 text-slate-600'
                        : isPayUrgent
                            ? 'bg-red-600 text-white'
                            : isPaySoon
                                ? 'bg-amber-500 text-white'
                                : 'bg-blue-600 text-white';
                    const payColor = isPayUrgent ? 'bg-red-100 text-red-700 border-red-200' : isPaySoon ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    const endColor = endDays <= 7 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';

                    return (
                        <div
                            id={`room-card-${room.id}`}
                            key={room.id}
                            onClick={() => { if (isHighlighted && setHighlightedItemId) setHighlightedItemId(null); }}
                            className={`p-3 rounded-xl border-2 shadow-sm relative transition-all flex flex-col active:scale-[0.99] ${cardStyle}`}
                        >
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`px-2 py-0.5 rounded-md font-black text-[10px] shadow-sm ${roomBadgeStyle}`}>
                                    {room.roomType === 'mbkd' ? 'MBKD ' : 'P.'}{room.roomCode || room.id} {room.status === 'empty' ? '- TRỐNG' : ''}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setEditingRoom(room); setIsAddRoomModalOpen(true); }}
                                    className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:border-blue-600 hover:text-white active:scale-95 transition-all shadow-sm"
                                >
                                    <LucideEdit className="w-3 h-3" />
                                </button>
                            </div>

                            <p className={`text-[14px] font-black leading-none mb-2 ${isPayUrgent ? 'text-red-700' : isPaySoon ? 'text-amber-700' : 'text-blue-800'}`}>
                                {formatN(room.price)}
                            </p>

                            {room.status === 'full' && (
                                <div className="space-y-1.5 border-t border-slate-200/70 pt-2 flex-1">
                                    <div className="flex justify-between items-center text-[8px] font-bold uppercase gap-2">
                                        <span className="text-slate-500 flex items-center"><CreditCard className="w-3 h-3 mr-1 text-blue-600" /> Đóng tiền</span>
                                        <span className={`px-1.5 py-0.5 rounded-md border text-center font-black ${payColor}`}>Còn {payDays > 0 ? payDays : 0} ngày</span>
                                    </div>
                                    {showContractWarning && (
                                        <div className="flex justify-between items-center text-[8px] font-bold uppercase gap-2">
                                            <span className="text-slate-500 flex items-center"><Calendar className="w-3 h-3 mr-1 text-amber-600" /> Hợp đồng</span>
                                            <span className={`px-1.5 py-0.5 rounded-md border text-center font-black ${endColor}`}>Còn {endDays > 0 ? endDays : 0} ngày</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 pt-2">
                                <div className="flex items-center text-slate-600 font-bold text-[9px] bg-white/70 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                    <Users2 className="w-3 h-3 mr-1 text-blue-600" />{room.peopleCount ?? room.people ?? 0} người
                                </div>
                                {room.eBikeCount > 0 && (
                                    <div className="flex items-center text-slate-600 font-bold text-[9px] bg-white/70 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                        <Bike className="w-3 h-3 mr-1 text-amber-600" />{room.eBikeCount ?? room.ebikes ?? 0} xe điện
                                    </div>
                                )}
                            </div>

                            {isManagerOrAbove && (
                                <div className="mt-2 border-t border-slate-200/70 pt-2">
                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-blue-600">Link chụp công tơ</p>
                                            <p className="truncate text-[8px] font-semibold text-slate-400">
                                                {roomLink?.url || 'Chưa tạo link cố định'}
                                            </p>
                                        </div>
                                        {roomLink?.url && (
                                            <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[7px] font-black uppercase text-emerald-700">
                                                {formatExpiresAt(roomLink.expiresAt)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={(event) => roomLink?.url ? handleCopyMeterLink(event, room) : handleCreateMeterLink(event, room)}
                                            disabled={isLinkLoading}
                                            className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-[8px] font-black uppercase text-white active:scale-95 disabled:opacity-60"
                                        >
                                            {isLinkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : roomLink?.url ? <Copy className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                            {roomLink?.url ? 'Copy link' : 'Tạo link'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => handleShowMeterLinkQr(event, room)}
                                            disabled={isLinkLoading}
                                            className="flex items-center justify-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-2 text-[8px] font-black uppercase text-emerald-700 active:scale-95 disabled:opacity-60"
                                        >
                                            <QrCode className="h-3 w-3" />
                                            QR
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => handleResetMeterLink(event, room)}
                                            disabled={isLinkLoading}
                                            className="flex items-center justify-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-2 text-[8px] font-black uppercase text-red-700 active:scale-95 disabled:opacity-60"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            )}
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
                onCopy={() => qrLinkInfo && copyMeterReadingLink(qrLinkInfo.room, qrLinkInfo.url)}
            />
        </div>
    );
};

export default RoomsView;
