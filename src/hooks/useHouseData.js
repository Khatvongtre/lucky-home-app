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

const parseBills = (billsData = []) =>
    billsData.map(b => ({
        ...b,
        roomId: b.roomCode,
        details: JSON.parse(b.detailsJson || "{}"),
        meter: JSON.parse(b.meterInfoJson || "{}"),
        heaterMeter: b.heaterInfoJson ? JSON.parse(b.heaterInfoJson) : null,
    }));

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

        setBillStats({
            totalRooms: billsResult?.totalRooms ?? 0,
            totalBillPaids: billsResult?.totalBillPaids ?? billsData.filter(b => b.status === "paid").length,
            totalBillNotPaids: billsResult?.totalBillNotPaids ?? billsData.filter(b => b.status !== "paid").length,
            totalAmountPaids: billsResult?.totalAmountPaids ?? billsData.filter(b => b.status === "paid").reduce((sum, b) => sum + (b.total || 0), 0),
        });
        setBills(parseBills(billsData));
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
