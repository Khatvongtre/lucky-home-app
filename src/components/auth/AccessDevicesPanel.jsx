import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  History,
  Laptop,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';

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

const getDeviceTitle = (device) => (
  device.deviceName
  || [device.browser, device.operatingSystem].filter(Boolean).join(' trên ')
  || 'Thiết bị không xác định'
);

const getDeviceDescription = (device) => {
  const browserOs = [device.browser, device.operatingSystem].filter(Boolean).join(' / ');
  return browserOs || device.deviceType || '-';
};

const getDeviceTone = (device) => {
  if (device.isRevoked) {
    return {
      iconClass: 'bg-red-50 text-red-600 border-red-100',
      ringClass: 'border-red-100 bg-red-50/50',
    };
  }
  if (device.isCurrent) {
    return {
      iconClass: 'bg-blue-50 text-blue-600 border-blue-100',
      ringClass: 'border-blue-100 bg-blue-50/50',
    };
  }
  if (device.isTrusted) {
    return {
      iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      ringClass: 'border-emerald-100 bg-emerald-50/40',
    };
  }
  return {
    iconClass: 'bg-slate-50 text-slate-600 border-slate-100',
    ringClass: 'border-slate-100 bg-white',
  };
};

const StatusBadge = ({ children, className }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${className}`}>
    {children}
  </span>
);

const MetricPill = ({ icon: Icon, label, value }) => (
  <div className="min-w-0 rounded-lg border border-slate-100 bg-white px-3 py-2">
    <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">
      {React.createElement(Icon, { className: 'w-3 h-3' })}
      {label}
    </div>
    <p className="mt-1 text-[11px] font-bold leading-snug text-slate-700 break-words">{value || '-'}</p>
  </div>
);

const EmptyState = ({ icon: Icon = History, title, children }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400">
      {React.createElement(Icon, { className: 'w-5 h-5' })}
    </div>
    <h5 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h5>
    {children && <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-400">{children}</p>}
  </div>
);

const AccessDevicesPanel = ({ requestConfirm, showToast }) => {
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState('');

  const loadAccessData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [deviceResult, logResult] = await Promise.all([
        api.get('/auth/devices'),
        api.get('/auth/access-logs?take=50'),
      ]);
      setDevices(normalizeList(deviceResult));
      setLogs(normalizeList(logResult));
    } catch (error) {
      showToast?.(error.message || 'Không thể tải thông tin thiết bị', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
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
  }, [showToast]);

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

  return (
    <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-[10px] font-black uppercase tracking-widest">Thiết bị truy cập</h4>
            <p className="mt-1 text-[10px] font-bold leading-relaxed text-slate-300">
              Theo dõi phiên đăng nhập, IP và hoạt động bảo mật gần đây.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAccessData}
            disabled={isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition-all active:scale-95 disabled:opacity-60"
            title="Làm mới"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tổng</p>
            <p className="mt-1 text-lg font-black leading-none">{devices.length}</p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Đang dùng</p>
            <p className="mt-1 text-lg font-black leading-none">{activeDevices}</p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Log</p>
            <p className="mt-1 text-lg font-black leading-none">{logs.length}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`flex items-center justify-center gap-2 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'devices' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
          >
            <Laptop className="h-3.5 w-3.5" />
            Thiết bị
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center justify-center gap-2 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
          >
            <History className="h-3.5 w-3.5" />
            Lịch sử
          </button>
        </div>

        {activeTab === 'devices' && (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={revokeOtherDevices}
              disabled={!hasRevokableDevice || actionId === 'others'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400"
            >
              {actionId === 'others' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Thu hồi các thiết bị khác
            </button>

            {!isLoading && devices.length === 0 && (
              <EmptyState icon={Laptop} title="Chưa có thiết bị">
                Các thiết bị đăng nhập sẽ hiển thị tại đây.
              </EmptyState>
            )}

            {devices.map(device => {
              const tone = getDeviceTone(device);
              const isDisabled = device.isCurrent || device.isRevoked || actionId === device.id;

              return (
                <article key={device.id || device.deviceId} className={`rounded-xl border p-4 ${tone.ringClass}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone.iconClass}`}>
                      <Laptop className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h5 className="truncate text-sm font-black text-slate-950">{getDeviceTitle(device)}</h5>
                          <p className="mt-1 text-[10px] font-bold text-slate-500">{getDeviceDescription(device)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => revokeDevice(device)}
                          disabled={isDisabled}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition-all active:scale-95 disabled:border-slate-100 disabled:text-slate-300"
                          title="Thu hồi thiết bị"
                        >
                          {actionId === device.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {device.isCurrent && <StatusBadge className="border-blue-100 bg-blue-50 text-blue-700">Thiết bị hiện tại</StatusBadge>}
                        {device.isRevoked && <StatusBadge className="border-red-100 bg-red-50 text-red-700">Đã thu hồi</StatusBadge>}
                        {device.isTrusted && <StatusBadge className="border-emerald-100 bg-emerald-50 text-emerald-700">Tin cậy</StatusBadge>}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <MetricPill icon={MapPin} label="IP gần nhất" value={device.ipAddress || '-'} />
                        <MetricPill icon={CalendarDays} label="Lần đầu thấy" value={formatVietnamTime(device.firstSeenAt)} />
                        <MetricPill icon={Clock3} label="Đăng nhập gần nhất" value={formatVietnamTime(device.lastLoginAt)} />
                        <MetricPill icon={Globe2} label="Hoạt động gần nhất" value={formatVietnamTime(device.lastActivityAt)} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="mt-4">
            {!isLoading && logs.length === 0 && (
              <EmptyState icon={History} title="Chưa có lịch sử">
                Lịch sử đăng nhập và thu hồi thiết bị sẽ hiển thị tại đây.
              </EmptyState>
            )}

            <div className="space-y-3">
              {logs.map((log, index) => {
                const meta = actionStyles[log.action] || {
                  icon: AlertTriangle,
                  dot: 'bg-slate-400',
                  iconClass: 'bg-slate-50 text-slate-600 border-slate-100',
                  badgeClass: 'bg-slate-50 text-slate-700 border-slate-100',
                };
                const ActionIcon = meta.icon;

                return (
                  <article key={log.id || `${log.createdAt}-${index}`} className="relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.iconClass}`}>
                          <ActionIcon className="h-5 w-5" />
                        </div>
                        <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${meta.dot}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <StatusBadge className={meta.badgeClass}>
                              {actionLabels[log.action] || log.action || 'Hoạt động'}
                            </StatusBadge>
                            <h5 className="mt-2 truncate text-sm font-black text-slate-950">
                              {log.deviceName || 'Thiết bị không xác định'}
                            </h5>
                          </div>
                          <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[9px] font-black text-slate-500">
                            <Clock3 className="h-3 w-3" />
                            {formatVietnamTime(log.createdAt)}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <MetricPill icon={MapPin} label="IP" value={log.ipAddress || '-'} />
                          <MetricPill icon={Globe2} label="User agent" value={log.userAgent || '-'} />
                        </div>

                        {log.metadataJson && (
                          <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <summary className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-slate-500">
                              Debug metadata
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] font-mono text-slate-600">{log.metadataJson}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AccessDevicesPanel;
