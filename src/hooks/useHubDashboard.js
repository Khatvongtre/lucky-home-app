import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHubQuickActions, fetchHubQuickHouseDetail, fetchHubSummary } from '../services/hubApi';
import { buildHubHouseDetailCacheKey, formatHubMonth } from '../utils/hub';

const hubSummaryCache = new Map();
const hubSummaryInFlight = new Map();
const hubQuickActionsCache = new Map();
const hubQuickActionsInFlight = new Map();
const hubHouseDetailCache = new Map();
const hubHouseDetailInFlight = new Map();

const getCachedResource = async ({ cache, inFlight, key, force = false, loader }) => {
  if (inFlight.has(key)) return inFlight.get(key);
  if (!force && cache.has(key)) return cache.get(key);

  const request = (async () => {
    try {
      const result = await loader();
      cache.set(key, result || null);
      return result || null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
};

export const useHubDashboard = ({ viewDate, showToast }) => {
  const month = useMemo(() => formatHubMonth(viewDate || new Date()), [viewDate]);
  const [hubSummary, setHubSummary] = useState(null);
  const [hubQuickActions, setHubQuickActions] = useState(null);
  const [hubHouseDetailsById, setHubHouseDetailsById] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingQuickActions, setLoadingQuickActions] = useState(false);
  const [loadingHouseDetailId, setLoadingHouseDetailId] = useState(null);
  const [hasLoadedSummary, setHasLoadedSummary] = useState(false);
  const [hasLoadedQuickActions, setHasLoadedQuickActions] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [quickActionsError, setQuickActionsError] = useState(null);

  const loadHubSummary = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!silent) setLoadingSummary(true);
    setSummaryError(null);
    try {
      const result = await getCachedResource({
        cache: hubSummaryCache,
        inFlight: hubSummaryInFlight,
        key: month,
        force,
        loader: () => fetchHubSummary(month),
      });
      setHubSummary(result || null);
      setHasLoadedSummary(true);
      return result || null;
    } catch (error) {
      setSummaryError(error);
      setHasLoadedSummary(true);
      if (!silent) showToast?.(error.message || 'Không tải được tổng quan Hub.', 'error');
      return null;
    } finally {
      if (!silent) setLoadingSummary(false);
    }
  }, [month, showToast]);

  const loadHubQuickActions = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!silent) setLoadingQuickActions(true);
    setQuickActionsError(null);
    try {
      const result = await getCachedResource({
        cache: hubQuickActionsCache,
        inFlight: hubQuickActionsInFlight,
        key: month,
        force,
        loader: () => fetchHubQuickActions(month),
      });
      setHubQuickActions(result || null);
      setHasLoadedQuickActions(true);
      return result || null;
    } catch (error) {
      setQuickActionsError(error);
      setHasLoadedQuickActions(true);
      if (!silent) showToast?.(error.message || 'Không tải được xử lý nhanh Hub.', 'error');
      return null;
    } finally {
      if (!silent) setLoadingQuickActions(false);
    }
  }, [month, showToast]);

  const ensureHouseDetail = useCallback(async (houseId, { force = false, mode = 'all', silent = false } = {}) => {
    if (!houseId) return null;
    const cacheKey = buildHubHouseDetailCacheKey(houseId, month);
    if (!force && hubHouseDetailsById[cacheKey]) return hubHouseDetailsById[cacheKey];

    if (!silent) setLoadingHouseDetailId(houseId);
    try {
      const result = await getCachedResource({
        cache: hubHouseDetailCache,
        inFlight: hubHouseDetailInFlight,
        key: cacheKey,
        force,
        loader: () => fetchHubQuickHouseDetail(houseId, month, mode),
      });
      setHubHouseDetailsById(prev => ({ ...prev, [cacheKey]: result || null }));
      return result || null;
    } catch (error) {
      if (!silent) showToast?.(error.message || 'Không tải được danh sách phòng của cơ sở.', 'error');
      return null;
    } finally {
      if (!silent) setLoadingHouseDetailId(current => (current === houseId ? null : current));
    }
  }, [hubHouseDetailsById, month, showToast]);

  useEffect(() => {
    setHubHouseDetailsById({});
    setHasLoadedSummary(false);
    setHasLoadedQuickActions(false);
    setSummaryError(null);
    setQuickActionsError(null);

    let cancelled = false;
    const bootstrap = async () => {
      const hasCachedSummary = hubSummaryCache.has(month);
      const hasCachedQuickActions = hubQuickActionsCache.has(month);

      if (hasCachedSummary) {
        setHubSummary(hubSummaryCache.get(month) || null);
        setHasLoadedSummary(true);
      } else {
        setHubSummary(null);
      }

      if (hasCachedQuickActions) {
        setHubQuickActions(hubQuickActionsCache.get(month) || null);
        setHasLoadedQuickActions(true);
      } else {
        setHubQuickActions(null);
      }

      setLoadingSummary(true);
      setLoadingQuickActions(true);
      const [summaryResult, quickActionsResult] = await Promise.allSettled([
        getCachedResource({
          cache: hubSummaryCache,
          inFlight: hubSummaryInFlight,
          key: month,
          force: hasCachedSummary,
          loader: () => fetchHubSummary(month),
        }),
        getCachedResource({
          cache: hubQuickActionsCache,
          inFlight: hubQuickActionsInFlight,
          key: month,
          force: hasCachedQuickActions,
          loader: () => fetchHubQuickActions(month),
        }),
      ]);
      if (cancelled) return;

      if (summaryResult.status === 'fulfilled') {
        setHubSummary(summaryResult.value || null);
        setSummaryError(null);
      } else {
        setSummaryError(summaryResult.reason);
      }

      if (quickActionsResult.status === 'fulfilled') {
        setHubQuickActions(quickActionsResult.value || null);
        setQuickActionsError(null);
      } else {
        setQuickActionsError(quickActionsResult.reason);
      }

      setHasLoadedSummary(true);
      setHasLoadedQuickActions(true);
      setLoadingSummary(false);
      setLoadingQuickActions(false);
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [month]);

  return {
    month,
    hubSummary,
    hubQuickActions,
    hubHouseDetailsById,
    loadingSummary,
    loadingQuickActions,
    loadingHouseDetailId,
    hasLoadedSummary,
    hasLoadedQuickActions,
    summaryError,
    quickActionsError,
    loadHubSummary,
    loadHubQuickActions,
    ensureHouseDetail,
  };
};
