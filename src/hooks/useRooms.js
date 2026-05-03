import { useEffect, useState } from "react";
import { api } from "../services/api";

export const useRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRooms = async () => {
        const res = await api.get("/rooms");
        setRooms(res);
        setLoading(false);
    };

    const createRoom = async (data) => {
        await api.post("/rooms", data);
        fetchRooms();
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    return { rooms, loading, createRoom };
};