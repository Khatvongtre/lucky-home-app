import { useCallback, useState } from 'react';

export const useMonthNavigation = () => {
  const [viewDate, setViewDate] = useState(new Date());
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('this-month');

  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setMonth(nextDate.getMonth() - 1);
      return nextDate;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setMonth(nextDate.getMonth() + 1);
      return nextDate;
    });
  }, []);

  return {
    viewDate,
    isMonthOpen,
    setIsMonthOpen,
    selectedMonth,
    setSelectedMonth,
    handlePrevMonth,
    handleNextMonth,
    monthDisplay: `Tháng ${viewDate.getMonth() + 1}, ${viewDate.getFullYear()}`,
  };
};
