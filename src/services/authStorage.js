const TOKEN_KEY = 'smartstay_token';
const USER_KEY = 'smartstay_user';

export const authStorage = {
    getToken: () => localStorage.getItem(TOKEN_KEY),

    getUser: () => {
        const savedUser = localStorage.getItem(USER_KEY);
        if (!savedUser) return null;

        try {
            return JSON.parse(savedUser);
        } catch {
            return null;
        }
    },

    setSession: ({ token, user }) => {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    clearSession: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
};
