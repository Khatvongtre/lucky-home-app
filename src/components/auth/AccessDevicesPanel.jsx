import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  Laptop,
  Loader2,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';

const DEVICE_PAGE_SIZE = 4;
const LOG_PAGE_SIZE = 5;
let accessDataCache = null;
let accessDataInFlight = null;

const actionLabels = {
  login_success: 'Đăng nhập thành công',
  login_failed: 'Đăng nhập thất bại',
  revoked: 'Thu hồi thiết bị',
};

const actionStyles = {
  login_success: {
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  login_failed: {
    icon: XCircle,
    dot: 'bg-red-500',
    iconClass: 'bg-red-50 text-red-600 border-red-100',
    badgeClass: 'bg-red-50 text-red-700 border-red-100',
  },
  revoked: {
    icon: ShieldCheck,
    dot: 'bg-amber-500',
    iconClass: 'bg-amber-50 text-amber-700 border-amber-100',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-100',
  },
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.devices)) return value.devices;
  if (Array.isArray(value?.logs)) return value.logs;
  return [];
};

const formatVietnamTime = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const normalizeIpAddress = (value) => {
  const ipAddress = String(value || '').trim();
  if (!ipAddress) return '-';
  return ipAddress.split(',')[0].trim() || ipAddress;
};

const getIpVersion = (value) => {
  const ipAddress = normalizeIpAddress(value);
  if (ipAddress === '-') return 'IP';
  return ipAddress.includes(':') ? 'IPv6' : 'IPv4';
};

const formatIpAddress = (value) => {
  const ipAddress = normalizeIpAddress(value);
  if (ipAddress === '-' || !ipAddress.includes(':')) return ipAddress;

  const parts = ipAddress.split(':').filter(Boolean);
  if (parts.length <= 4) return ipAddress;
  return `${parts.slice(0, 4).join(':')}...`;
};

const getDeviceTitle = (device) => (
  device.deviceName
  || [device.browser, device.operatingSystem].filter(Boolean).join(' trên ')
  || 'Thiết bị không xác định'
);

const getDeviceDescription = (device) => {
  const browserOs = [device.browser, device.operatingSystem].filter(Boolean).join(' / ');
  return browserOs || device.deviceType || 'Không rõ nền tảng';
};

const getDeviceTone = (device) => {
  if (device.isRevoked) {
    return {
      iconClass: 'text-red-600',
      cardClass: 'border-red-100 bg-white',
    };
  }
  if (device.isCurrent) {
    return {
      iconClass: 'text-blue-600',
      cardClass: 'border-blue-100 bg-white',
    };
  }
  if (device.isTrusted) {
    return {
      iconClass: 'text-emerald-600',
      cardClass: 'border-emerald-100 bg-white',
    };
  }
  return {
    iconClass: 'text-slate-500',
    cardClass: 'border-slate-100 bg-white',
  };
};

