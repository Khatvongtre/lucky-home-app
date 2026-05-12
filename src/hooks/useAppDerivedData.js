import { useMemo } from 'react';
import { parseN } from '../utils/formatters';

export const monthLabels = {
  'this-month': 'Tháng này',
  'last-month': 'Tháng trước',
  all: 'Tất cả',
};

const matches = (value, query) => value?.toLowerCase().includes(query);

export const useAppDerivedData = ({
  rooms,
  meters,
  transactions,
  bills,
  savings,
  searchQuery,
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
    () => bills.filter(bill => matches(bill.roomId, normalizedQuery)),
    [bills, normalizedQuery],
  );

  const currentSavings = useMemo(
    () => savings.filter(saving => matches(saving.bankName, normalizedQuery) || matches(saving.note, normalizedQuery)),
    [savings, normalizedQuery],
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
    if (room.status !== 'full' || !room.paymentDate) return false;

    const paymentDay = Number(room.paymentDate);
    if (isNaN(paymentDay)) return false;

    const candidateDates = [
      new Date(now.getFullYear(), now.getMonth() - 1, paymentDay),
      new Date(now.getFullYear(), now.getMonth(), paymentDay),
      new Date(now.getFullYear(), now.getMonth() + 1, paymentDay),
    ];

    return candidateDates.some(date => {
      const diffDays = Math.round((now - date) / (1000 * 60 * 60 * 24));
      return diffDays >= -1 && diffDays <= 3;
    });
  });

  const meterSummary = useMemo(() => {
    if (!currentMeters || currentMeters.length === 0) return { kwh: 0, heater: 0, money: 0 };

    let totalKwh = 0;
    let totalHeater = 0;

    currentMeters.forEach(meter => {
      const isOldEmpty = meter.oldVal === null || meter.oldVal === '';
      const isNewEmpty = meter.newVal === null || meter.newVal === '';
      if (isOldEmpty || isNewEmpty) return;

      const oldValue = parseN(meter.oldVal);
      const newValue = parseN(meter.newVal);
      const diff = newValue >= oldValue ? newValue - oldValue : 0;
      totalKwh += diff;
      if (meter.type === 'heater') totalHeater += diff;
    });

    return {
      kwh: totalKwh,
      heater: totalHeater,
      money: totalKwh * (config?.priceElec || 3500),
    };
  }, [currentMeters, config?.priceElec]);

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
