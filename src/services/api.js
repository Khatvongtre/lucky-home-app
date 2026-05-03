const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const getHeaders = () => {
    const token = localStorage.getItem("smartstay_token");
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

const handleResponse = async (res) => {
    if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new Event('auth:unauthorized'));
        const result = await res.json().catch(() => ({}));
        throw new Error(result.message || "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
    }
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || `Lỗi máy chủ (${res.status})`);
    return result;
};

const handleError = (error) => {
    if (error.message.includes('Failed to fetch')) {
        throw new Error("Không thể kết nối Backend. Vui lòng kiểm tra Server.");
    }
    throw error;
};

export const api = {
    get: async (url) => {
        try {
            const res = await fetch(`${API_URL}${url}`, { headers: getHeaders() });
            return await handleResponse(res);
        } catch (error) { handleError(error); }
    },

    post: async (url, body) => {
        try {
            const res = await fetch(`${API_URL}${url}`, { method: "POST", headers: getHeaders(), body: body ? JSON.stringify(body) : null });
            return await handleResponse(res);
        } catch (error) { handleError(error); }
    },

    put: async (url, body) => {
        try {
            const res = await fetch(`${API_URL}${url}`, { method: "PUT", headers: getHeaders(), body: body ? JSON.stringify(body) : null });
            return await handleResponse(res);
        } catch (error) { handleError(error); }
    },

    delete: async (url) => {
        try {
            const res = await fetch(`${API_URL}${url}`, { method: "DELETE", headers: getHeaders() });
            return await handleResponse(res);
        } catch (error) { handleError(error); }
    },
};