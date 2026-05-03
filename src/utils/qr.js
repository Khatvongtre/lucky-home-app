export const parseVietQR = (qrString) => {
    let bin = '';
    let acc = '';
    try {
        let idx = 0;
        while (idx < qrString.length) {
            const tag = qrString.substring(idx, idx + 2);
            const len = parseInt(qrString.substring(idx + 2, idx + 4), 10);
            const val = qrString.substring(idx + 4, idx + 4 + len);

            if (tag === '38') {
                let subIdx = 0;
                while (subIdx < val.length) {
                    const subTag = val.substring(subIdx, subIdx + 2);
                    const subLen = parseInt(val.substring(subIdx + 2, subIdx + 4), 10);
                    const subVal = val.substring(subIdx + 4, subIdx + 4 + subLen);

                    if (subTag === '01') {
                        let innerIdx = 0;
                        while (innerIdx < subVal.length) {
                            const innerTag = subVal.substring(innerIdx, innerIdx + 2);
                            const innerLen = parseInt(subVal.substring(innerIdx + 2, innerIdx + 4), 10);
                            const innerVal = subVal.substring(innerIdx + 4, innerIdx + 4 + innerLen);

                            if (innerTag === '00') bin = innerVal;
                            if (innerTag === '01') acc = innerVal;
                            innerIdx += 4 + innerLen;
                        }
                    }
                    subIdx += 4 + subLen;
                }
            }
            idx += 4 + len;
        }
    } catch (err) { console.error("Lỗi giải mã QR", err); }
    return { bin, acc };
};

export const getBankNameFromBin = (bin) => {
    const banks = {
        '970422': 'MB BANK', '970436': 'VIETCOMBANK', '970407': 'TECHCOMBANK', '970415': 'VIETINBANK', '970418': 'BIDV', '970432': 'VPBANK', '970423': 'TPBANK', '970416': 'ACB', '970403': 'SACOMBANK', '970405': 'AGRIBANK', '970448': 'OCB', '970429': 'SCB', '970414': 'OCEANBANK', '970437': 'HDBANK', '970425': 'ABBANK'
    };
    return banks[bin] || 'Ngân hàng khác';
};