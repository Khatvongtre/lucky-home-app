export const formatHubMonth = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const buildHubHouseDetailCacheKey = (houseId, month) => `${month}:${houseId}`;
