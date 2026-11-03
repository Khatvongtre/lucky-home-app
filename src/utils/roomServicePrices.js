export const roomServicePriceFields = [
  { key: 'priceElec', label: 'Điện', unit: 'đ/kWh' },
  { key: 'priceWaterPerson', label: 'Nước theo người', unit: 'đ/người/tháng' },
  { key: 'priceWaterM3', label: 'Nước theo m³', unit: 'đ/m³' },
  { key: 'priceNet', label: 'Internet', unit: 'đ/tháng' },
  { key: 'priceService', label: 'Phí dịch vụ', unit: 'đ/tháng' },
  { key: 'priceEBike', label: 'Xe máy điện', unit: 'đ/xe/tháng' },
];

// Do not use parseN: it truncates decimal prices and silently converts invalid input to zero.
export const readRoomServicePrices = (formData) => {
  const result = {};
  for (const { key, label } of roomServicePriceFields) {
    const field = `${key}Override`;
    if (!formData.has(field)) continue;
    const raw = String(formData.get(field) ?? '').trim();
    if (!raw) {
      result[field] = null;
      continue;
    }
    const value = Number(raw);
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(value) || value < 0 || value >= 1e16) {
      throw new Error(`${label}: nhập giá không âm, tối đa 2 chữ số thập phân.`);
    }
    result[field] = value;
  }
  if (formData.has('waterCalcMethodOverride')) {
    const method = String(formData.get('waterCalcMethodOverride') ?? '').trim().toLowerCase();
    if (method && method !== 'person' && method !== 'm3') throw new Error('Cách tính nước không hợp lệ.');
    result.waterCalcMethodOverride = method || null;
  }
  return result;
};
