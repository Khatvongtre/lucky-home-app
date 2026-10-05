import { useMemo } from 'react';
import { getSavingMaturityDate, isMeterReadingDueNear } from '../utils/date';

export const monthLabels = {
  'this-month': 'Tháng này',
  'last-month': 'Tháng trước',
  all: 'Tất cả',
};

const matches = (value, query) => value?.toLowerCase().includes(query);

const isPaidStatus = (status) => ['paid', 'completed', 'done'].includes(String(status || '').toLowerCase());

const billTimestamp = (bill = {}) => {
  const candidates = [bill.updatedAt, bill.createdAt, bill.paidAt, bill.date, bill.generatedAt];
  const timestamp = candidates
    .map(value => (value ? new Date(value).getTime() : 0))
    .find(value => Number.isFinite(value) && value > 0);
  return timestamp || 0;
};

const shouldReplaceBill = (current, candidate) => {
  if (!current) return true;
  const currentPaid = isPaidStatus(current.status);
  const candidatePaid = isPaidStatus(candidate.status);
  if (currentPaid !== candidatePaid) return candidatePaid;

  const currentTime = billTimestamp(current);
  const candidateTime = billTimestamp(candidate);
  if (candidateTime !== currentTime) return candidateTime >= currentTime;

  return String(candidate.id || '') >= String(current.id || '');
};

const dedupeBills = (billList = []) => {
  const billMap = new Map();

  billList.forEach(bill => {
    const roomKey = String(bill.roomCode || bill.roomId || '');
    const periodKey = String(bill.currentMonthFull || bill.period || '');
    const key = `${roomKey}|${periodKey}`;
    if (!roomKey) return;
    if (shouldReplaceBill(billMap.get(key), bill)) billMap.set(key, bill);
  });

  return Array.from(billMap.values());
};

export const useAppDerivedData = ({
  rooms,
  meters,
  transactions,
  bills,
  savings,
  searchQuery,
  savingMaturityFilter,
  unselectedSavingsBanks,
  selectedHouse,
  dashboardSummary,
  config,
}) => {
  const normalizedQuery = searchQuery.toLowerCase();

  const currentRooms = useMemo(
    () => rooms.filter(room => matches(room.roomCode, normalizedQuery) || matches(room.id, normalizedQuery)),
    [rooms, normalizedQuery],
  );

  const currentMeters = useMemo(
    () => meters.filter(meter => matches(meter.id, normalizedQuery) || matches(meter.name, normalizedQuery)),
    [meters, normalizedQuery],
  );

  const currentTransactions = useMemo(
    () => transactions.filter(transaction => matches(transaction.note, normalizedQuery)),
    [transactions, normalizedQuery],
  );

  const currentBills = useMemo(
    () => dedupeBills(bills).filter(bill => matches(bill.roomId, normalizedQuery)),
    [bills, normalizedQuery],
  );

  const currentSavings = useMemo(
    () => {
      const toTime = savingMaturityFilter?.to ? new Date(savingMaturityFilter.to).setHours(23, 59, 59, 999) : null;

      return savings.filter(saving => {
        const matchesSearch = matches(saving.bankName, normalizedQuery) || matches(saving.note, normalizedQuery);
        if (!matchesSearch) return false;
        if (!toTime) return true;

        const maturityDate = getSavingMaturityDate(saving.startDate, saving.termMonths);
        const maturityTime = maturityDate?.getTime();
        if (!Number.isFinite(maturityTime)) return false;

        if (toTime && maturityTime > toTime) return false;
        return true;
      });
    },
    [savings, normalizedQuery, savingMaturityFilter],
  );

  const uniqueBankNames = useMemo(
    () => [...new Set(savings.map(saving => saving.bankName).filter(Boolean))],
    [savings],
  );

  const summarySavings = useMemo(
    () => currentSavings.filter(saving => !unselectedSavingsBanks.includes(saving.bankName || 'Khác')),
    [currentSavings, unselectedSavingsBanks],
  );

  const financeStats = useMemo(() => {
    const totalRev = transactions.filter(transaction => transaction.type === 'in').reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    const txExp = transactions.filter(transaction => transaction.type === 'out').reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    const fixedCosts = (selectedHouse?.rentPrice || 0) + (selectedHouse?.internetFee || 0) + (selectedHouse?.otherFees || 0);
    return { rev: totalRev, exp: txExp + fixedCosts, txExp, fixedCosts };
  }, [transactions, selectedHouse]);

  const revenueChartData = useMemo(() => {
    const chartRaw = dashboardSummary?.revenueChart || [];
    if (chartRaw.length === 0) {
      return [1, 2, 3, 4, 5, 6].map((_, i) => ({ label: `Th${i + 1}`, value: 0, height: 0, isCurrent: i === 5 }));
    }

    const maxVal = Math.max(...chartRaw.map(dataPoint => dataPoint.value), 1);
    return chartRaw.map(dataPoint => ({
      ...dataPoint,
      height: dataPoint.value === 0 ? 0 : Math.max((dataPoint.value / maxVal) * 100, 4),
    }));
  }, [dashboardSummary]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const shouldShowMeterBanner = rooms.some(room => {
    if (room.status !== 'full') return false;
    return isMeterReadingDueNear(room, {
      referenceDate: now,
      fallbackDay: config?.paymentDay,
      beforeDays: 1,
      afterDays: 3,
    });
  });

  const meterSummary = useMemo(() => {
    if (!currentMeters || currentMeters.length === 0) return { kwh: 0, heater: 0, waterM3: 0, electricMoney: 0, waterMoney: 0, money: 0 };

    let totalKwh = 0;
    let totalHeater = 0;
    let totalWaterM3 = 0;

    currentMeters.forEach(meter => {
      if (meter.status && String(meter.status).toLowerCase() !== 'active') return;
      const isOldEmpty = meter.oldVal === null || meter.oldVal === '';
      const isNewEmpty = meter.newVal === null || meter.newVal === '';
      if (isOldEmpty || isNewEmpty) return;

      const oldValue = Number(meter.oldVal);
      const newValue = Number(meter.newVal);
      const diff = newValue >= oldValue ? newValue - oldValue : 0;
      if (meter.type === 'water') {
        if (config?.waterCalcMethod === 'm3') totalWaterM3 += diff;
      } else {
        totalKwh += diff;
      }
      if (meter.type === 'heater') totalHeater += diff;
    });

    return {
      kwh: totalKwh,
      heater: totalHeater,
      waterM3: totalWaterM3,
      electricMoney: totalKwh * (config?.priceElec || 3500),
      waterMoney: totalWaterM3 * (config?.priceWaterM3 || 0),
      money: totalKwh * (config?.priceElec || 3500) + totalWaterM3 * (config?.priceWaterM3 || 0),
    };
  }, [currentMeters, config?.priceElec, config?.priceWaterM3, config?.waterCalcMethod]);

  return {
    currentRooms,
    currentMeters,
    currentTransactions,
    currentBills,
    currentSavings,
    uniqueBankNames,
    summarySavings,
    financeStats,
    revenueChartData,
    shouldShowMeterBanner,
    meterSummary,
  };
};
