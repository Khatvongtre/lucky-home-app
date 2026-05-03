import { domToBlob } from 'modern-screenshot';

export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    try {
        // Đợi tất cả ảnh (như QR code) tải xong trực tiếp trên giao diện gốc
        const images = Array.from(el.querySelectorAll('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }));

        // Đợi font chữ và CSS áp dụng hoàn toàn
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 200));

        // Lấy kích thước thực tế đang hiển thị
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        // Thư viện sẽ tự clone ngầm và bảo toàn CSS chuẩn xác
        const blob = await domToBlob(el, {
            scale: 3, // Phóng to 3x để ảnh nét căng
            width: width,
            height: height,
            backgroundColor: '#ffffff',
            style: {
                margin: '0',
                transform: 'none',
                boxShadow: 'none',
                maxWidth: 'none',
                // Khắc phục lỗi rớt dòng/đè chữ trên WebKit (iOS Safari / Chrome Mobile)
                WebkitTextSizeAdjust: '100%',
                fontKerning: 'normal',
                textRendering: 'optimizeLegibility'
            }
        });

        if (!blob) throw new Error("Dữ liệu ảnh rỗng.");

        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
    } catch (error) {
        console.error("Lỗi xuất ảnh:", error);
        throw new Error("Lỗi khi tạo ảnh. Đảm bảo trình duyệt hỗ trợ Copy Image.");
    }
};