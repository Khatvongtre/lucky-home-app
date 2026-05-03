const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

export const api = {
    get: async (url) => {
        const res = await fetch(`${API_URL}${url}`, {
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error("API error");
        return res.json();
    },

    post: async (url, body) => {
        const res = await fetch(`${API_URL}${url}`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("API error");
        return res.json();
    },

    put: async (url, body) => {
        const res = await fetch(`${API_URL}${url}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("API error");
        return res.json();
    },

    delete: async (url) => {
        const res = await fetch(`${API_URL}${url}`, {
            method: "DELETE",
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error("API error");
        return res.json();
    },
};