export const formatN = (num) => {
    if (!num && num !== 0) return "0";
    const n = typeof num === 'string' ? num.replace(/\./g, "") : num;
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseN = (val) => {
    if (typeof val !== 'string') return val;
    return parseInt(val.replace(/\./g, "")) || 0;
};