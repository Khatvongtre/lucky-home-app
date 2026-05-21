const DEFAULT_API_URL = 'http://localhost:3000/api';
const FAILOVER_STATUSES = new Set([502, 503, 504]);

const trimTrailingSlash = (url = '') => String(url).replace(/\/+$/g, '');

export const PRIMARY_API_URL = trimTrailingSlash(import.meta.env.VITE_API_URL || DEFAULT_API_URL);
export const BACKUP_API_URL = trimTrailingSlash(import.meta.env.VITE_BACKUP_API_URL || '');

let activeApiUrl = PRIMARY_API_URL;

const hasBackupApi = () => BACKUP_API_URL && BACKUP_API_URL !== PRIMARY_API_URL;

const getApiCandidates = () => {
  if (!hasBackupApi()) return [PRIMARY_API_URL];

  const otherApiUrl = activeApiUrl === BACKUP_API_URL ? PRIMARY_API_URL : BACKUP_API_URL;
  return [activeApiUrl, otherApiUrl];
};

const shouldFailOver = (response) => FAILOVER_STATUSES.has(response.status);

export const getApiBaseUrl = () => activeApiUrl;

export const fetchFromApi = async (url, options = {}) => {
  const candidates = getApiCandidates();
  let unavailableResponse = null;
  let connectionError = null;

  for (const [index, apiUrl] of candidates.entries()) {
    const hasAnotherApi = index < candidates.length - 1;

    try {
      const response = await fetch(`${apiUrl}${url}`, options);

      if (shouldFailOver(response) && hasAnotherApi) {
        unavailableResponse ??= response;
        continue;
      }

      activeApiUrl = apiUrl;
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
