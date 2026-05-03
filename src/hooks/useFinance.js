import { useEffect, useState } from "react";
import { api } from "../services/api";

export const useFinance = () => {
    const [transactions, setTransactions] = useState([]);

    const fetch = async () => {
        const res = await api.get("/transactions");
        setTransactions(res);
    };

    useEffect(() => {
        fetch();
    }, []);

    return { transactions };
};