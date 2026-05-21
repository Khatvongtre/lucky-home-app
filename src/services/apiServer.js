const DEFAULT_API_URL = 'http://localhost:3000/api';
const FAILOVER_STATUSES = new Set([502, 503, 504]);
const PRIMARY_HEALTH_URL = '/health';
const PRIMARY_RECOVERY_PROBE_INTERVAL_MS = 60_000;
const PRIMARY_RECOVERY_PROBE_TIMEOUT_MS = 5_000;

const trimTrailingSlash = (url = '') => String(url).replace(/\/+$/g, '');

export const PRIMARY_API_URL = trimTrailingSlash(import.meta.env.VITE_API_URL || DEFAULT_API_URL);
export const BACKUP_API_URL = trimTrailingSlash(import.meta.env.VITE_BACKUP_API_URL || '');

let activeApiUrl = PRIMARY_API_URL;
let lastPrimaryAttemptAt = 0;
let primaryProbeInFlight = false;

const hasBackupApi = () => BACKUP_API_URL && BACKUP_API_URL !== PRIMARY_API_URL;

const getApiCandidates = () => {
  if (!hasBackupApi()) return [PRIMARY_API_URL];

  const otherApiUrl = activeApiUrl === BACKUP_API_URL ? PRIMARY_API_URL : BACKUP_API_URL;
  return [activeApiUrl, otherApiUrl];
};

const shouldFailOver = (response) => FAILOVER_STATUSES.has(response.status);

const isGetRequest = (options) => !options.method || String(options.method).toUpperCase() === 'GET';

const cancelResponseBody = (response) => {
  const cancelPromise = response.body?.cancel?.();
  cancelPromise?.catch(() => {});
};

const shouldProbePrimary = (options) => (
  activeApiUrl === BACKUP_API_URL
  && hasBackupApi()
  && isGetRequest(options)
  && !primaryProbeInFlight
  && Date.now() - lastPrimaryAttemptAt >= PRIMARY_RECOVERY_PROBE_INTERVAL_MS
);

const probePrimaryInBackground = async (options) => {
  if (!shouldProbePrimary(options)) return;

  primaryProbeInFlight = true;
  lastPrimaryAttemptAt = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PRIMARY_RECOVERY_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${PRIMARY_API_URL}${PRIMARY_HEALTH_URL}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    cancelResponseBody(response);

    if (!shouldFailOver(response)) {
      activeApiUrl = PRIMARY_API_URL;
    }
  } catch {
    // The backup response is already serving the user; recovery can retry later.
  } finally {
    clearTimeout(timeoutId);
    primaryProbeInFlight = false;
  }
};

export const getApiBaseUrl = () => activeApiUrl;

export const fetchFromApi = async (url, options = {}) => {
  const candidates = getApiCandidates();
  let unavailableResponse = null;
  let connectionError = null;

  for (const [index, apiUrl] of candidates.entries()) {
    const hasAnotherApi = index < candidates.length - 1;

    try {
      if (apiUrl === PRIMARY_API_URL) lastPrimaryAttemptAt = Date.now();

      const response = await fetch(`${apiUrl}${url}`, options);

      if (shouldFailOver(response) && hasAnotherApi) {
        unavailableResponse ??= response;
        continue;
      }

      activeApiUrl = apiUrl;
      if (apiUrl === BACKUP_API_URL) void probePrimaryInBackground(options);
      return response;
    } catch (error) {
      if (options.signal?.aborted) throw error;

      connectionError = error;
      if (!hasAnotherApi) break;
    }
  }

  if (unavailableResponse) return unavailableResponse;
  throw connectionError || new Error('No API server is available.');
};
