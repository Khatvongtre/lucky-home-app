export const METER_TYPES = Object.freeze({
  ELECTRIC: 'electric',
  WATER: 'water',
  HEATER: 'heater',
});

export const METER_STATUSES = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REPLACED: 'replaced',
});

export const getMeterUnit = type => (
  String(type || '').toLowerCase() === METER_TYPES.WATER ? 'm³' : 'kWh'
);

export const getMeterTypeLabel = type => {
  switch (String(type || '').toLowerCase()) {
    case METER_TYPES.WATER: return 'Công tơ nước';
    case METER_TYPES.HEATER: return 'Bình nóng lạnh chung';
    default: return 'Điện phòng';
  }
};

export const isActiveMeter = meter => (
  !meter?.status || String(meter.status).toLowerCase() === METER_STATUSES.ACTIVE
);

