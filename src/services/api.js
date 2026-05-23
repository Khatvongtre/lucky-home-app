import { authStorage } from "./authStorage";
import { fetchFromApi } from "./apiServer";

const getHeaders = () => {
    const token = authStorage.getToken();
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

const parseResponseBody = async (res) => {
    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const getErrorMessage = (result, fallback) => {
    if (result && typeof result === "object" && "message" in result) {
        return result.message;
    }
    if (typeof result === "string" && result.trim()) return result;
    return fallback;
};

const handleResponse = async (res) => {
    const result = await parseResponseBody(res);

    if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new Event("auth:unauthorized"));
        throw new Error(getErrorMessage(result, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."));
    }

    if (!res.ok) {
        throw new Error(getErrorMessage(result, `Lỗi máy chủ (${res.status})`));
    }

    return result;
};

const handleError = (error) => {
    if (error.message.includes("Failed to fetch")) {
        throw new Error("Không thể kết nối Backend. Vui lòng kiểm tra Server.");
    }
    throw error;
};

const request = async (url, options = {}) => {
    try {
        const res = await fetchFromApi(url, {
            ...options,
            cache: "no-store",
            headers: {
                ...getHeaders(),
                ...options.headers,
            },
        });
        return await handleResponse(res);
    } catch (error) {
        handleError(error);
    }
};

const jsonRequest = (method, url, body) => request(url, {
    method,
    body: body === undefined ? null : JSON.stringify(body),
});

export const api = {
    get: (url) => request(url),
    post: (url, body) => jsonRequest("POST", url, body),
    put: (url, body) => jsonRequest("PUT", url, body),
    delete: (url, body) => (
        body === undefined
            ? request(url, { method: "DELETE" })
            : jsonRequest("DELETE", url, body)
    ),
};
