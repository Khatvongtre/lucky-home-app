import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, Circle, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

const parseMetadata = (metadataJson) => {
  if (!metadataJson) return {};
  if (typeof metadataJson === 'object') return metadataJson;

  try {
    return JSON.parse(metadataJson);
  } catch {
    return {};
  }
};

const formatNotificationTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const buildNotificationQuery = ({ houseId, unreadOnly, take }) => {
  const params = new URLSearchParams();
  if (houseId) params.set('houseId', houseId);
  if (typeof unreadOnly === 'boolean') params.set('unreadOnly', String(unreadOnly));
  if (take) params.set('take', String(take));
  const query = params.toString();
  return `/notifications${query ? `?${query}` : ''}`;
};

const parseNavigateTarget = (navigateTo = '') => {
  const safeTarget = navigateTo || '';
  const [path, queryString = ''] = safeTarget.split('?');
  const query = new URLSearchParams(queryString);
  const parts = path.split('/').filter(Boolean);

  return {
    tab: parts[0] || '',
    houseId: parts[1] || query.get('houseId') || '',
    year: Number(query.get('year')) || null,
    month: Number(query.get('month')) || null,
  };
};

const NotificationBell = ({
  selectedHouse,
  houses = [],
  setSelectedHouse,
  setConfig,
  setIsHubMode,
  setActiveTab,
  setHighlightedItemId,
  setViewDate,
  buttonClassName = 'w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95 transition-all',
  panelAlign,
}) => {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const houseId = selectedHouse?.id || '';
  const hasUnread = unreadCount > 0;

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setIsLoading(true);
      setError('');
      const result = await api.get(buildNotificationQuery({ houseId, unreadOnly: false, take: 20 }));
      setUnreadCount(Number(result?.unreadCount) || 0);
      setNotifications(Array.isArray(result?.notifications) ? result.notifications : []);
      setHasLoaded(true);
    } catch (loadError) {
      setError(loadError.message || 'Không tải được thông báo.');
    } finally {
      setIsLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    loadNotifications({ silent: true });
  }, [loadNotifications]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navigateToNotification = useCallback((notification) => {
    const metadata = parseMetadata(notification.metadataJson);
    const target = parseNavigateTarget(notification.navigateTo);
    const targetHouseId = notification.houseId || target.houseId || metadata.houseId;
    const targetHouse = houses.find(house => String(house.id) === String(targetHouseId));

    if (targetHouse) {
      setSelectedHouse?.(targetHouse);
      setConfig?.({ ...targetHouse });
    } else if (selectedHouse) {
      setSelectedHouse?.(selectedHouse);
      setConfig?.({ ...selectedHouse });
    }

    if (target.month && target.year) {
      setViewDate?.(new Date(target.year, target.month - 1, 1));
    }

    setIsHubMode?.(false);
    setActiveTab?.(target.tab === 'bills' ? 'bills' : (target.tab || 'dashboard'));
    setHighlightedItemId?.(metadata.billId || notification.billId || metadata.roomId || notification.roomId || metadata.targetId || notification.id);
  }, [houses, selectedHouse, setActiveTab, setConfig, setHighlightedItemId, setIsHubMode, setSelectedHouse, setViewDate]);

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !hasLoaded) await loadNotifications();
    if (nextOpen && hasLoaded) loadNotifications({ silent: true });
  };

  const markReadLocally = (notificationId) => {
    setNotifications(prev => prev.map(item => (
      item.id === notificationId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
    )));
    setUnreadCount(prev => Math.max(prev - 1, 0));
  };

  const handleNotificationClick = async (notification) => {
    const wasUnread = !notification.isRead;
    if (wasUnread) markReadLocally(notification.id);
    setIsOpen(false);
    navigateToNotification(notification);

    if (!wasUnread) return;

    try {
      await api.post(`/notifications/${notification.id}/read`);
    } catch {
      await loadNotifications({ silent: true });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
      const query = houseId ? `?houseId=${encodeURIComponent(houseId)}` : '';
      await api.post(`/notifications/read-all${query}`);
      await loadNotifications({ silent: true });
    } catch (markError) {
      setError(markError.message || 'Không đánh dấu được thông báo.');
      await loadNotifications({ silent: true });
    }
  };

  const panelTitle = useMemo(() => (
    houseId ? 'Thông báo cơ sở' : 'Thông báo hệ thống'
  ), [houseId]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`${buttonClassName} relative`}
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black leading-[18px] text-center border border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`fixed left-1/2 top-16 z-[700] w-[calc(100vw-24px)] max-w-[360px] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl ${panelAlign || ''}`}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-900">{panelTitle}</p>
              <p className="text-[11px] font-semibold text-slate-500">{unreadCount} thông báo chưa đọc</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => loadNotifications()}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                aria-label="Tải lại thông báo"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-emerald-600 active:scale-95 disabled:opacity-40"
                aria-label="Đánh dấu tất cả đã đọc"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto no-scrollbar">
            {error && (
              <div className="m-3 rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">
                {error}
              </div>
            )}

            {isLoading && notifications.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-10 text-xs font-bold text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải thông báo
              </div>
            )}

            {!isLoading && notifications.length === 0 && !error && (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-sm font-black text-slate-700">Chưa có thông báo</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Các cập nhật mới sẽ xuất hiện tại đây.</p>
              </div>
            )}

            {notifications.map(notification => {
              const unread = !notification.isRead;
              const metadata = parseMetadata(notification.metadataJson);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-all last:border-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none ${
                    unread ? 'bg-blue-50/60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${unread ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {unread ? <Circle className="w-2.5 h-2.5 fill-current" /> : <CheckCheck className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[12px] leading-snug ${unread ? 'font-black text-slate-950' : 'font-bold text-slate-700'}`}>
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-[9px] font-bold text-slate-400">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
                        {notification.message}
                      </p>
                      {(metadata.roomCode || metadata.period || metadata.total) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {metadata.roomCode && <span className="rounded-md bg-white px-2 py-1 text-[9px] font-black uppercase text-blue-700 ring-1 ring-blue-100">Phòng {metadata.roomCode}</span>}
                          {metadata.period && <span className="rounded-md bg-white px-2 py-1 text-[9px] font-black uppercase text-slate-500 ring-1 ring-slate-100">{metadata.period}</span>}
                          {metadata.total && <span className="rounded-md bg-white px-2 py-1 text-[9px] font-black uppercase text-emerald-700 ring-1 ring-emerald-100">{Number(metadata.total).toLocaleString('vi-VN')} đ</span>}
                        </div>
                      )}
                      {metadata.imageUrl ? (
                        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <img src={metadata.imageUrl} alt="Ảnh minh chứng" className="max-h-32 w-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
