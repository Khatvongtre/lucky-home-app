import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

const fetchFundState = () => Promise.all([
    api.get("/funds"),
    api.get("/funds/transactions"),
]);

export const useFunds = ({ showToast }) => {
    const [funds, setFunds] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const loadFunds = useCallback(async () => {
        try {
            const [fundsData, txData] = await fetchFundState();
            setFunds(fundsData || []);
            setTransactions(txData || []);
        } catch (error) {
            console.error(error);
            showToast("Không thể tải dữ liệu sổ chi tiêu", "error");
        }
    }, [showToast]);

    useEffect(() => {
        let isActive = true;

        fetchFundState().then(([fundsData, txData]) => {
            if (!isActive) return;
            setFunds(fundsData || []);
            setTransactions(txData || []);
        }).catch((error) => {
            console.error(error);
            showToast("Không thể tải dữ liệu sổ chi tiêu", "error");
        });

        return () => {
            isActive = false;
        };
    }, [showToast]);

    const saveTransactions = useCallback(async (newTransactions) => {
        await api.post("/funds/transactions", newTransactions);
        await loadFunds();
    }, [loadFunds]);

    const saveFunds = useCallback(async (nextFunds) => {
        const updatedFunds = await api.put("/funds", nextFunds);
        setFunds(updatedFunds || []);
        return updatedFunds;
    }, []);

    const deleteTransaction = useCallback(async (txId) => {
        await api.delete(`/funds/transactions/${txId}`);
        await loadFunds();
    }, [loadFunds]);

    return {
        funds,
        transactions,
        loadFunds,
        saveFunds,
        saveTransactions,
        deleteTransaction,
    };
};
