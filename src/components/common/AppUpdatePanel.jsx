import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, Loader2, RefreshCw, Smartphone, X } from 'lucide-react';

const APP_VARIANT = import.meta.env.VITE_APP_VARIANT || 'home';
const CURRENT_BUILD_NUMBER = Number(import.meta.env.VITE_APP_BUILD_NUMBER || 0);
const CURRENT_BUILD_DATE = import.meta.env.VITE_APP_BUILD_DATE || '';
const UPDATE_RELEASE_API_URL = import.meta.env.VITE_APP_UPDATE_RELEASE_API_URL
  || 'https://api.github.com/repos/Khatvongtre/lucky-home-app/releases/tags/android-latest';

let releaseCache = null;
let releaseInFlight = null;

const formatBuildDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const openDownload = (url) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const extractReleaseField = (body, label) => {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, 'im');
  const matched = String(body || '').match(pattern);
  return matched?.[1]?.trim() || '';
};

const buildManifestFromRelease = (releaseData) => {
  const assets = Array.isArray(releaseData?.assets) ? releaseData.assets : [];
  const apkAsset = assets.find(asset => asset?.name === 'lucky-home.apk');
  if (!apkAsset?.browser_download_url) {
    throw new Error('Chưa có file APK cho bản app này.');
  }

  const buildNumber = Number(extractReleaseField(releaseData?.body, 'Build')) || 0;
  const generatedAt = extractReleaseField(releaseData?.body, 'Generated at') || releaseData?.published_at || '';

  return {
    buildNumber,
    generatedAt,
    variants: {
      [APP_VARIANT]: {
        label: 'Lucky Home',
        apkName: apkAsset.name,
        downloadUrl: apkAsset.browser_download_url,
      },
    },
  };
};

