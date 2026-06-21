import { api } from './api';

export const fetchHubSummary = async (month) => (
  api.get(`/hub/summary?month=${encodeURIComponent(month)}`)
);

export const fetchHubQuickActions = async (month) => (
  api.get(`/hub/quick-actions?month=${encodeURIComponent(month)}`)
);

export const fetchHubQuickHouseDetail = async (houseId, month, mode = 'all') => (
  api.get(`/hub/quick-actions/house/${encodeURIComponent(houseId)}?month=${encodeURIComponent(month)}&mode=${encodeURIComponent(mode)}`)
);
