import jsQR from 'jsqr';

export const readQRFromFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) resolve(code.data);
                else reject(new Error("Không thể đọc mã QR. Vui lòng chọn ảnh rõ nét hơn."));
            };
            img.onerror = () => reject(new Error("Lỗi tải ảnh"));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Lỗi đọc file"));
        reader.readAsDataURL(file);
    });
};