const StatusBadge = ({ children, className }) => (
  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black leading-none ${className}`}>
    {children}
  </span>
);

const IpValue = ({ value }) => {
  const fullIp = normalizeIpAddress(value);
  const ipVersion = getIpVersion(fullIp);

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700" title={fullIp}>
      <span className="shrink-0 text-[9px] font-black text-slate-400">{ipVersion}</span>
      <span className="min-w-0 truncate font-mono leading-none">{formatIpAddress(fullIp)}</span>
    </span>
  );
};

const InfoLine = ({ icon: Icon, label, value }) => (
  <div className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500">
    <Icon className="h-3 w-3 shrink-0 text-slate-400" />
    {label && <span className="shrink-0">{label}</span>}
    <span className="min-w-0 truncate text-slate-800">{value || '-'}</span>
  </div>
);

const EmptyState = ({ icon: Icon = History, title, children }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400">
      {React.createElement(Icon, { className: 'w-5 h-5' })}
    </div>
    <h5 className="text-xs font-black text-slate-700">{title}</h5>
    {children && <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-400">{children}</p>}
  </div>
);

const requestAccessData = async ({ force = false } = {}) => {
  if (!force && accessDataCache) return accessDataCache;
  if (accessDataInFlight) return accessDataInFlight;

  const request = Promise.all([
    api.get('/auth/devices'),
    api.get('/auth/access-logs?take=50'),
  ])
    .then(([deviceResult, logResult]) => {
      const nextData = {
        devices: normalizeList(deviceResult),
        logs: normalizeList(logResult),
      };
      accessDataCache = nextData;
      return nextData;
    })
    .finally(() => {
      accessDataInFlight = null;
    });

  accessDataInFlight = request;
  return request;
};

const AccessDevicesPanel = ({ requestConfirm, showToast }) => {
  const [activeTab, setActiveTab] = useState('devices');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [visibleDeviceCount, setVisibleDeviceCount] = useState(DEVICE_PAGE_SIZE);
  const [visibleLogCount, setVisibleLogCount] = useState(LOG_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const deviceListRef = useRef(null);
  const deviceLoadMoreRef = useRef(null);
  const logListRef = useRef(null);
  const logLoadMoreRef = useRef(null);

  const loadAccessData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [deviceResult, logResult] = await Promise.all([
        api.get('/auth/devices'),
        api.get('/auth/access-logs?take=50'),
      ]);
      setDevices(normalizeList(deviceResult));
      setLogs(normalizeList(logResult));
      setVisibleDeviceCount(DEVICE_PAGE_SIZE);
      setVisibleLogCount(LOG_PAGE_SIZE);
    } catch (error) {
      showToast?.(error.message || 'Không thể tải thông tin thiết bị', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isCollapsed || hasLoaded) return undefined;
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [deviceResult, logResult] = await Promise.all([
          api.get('/auth/devices'),
          api.get('/auth/access-logs?take=50'),
        ]);
        if (!isMounted) return;
        setDevices(normalizeList(deviceResult));
        setLogs(normalizeList(logResult));
        setVisibleDeviceCount(DEVICE_PAGE_SIZE);
        setVisibleLogCount(LOG_PAGE_SIZE);
        setHasLoaded(true);
      } catch (error) {
        if (isMounted) showToast?.(error.message || 'Không thể tải thông tin thiết bị', 'error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [hasLoaded, isCollapsed, showToast]);

  const revokeDevice = useCallback(async (device) => {
    if (!device?.id || device.isCurrent || device.isRevoked) return;

    const confirmed = await requestConfirm?.({
      title: 'Thu hồi thiết bị?',
      message: `Thiết bị "${getDeviceTitle(device)}" sẽ bị đăng xuất khỏi tài khoản này.`,
      confirmText: 'Thu hồi',
    });
    if (!confirmed) return;

    setActionId(device.id);
    try {
      await api.delete(`/auth/devices/${device.id}`);
      showToast?.('Đã thu hồi thiết bị', 'success');
      await loadAccessData();
    } catch (error) {
      showToast?.(error.message || 'Không thể thu hồi thiết bị', 'error');
    } finally {
      setActionId('');
    }
  }, [loadAccessData, requestConfirm, showToast]);

  const revokeOtherDevices = useCallback(async () => {
    const confirmed = await requestConfirm?.({
      title: 'Thu hồi thiết bị khác?',
      message: 'Tất cả thiết bị khác sẽ bị đăng xuất, thiết bị hiện tại vẫn được giữ lại.',
      confirmText: 'Thu hồi',
    });
    if (!confirmed) return;

    setActionId('others');
    try {
      await api.delete('/auth/devices/others');
      showToast?.('Đã thu hồi các thiết bị khác', 'success');
      await loadAccessData();
    } catch (error) {
      showToast?.(error.message || 'Không thể thu hồi thiết bị khác', 'error');
    } finally {
      setActionId('');
    }
  }, [loadAccessData, requestConfirm, showToast]);

  const activeDevices = useMemo(
    () => devices.filter(device => !device.isRevoked).length,
    [devices],
  );
  const hasRevokableDevice = useMemo(
    () => devices.some(device => !device.isCurrent && !device.isRevoked),
    [devices],
  );
  const visibleDevices = useMemo(
    () => devices.slice(0, visibleDeviceCount),
    [devices, visibleDeviceCount],
  );
  const hasMoreDevices = visibleDeviceCount < devices.length;
  const visibleLogs = useMemo(
    () => logs.slice(0, visibleLogCount),
    [logs, visibleLogCount],
  );
  const hasMoreLogs = visibleLogCount < logs.length;

  const handleTabClick = useCallback((tab) => {
    if (activeTab === tab) {
      setIsCollapsed(value => !value);
      return;
    }

    setActiveTab(tab);
    setIsCollapsed(false);
  }, [activeTab]);

  const loadMoreDevices = useCallback(() => {
    setVisibleDeviceCount(count => Math.min(count + DEVICE_PAGE_SIZE, devices.length));
  }, [devices.length]);

  const loadMoreLogs = useCallback(() => {
    setVisibleLogCount(count => Math.min(count + LOG_PAGE_SIZE, logs.length));
  }, [logs.length]);

  const handleDeviceScroll = useCallback((event) => {
    if (!hasMoreDevices) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight <= 48) {
      loadMoreDevices();
    }
  }, [hasMoreDevices, loadMoreDevices]);

  useEffect(() => {
    if (activeTab !== 'devices' || !hasMoreDevices || !deviceLoadMoreRef.current) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      loadMoreDevices();
    }, {
      root: deviceListRef.current,
      rootMargin: '0px 0px 72px',
    });

    observer.observe(deviceLoadMoreRef.current);
    return () => observer.disconnect();
  }, [activeTab, hasMoreDevices, loadMoreDevices]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsCollapsed(value => !value)}
        aria-expanded={!isCollapsed}
        className="flex w-full items-center justify-between bg-blue-600 px-5 py-4 text-left transition-colors duration-[180ms] hover:bg-blue-700"
      >
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Quản lý phiên đăng nhập</h4>
        {isCollapsed ? <ChevronDown className="h-4 w-4 shrink-0 text-white" /> : <ChevronUp className="h-4 w-4 shrink-0 text-white" />}
      </button>

      {!isCollapsed && (
        <div className="bg-[#f8fafc] p-3">
          <div className="mb-3 grid h-10 grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => handleTabClick('devices')}
            aria-expanded={activeTab === 'devices' && !isCollapsed}
            className={`flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-black transition-all duration-[180ms] active:scale-[0.98] ${activeTab === 'devices' ? 'bg-white text-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.04)]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Laptop className="h-3.5 w-3.5" />
            Thiết bị
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('logs')}
            aria-expanded={activeTab === 'logs' && !isCollapsed}
            className={`flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-black transition-all duration-[180ms] active:scale-[0.98] ${activeTab === 'logs' ? 'bg-white text-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.04)]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <History className="h-3.5 w-3.5" />
            Lịch sử
          </button>
          </div>

          {activeTab === 'devices' && (
            <div className="flex h-[420px] min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="min-w-0 truncate text-sm font-black text-slate-950">Thiết bị đang đăng nhập</h4>
              <button
                type="button"
                onClick={revokeOtherDevices}
                disabled={!hasRevokableDevice || actionId === 'others'}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] px-2.5 py-2 text-[10px] font-black text-white shadow-[0_4px_12px_rgba(37,99,235,0.18)] transition-all duration-[180ms] hover:bg-blue-700 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {actionId === 'others' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                Thu hồi thiết bị khác
              </button>
            </div>

            {!isLoading && devices.length === 0 && (
              <EmptyState icon={Laptop} title="Chưa có thiết bị">
                Các thiết bị đăng nhập sẽ hiển thị tại đây.
              </EmptyState>
            )}

            <div
              ref={deviceListRef}
              onScroll={handleDeviceScroll}
              className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 no-scrollbar"
            >
              {visibleDevices.map(device => {
                const tone = getDeviceTone(device);
                const isDisabled = device.isCurrent || device.isRevoked || actionId === device.id;

                return (
                  <article
                    key={device.id || device.deviceId}
                    className={`min-h-[96px] rounded-xl border px-3 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-[180ms] hover:border-slate-300 hover:bg-white active:scale-[0.995] ${tone.cardClass}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 ${tone.iconClass}`}>
                        <Laptop className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <h5 className="min-w-0 truncate text-[14px] font-black leading-5 text-slate-950">{getDeviceTitle(device)}</h5>
                              {device.isCurrent && <StatusBadge className="bg-blue-50 text-[#2563eb]">Hiện tại</StatusBadge>}
                              {device.isRevoked && <StatusBadge className="bg-red-50 text-red-600">Đã thu hồi</StatusBadge>}
                              {device.isTrusted && <StatusBadge className="bg-emerald-50 text-emerald-700">Tin cậy</StatusBadge>}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-semibold leading-4 text-slate-500">{getDeviceDescription(device)}</p>
                          </div>
                        </div>

                        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                          <IpValue value={device.ipAddress} />
                          <InfoLine icon={Clock3} value={formatVietnamTime(device.lastLoginAt || device.lastActivityAt)} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => revokeDevice(device)}
                        disabled={isDisabled}
                        className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full text-slate-400 transition-all duration-[180ms] hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:text-slate-300"
                        title="Thu hồi thiết bị"
                      >
                        {actionId === device.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </article>
                );
              })}

              {hasMoreDevices && (
                <div ref={deviceLoadMoreRef} className="flex h-10 items-center justify-center">
                  <button
                    type="button"
                    onClick={loadMoreDevices}
                    className="rounded-lg bg-white px-3 py-2 text-[10px] font-black text-slate-500 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-[180ms] hover:text-[#2563eb] active:scale-[0.98]"
                  >
                    Xem thêm thiết bị
                  </button>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex h-[420px] min-h-0 flex-col">
            <h4 className="mb-2 text-sm font-black text-slate-950">Lịch sử đăng nhập</h4>

            {!isLoading && logs.length === 0 && (
              <EmptyState icon={History} title="Chưa có lịch sử">
                Lịch sử đăng nhập và thu hồi thiết bị sẽ hiển thị tại đây.
              </EmptyState>
            )}

            <div
              ref={logListRef}
              className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-white px-3 pr-2 no-scrollbar"
            >
              {visibleLogs.map((log, index) => {
                const meta = actionStyles[log.action] || {
                  icon: AlertTriangle,
                  dot: 'bg-slate-400',
                  iconClass: 'bg-slate-50 text-slate-600 border-slate-100',
                  badgeClass: 'bg-slate-50 text-slate-700 border-slate-100',
                };
                const ActionIcon = meta.icon;
                const isLastVisible = index === visibleLogs.length - 1 && !hasMoreLogs;

                return (
                  <article
                    key={log.id || `${log.createdAt}-${index}`}
                    className={`flex min-h-[66px] min-w-0 items-center gap-2.5 py-2.5 transition-colors duration-[180ms] hover:bg-slate-50 ${isLastVisible ? '' : 'border-b border-[#e5e7eb]'}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${log.action === 'login_success' ? 'bg-emerald-50 text-[#16a34a]' : log.action === 'login_failed' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black leading-none ${meta.badgeClass}`}>
                          {actionLabels[log.action] || log.action || 'Hoạt động'}
                        </span>
                        <h5 className="min-w-0 truncate text-[13px] font-black leading-5 text-slate-950">
                          {log.deviceName || 'Thiết bị không xác định'}
                        </h5>
                      </div>
                      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-bold text-slate-500">
                        <span className="shrink-0">{formatVietnamTime(log.createdAt)}</span>
                        <span className="text-slate-300">•</span>
                        <IpValue value={log.ipAddress} />
                      </div>
                    </div>
                  </article>
                );
              })}

              {hasMoreLogs && (
                <div ref={logLoadMoreRef} className="flex h-10 items-center justify-center">
                  <button
                    type="button"
                    onClick={loadMoreLogs}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-500 transition-all duration-[180ms] hover:text-[#2563eb] active:scale-[0.98]"
                  >
                    Xem thêm lịch sử
                  </button>
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AccessDevicesPanel;
