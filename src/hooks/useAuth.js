import { useState, useEffect } from "react";
import { api } from "../services/api";

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (data) => {
        const res = await api.post("/auth/login", data);
        localStorage.setItem("token", res.token);
        setUser(res.user);
    };

    const register = async (data) => {
        await api.post("/auth/register", data);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
    };

    const getMe = async () => {
        try {
            const res = await api.get("/auth/me");
            setUser(res);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getMe();
    }, []);

    return { user, loading, login, register, logout };
};