import { useState, useRef } from 'react';

export const useToast = () => {
    const [toast, setToast] = useState(null);
    const timer = useRef();

    const showToast = (text) => {
        setToast({ text });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 3000);
    };

    return { toast, showToast };
};