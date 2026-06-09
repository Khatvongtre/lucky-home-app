const toAmount = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export const BILL_FEE_KEYS = [
  'rent',
  'elec',
  'heater',
  'water',
  'service',
  'internet',
  'ebikes',
  'monthlyFee',
];

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseBillMeters = (bill = {}) => {
  const candidates = [
    bill.meters,
    bill.metersJson,
    bill.meterInfosJson,
    bill.meterInfoListJson,
    bill.meterInfoJson,
  ];

  for (const candidate of candidates) {
    const meters = parseJsonField(candidate, []);
    if (Array.isArray(meters) && meters.length > 0) return meters;
  }

  return [];
};

export const getBillElectricMeters = (bill = {}) => {
  const meters = parseBillMeters(bill).filter(meter => (
    !['heater', 'water_heater', 'bnl'].includes(String(meter?.type || '').toLowerCase())
  ));

  if (meters.length > 0) return meters;
  return bill.meter && !Array.isArray(bill.meter) && Object.keys(bill.meter).length > 0 ? [bill.meter] : [];
};

export const getBillAdditionalCost = (details = {}) =>
  toAmount(details.additionalCost ?? details.extraCost ?? details.surcharge);

export const getBillWaivedItems = (details = {}) =>
  Array.isArray(details.waivedItems)
    ? [...new Set(details.waivedItems.map(String))].filter(key => BILL_FEE_KEYS.includes(key))
    : [];

const getWaivedTotal = (details, waivedItems) =>
  waivedItems.reduce((sum, key) => sum + Math.max(toAmount(details[key]), 0), 0);

const getBillBaseTotal = details =>
  BILL_FEE_KEYS.reduce((sum, key) => sum + toAmount(details[key]), 0);

export const applyBillAdjustments = (bill = {}, adjustments = {}) => {
  const details = bill.details || {};
  const currentDiscount = toAmount(details.discount);
  const currentAdditionalCost = getBillAdditionalCost(details);
  const currentWaivedItems = getBillWaivedItems(details);
  const discount = Math.max(toAmount(adjustments.discount ?? currentDiscount), 0);
  const additionalCost = Math.max(toAmount(adjustments.additionalCost ?? currentAdditionalCost), 0);
  const waivedItems = adjustments.waivedItems === undefined
    ? currentWaivedItems
    : [...new Set((adjustments.waivedItems || []).map(String))];
  const baseTotal = getBillBaseTotal(details);

  return {
    ...bill,
    total: baseTotal - discount + additionalCost - getWaivedTotal(details, waivedItems),
    details: {
      ...details,
      discount,
      additionalCost,
      waivedItems,
    },
  };
};

export const isRefundBill = bill => toAmount(bill?.total) < 0;

export const normalizeBill = (bill = {}) => {
  const details = parseJsonField(bill.details, parseJsonField(bill.detailsJson, {}));
  return {
    ...bill,
    entityRoomId: bill.entityRoomId || bill.roomId,
    roomId: bill.roomCode || bill.roomId,
    details: {
      ...details,
      discount: Math.max(toAmount(details.discount), 0),
      additionalCost: Math.max(getBillAdditionalCost(details), 0),
      waivedItems: getBillWaivedItems(details),
    },
    meter: parseJsonField(bill.meter, parseJsonField(bill.meterInfoJson, {})),
    meters: parseBillMeters(bill),
    heaterMeter: parseJsonField(bill.heaterMeter, parseJsonField(bill.heaterInfoJson, null)),
  };
};

export const extractBillFromResponse = (response, fallback) =>
  normalizeBill(
    response?.bill
    || response?.data?.bill
    || (response?.data?.id ? response.data : null)
    || (response?.id ? response : null)
    || fallback
  );

export const buildBillUpdatePayload = (bill = {}) => {
  const {
    total: _total,
    detailsJson: _detailsJson,
    meterInfoJson: _meterInfoJson,
    heaterInfoJson: _heaterInfoJson,
    entityRoomId,
    ...payload
  } = normalizeBill(bill);
  return {
    ...payload,
    roomId: entityRoomId || payload.roomId,
  };
};
