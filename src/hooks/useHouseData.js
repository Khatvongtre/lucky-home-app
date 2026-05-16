import { useCallback, useState } from "react";
import { api } from "../services/api";

const emptyBillStats = {
    totalRooms: 0,
    totalBillPaids: 0,
    totalBillNotPaids: 0,
    totalAmountPaids: 0,
};

const parseMeters = (metersData = []) =>
    metersData.map(m => ({ ...m, roomIds: JSON.parse(m.roomIdsJson || "[]") }));

const parseJsonField = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const parseBills = (billsData = []) =>
    billsData.map(b => ({
        ...b,
        roomId: b.roomCode || b.roomId,
        details: parseJsonField(b.detailsJson, b.details || {}),
        meter: parseJsonField(b.meterInfoJson, b.meter || {}),
        heaterMeter: b.heaterInfoJson ? parseJsonField(b.heaterInfoJson, b.heaterMeter || null) : (b.heaterMeter || null),
    }));

const isPaidStatus = (status) => ["paid", "completed", "done"].includes(String(status || "").toLowerCase());

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

    return String(candidate.id || "") >= String(current.id || "");
};

const dedupeBills = (billsData = []) => {
    const billMap = new Map();

    billsData.forEach(bill => {
        const roomKey = String(bill.roomCode || bill.roomId || "");
        const periodKey = String(bill.currentMonthFull || bill.period || "");
        const key = `${roomKey}|${periodKey}`;
        if (!roomKey) return;
        if (shouldReplaceBill(billMap.get(key), bill)) billMap.set(key, bill);
    });

    return Array.from(billMap.values());
};

export const useHouseData = ({ viewDate, selectedMonth }) => {
    const [houses, setHouses] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [meters, setMeters] = useState([]);
    const [dashboardWarnings, setDashboardWarnings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [dashboardSummary, setDashboardSummary] = useState(null);
    const [bills, setBills] = useState([]);
    const [billStats, setBillStats] = useState(emptyBillStats);

    const loadHouses = useCallback(async () => {
        const data = await api.get("/house");
        setHouses(data || []);
        return data || [];
    }, []);

    const loadWarnings = useCallback(async () => {
        try {
            const data = await api.get("/management/dashboard/warnings");
            setDashboardWarnings(data || []);
        } catch (error) {
            console.error("Lỗi tải cảnh báo:", error.message);
        }
    }, []);

    const loadDashboardData = useCallback(async (houseId) => {
        const month = viewDate.getMonth() + 1;
        const year = viewDate.getFullYear();
        const summaryData = await api.get(`/management/dashboard/summary/${houseId}?year=${year}&month=${month}`);
        setDashboardSummary(summaryData);
    }, [viewDate]);

    const loadRoomsData = useCallback(async (houseId) => {
        const roomsData = await api.get(`/room/${houseId}`);
        setRooms(roomsData || []);
    }, []);

    const loadMetersData = useCallback(async (houseId) => {
        const month = viewDate.getMonth() + 1;
        const year = viewDate.getFullYear();
        const metersData = await api.get(`/meter/${houseId}?year=${year}&month=${month}`);
        setMeters(parseMeters(metersData || []));
    }, [viewDate]);

    const loadBillsData = useCallback(async (houseId) => {
        const month = viewDate.getMonth() + 1;
        const year = viewDate.getFullYear();
        const billsResult = await api.get(`/bill/${houseId}?year=${year}&month=${month}`);
        const billsData = Array.isArray(billsResult) ? billsResult : (billsResult?.bills || []);
        const parsedBills = dedupeBills(parseBills(billsData));

        setBillStats({
            totalRooms: billsResult?.totalRooms ?? 0,
            totalBillPaids: parsedBills.filter(b => isPaidStatus(b.status)).length,
            totalBillNotPaids: parsedBills.filter(b => !isPaidStatus(b.status)).length,
            totalAmountPaids: parsedBills.filter(b => isPaidStatus(b.status)).reduce((sum, b) => sum + (b.total || 0), 0),
        });
        setBills(parsedBills);
    }, [viewDate]);

    const loadTransactions = useCallback(async (houseId) => {
        const txData = await api.get(`/transaction/${houseId}?type=${selectedMonth}`);
        setTransactions(txData || []);
    }, [selectedMonth]);

    const resetHouseData = useCallback(() => {
        setHouses([]);
        setRooms([]);
        setMeters([]);
        setDashboardWarnings([]);
        setTransactions([]);
        setDashboardSummary(null);
        setBills([]);
        setBillStats(emptyBillStats);
    }, []);

    return {
        houses,
        setHouses,
        rooms,
        setRooms,
        meters,
        setMeters,
        dashboardWarnings,
        transactions,
        setTransactions,
        dashboardSummary,
        bills,
        setBills,
        billStats,
        setBillStats,
        loadHouses,
        loadWarnings,
        loadDashboardData,
        loadRoomsData,
        loadMetersData,
        loadBillsData,
        loadTransactions,
        resetHouseData,
    };
};
