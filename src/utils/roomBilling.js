export const readRoomBilling = (form) => {
  const result = {};
  for (const [key, label, integer] of [
    ['previousPeopleCount', 'Số người tháng trước', true],
    ['deposit', 'Tiền cọc', false],
    ['priceElevator', 'Giá thang máy', false],
  ]) {
    if (!form.has(key)) continue;
    const raw = String(form.get(key) ?? '').trim().replace(/,/g, '');
    if (key === 'previousPeopleCount' && raw === '') {
      result[key] = null;
      continue;
    }
    const value = Number(raw);
    if (!raw || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) {
      throw new Error(`${label}: nhập ${integer ? 'số nguyên ' : ''}không âm hợp lệ.`);
    }
    result[key] = value;
  }
  if (form.has('elevatorCalcMethod')) {
    const method = form.get('elevatorCalcMethod');
    if (!['room', 'person'].includes(method)) throw new Error('Cách tính thang máy không hợp lệ.');
    result.elevatorCalcMethod = method;
  }
  return result;
};