const requestLatestRelease = async ({ force = false } = {}) => {
  if (!force && releaseCache) return releaseCache;
  if (releaseInFlight) return releaseInFlight;

  const request = (async () => {
    const separator = UPDATE_RELEASE_API_URL.includes('?') ? '&' : '?';
    const response = await fetch(`${UPDATE_RELEASE_API_URL}${separator}t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });
    if (!response.ok) throw new Error(`Không tải được thông tin cập nhật (${response.status}).`);

    const releaseData = await response.json();
    const manifest = buildManifestFromRelease(releaseData);
    const release = manifest?.variants?.[APP_VARIANT];
    if (!release?.downloadUrl) throw new Error('Chưa có file APK cho bản app này.');

    const nextValue = { manifest, release };
    releaseCache = nextValue;
    return nextValue;
  })().finally(() => {
    releaseInFlight = null;
  });

  releaseInFlight = request;
  return request;
};

const getUpdateAvailability = ({ manifest } = {}) => {
  const latestBuildNumber = Number(manifest?.buildNumber || 0);
  const isBuildKnown = CURRENT_BUILD_NUMBER > 0;
  const hasPublishedBuild = latestBuildNumber > 0;
  const hasNewerBuild = hasPublishedBuild && (!isBuildKnown || latestBuildNumber > CURRENT_BUILD_NUMBER);

  return {
    latestBuildNumber,
    isBuildKnown,
    hasPublishedBuild,
    hasNewerBuild,
  };
};

export const AppUpdateNotice = ({ enabled = true }) => {
  const [notice, setNotice] = React.useState({
    visible: false,
    checking: false,
    manifest: null,
    release: null,
  });
  const isNativeAndroid = Capacitor.getPlatform() === 'android';

  React.useEffect(() => {
    if (!enabled || !isNativeAndroid) return undefined;

    let cancelled = false;
    setNotice(prev => ({ ...prev, checking: true }));

    requestLatestRelease()
      .then(nextValue => {
        if (cancelled) return;
        const availability = getUpdateAvailability({ manifest: nextValue?.manifest });
        setNotice({
          visible: Boolean(availability.hasNewerBuild && nextValue?.release?.downloadUrl),
          checking: false,
          manifest: nextValue?.manifest || null,
          release: nextValue?.release || null,
        });
      })
      .catch(() => {
        if (!cancelled) setNotice(prev => ({ ...prev, checking: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, isNativeAndroid]);

  if (!enabled || !isNativeAndroid || !notice.visible) return null;

  const { latestBuildNumber } = getUpdateAvailability({ manifest: notice.manifest });
  const latestBuildDate = formatBuildDate(notice.manifest?.generatedAt);

  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center bg-slate-950/45 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0">
      <section className="w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-600 px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Smartphone className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[12px] font-black uppercase tracking-wide">Có bản cập nhật mới</h3>
              <p className="mt-0.5 truncate text-[9px] font-bold text-emerald-50">{notice.release?.label || 'Lucky Home'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotice(prev => ({ ...prev, visible: false }))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 active:scale-95"
            aria-label="Để sau"
            title="Để sau"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-emerald-900">
            <p className="text-[12px] font-black">Đã có bản cập nhật mới, vui lòng cập nhật.</p>
            <p className="mt-1 text-[10px] font-bold text-emerald-700">
              Build hiện tại {CURRENT_BUILD_NUMBER || 'thủ công'} → build {latestBuildNumber || 'mới'}
              {latestBuildDate ? `, phát hành ${latestBuildDate}` : ''}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNotice(prev => ({ ...prev, visible: false }))}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-600 active:scale-[0.98]"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={() => openDownload(notice.release.downloadUrl)}
              className="flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[10px] font-black uppercase text-white shadow-sm shadow-emerald-200 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Cập nhật ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const AppUpdatePanel = () => {
  const [state, setState] = React.useState({
    status: 'checking',
    manifest: null,
    release: null,
    error: '',
  });

  const checkForUpdate = React.useCallback(async ({ force = false } = {}) => {
    if (!force && releaseCache) {
      setState({
        status: 'ready',
        manifest: releaseCache.manifest,
        release: releaseCache.release,
        error: '',
      });
      return releaseCache;
    }

    setState(prev => ({ ...prev, status: 'checking', error: '' }));

    try {
      const nextValue = await requestLatestRelease({ force });
      setState({
        status: 'ready',
        manifest: nextValue.manifest,
        release: nextValue.release,
        error: '',
      });
      return nextValue;
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error?.message || 'Không kiểm tra được cập nhật.',
      }));
      return null;
    }
  }, []);

  React.useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  const {
    latestBuildNumber,
    isBuildKnown,
    hasPublishedBuild,
    hasNewerBuild,
  } = getUpdateAvailability({ manifest: state.manifest });
  const isNativeAndroid = Capacitor.getPlatform() === 'android';
  const latestBuildDate = formatBuildDate(state.manifest?.generatedAt);
  const currentBuildDate = formatBuildDate(CURRENT_BUILD_DATE);

  const statusText = (() => {
    if (state.status === 'checking') return 'Đang kiểm tra bản mới...';
    if (state.status === 'error') return 'Không kiểm tra được bản mới.';
    if (!hasPublishedBuild) return 'Chưa có bản build tự động trên máy chủ.';
    if (hasNewerBuild) return 'Có bản mới sẵn sàng tải về.';
    return 'Bạn đang dùng bản mới nhất.';
  })();

  return (
    <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-900 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-200">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-[10px] font-black uppercase tracking-widest">Cập nhật ứng dụng</h4>
            <p className="mt-0.5 truncate text-[9px] font-bold text-slate-300">{state.release?.label || 'Android APK'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => checkForUpdate({ force: true })}
          disabled={state.status === 'checking'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white active:scale-95 disabled:opacity-60"
          aria-label="Kiểm tra cập nhật"
          title="Kiểm tra cập nhật"
        >
          {state.status === 'checking'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className={`rounded-lg border px-3 py-2.5 ${hasNewerBuild ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-slate-100 bg-slate-50 text-slate-700'}`}>
          <p className="text-[11px] font-black">{statusText}</p>
          {state.status === 'error' && <p className="mt-1 text-[10px] font-bold text-rose-600">{state.error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[8px] font-black uppercase text-slate-400">Đang dùng</p>
            <p className="mt-1 text-[11px] font-black text-slate-700">{isBuildKnown ? `Build ${CURRENT_BUILD_NUMBER}` : 'Build thủ công'}</p>
            {currentBuildDate && <p className="mt-0.5 text-[9px] font-bold text-slate-500">{currentBuildDate}</p>}
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[8px] font-black uppercase text-slate-400">Trên máy chủ</p>
            <p className="mt-1 text-[11px] font-black text-slate-700">{hasPublishedBuild ? `Build ${latestBuildNumber}` : 'Chưa có'}</p>
            {latestBuildDate && <p className="mt-0.5 text-[9px] font-bold text-slate-500">{latestBuildDate}</p>}
          </div>
        </div>

        {state.release?.downloadUrl && (
          <button
            type="button"
            onClick={() => openDownload(state.release.downloadUrl)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest active:scale-[0.98] ${hasNewerBuild ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' : 'border border-blue-100 bg-blue-50 text-blue-700'}`}
          >
            <Download className="h-4 w-4" />
            {hasNewerBuild ? 'Tải bản cập nhật' : 'Tải lại APK'}
          </button>
        )}

        <p className="text-[10px] font-bold leading-relaxed text-slate-500">
          {isNativeAndroid
            ? 'Sau khi tải xong, mở file APK vừa tải để cài đè lên bản hiện tại.'
            : 'Mục này dùng cho bản Android. Tải APK trên điện thoại Android để cập nhật.'}
        </p>
      </div>
    </section>
  );
};

export default AppUpdatePanel;
