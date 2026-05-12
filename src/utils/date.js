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
