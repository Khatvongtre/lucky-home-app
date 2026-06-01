export const diffDays = (dateStr) => {
    if (!dateStr) return 0;
    try {
        const target = new Date(dateStr);
        const now = new Date();
        return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    } catch { return 0; }
};

export const getDueInfo = (dueDay) => {
    if (!dueDay) return null;

    const now = new Date();
    let dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);

    if (now.getDate() > dueDay) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
    }

    if (dueDate.getDate() !== dueDay) {
        dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);
    }

    const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    return { dueDate, daysLeft };
};

export const endContract = (startDateStr, months) => {
    if (!startDateStr || !months) return null;

    try {
        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
        endDate.setDate(endDate.getDate() - 1);
        return endDate;
    } catch {
        return null;
    }
};

export const getSafeDate = (dStr) => {
    try {
        const d = dStr ? new Date(dStr) : new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
};

export const getSavingMaturityDate = (startDateStr, termMonths = 0) => {
    if (!startDateStr) return null;

    const startDate = new Date(startDateStr);
    if (Number.isNaN(startDate.getTime())) return null;

    const months = Number(termMonths) || 0;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + Math.floor(months));
    endDate.setDate(endDate.getDate() + Math.round((months - Math.floor(months)) * 30));

    return endDate;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getValidDay = (value) => {
    const day = Number(value);
    return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
};

const getValidPeriodMonths = (value) => {
    const period = Number(value);
    return Number.isInteger(period) && period >= 1 ? period : 1;
};

const getMonthDiff = (fromDate, toDate) => (
    (toDate.getFullYear() - fromDate.getFullYear()) * 12
    + (toDate.getMonth() - fromDate.getMonth())
);

const buildDateInMonth = (year, month, day) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const date = new Date(year, month, Math.min(day, lastDay));
    date.setHours(0, 0, 0, 0);
    return date;
};

const isMeterReadingCycleMonth = (room, date) => {
    const periodMonths = getValidPeriodMonths(room?.meterReadingPeriodMonths);
    if (periodMonths === 1) return true;

    const startDate = room?.meterReadingStartDate || room?.contractStart;
    if (!startDate) return true;

    const cycleStart = new Date(startDate);
    if (!Number.isFinite(cycleStart.getTime())) return true;

    const monthDiff = getMonthDiff(cycleStart, date);
    return monthDiff >= 0 && monthDiff % periodMonths === 0;
};

export const getMeterReadingDay = (room, fallbackDay) => (
    getValidDay(room?.meterReadingDay)
    ?? getValidDay(room?.paymentDate)
    ?? getValidDay(room?.paymentDay)
    ?? getValidDay(fallbackDay)
);

export const getMeterReadingDueDateForMonth = (room, targetDate = new Date(), fallbackDay) => {
    const day = getMeterReadingDay(room, fallbackDay);
    if (!day) return null;

    const monthDate = new Date(targetDate);
    monthDate.setHours(0, 0, 0, 0);
    if (!isMeterReadingCycleMonth(room, monthDate)) return null;

    return buildDateInMonth(monthDate.getFullYear(), monthDate.getMonth(), day);
};

export const getNearestMeterReadingDueDate = (room, referenceDate = new Date(), fallbackDay) => {
    const periodMonths = getValidPeriodMonths(room?.meterReadingPeriodMonths);
    const candidates = [];

    for (let offset = -periodMonths; offset <= periodMonths; offset += 1) {
        const candidateMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + offset, 1);
        const dueDate = getMeterReadingDueDateForMonth(room, candidateMonth, fallbackDay);
        if (dueDate) candidates.push(dueDate);
    }

    return candidates.reduce((nearest, date) => {
        if (!nearest) return date;
        return Math.abs(date - referenceDate) < Math.abs(nearest - referenceDate) ? date : nearest;
    }, null);
};

export const getMeterReadingDueState = (room, {
    targetDate = new Date(),
    today = new Date(),
    fallbackDay,
} = {}) => {
    const dueDate = getMeterReadingDueDateForMonth(room, targetDate, fallbackDay);
    if (!dueDate) return { dueDate: null, daysFromDue: null, isInWindow: false };

    const normalizedToday = new Date(today);
    normalizedToday.setHours(0, 0, 0, 0);

    const daysFromDue = Math.floor((normalizedToday - dueDate) / MS_PER_DAY);
    return {
        dueDate,
        daysFromDue,
        isInWindow: daysFromDue >= -5 && daysFromDue <= 5,
    };
};

export const isMeterReadingDueNear = (room, {
    referenceDate = new Date(),
    fallbackDay,
    beforeDays = 1,
    afterDays = 3,
} = {}) => {
    const dueDate = getNearestMeterReadingDueDate(room, referenceDate, fallbackDay);
    if (!dueDate) return false;

    const normalizedReferenceDate = new Date(referenceDate);
    normalizedReferenceDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((normalizedReferenceDate - dueDate) / MS_PER_DAY);
    return diffDays >= -beforeDays && diffDays <= afterDays;
};
