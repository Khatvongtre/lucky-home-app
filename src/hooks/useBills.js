import { useEffect, useState } from "react";
import { api } from "../services/api";

export const useBills = () => {
    const [bills, setBills] = useState([]);

    const fetchBills = async () => {
        const res = await api.get("/bills");
        setBills(res);
    };

    useEffect(() => {
        fetchBills();
    }, []);

    return { bills };
};