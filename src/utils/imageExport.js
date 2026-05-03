import { domToBlob } from 'modern-screenshot';

export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    // 1. Lấy chính xác kích thước thực tế đang hiển thị trên màn hình
    const width = el.offsetWidth;

    // 2. Clone phần tử
    const clone = el.cloneNode(true);
    const wrapper = document.createElement('div');

    // 3. Đặt wrapper ở chế độ absolute, đẩy hoàn toàn ra khỏi khung nhìn để tránh bị đè layout trên mobile
    Object.assign(wrapper.style, {
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        width: `${width}px`,
        zIndex: -1000,
        pointerEvents: 'none',
        margin: '0'
    });

    // 4. Ép kích thước clone chính xác bằng phần tử gốc, xóa margin auto để không bị lệch
    Object.assign(clone.style, {
        margin: '0',
        width: `${width}px`,
        height: 'auto', // Để auto để khung tự giãn nếu font chữ trên điện thoại bẻ dòng khác PC
        maxWidth: 'none',
        transform: 'none',
        boxShadow: 'none'
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
        // Đợi tất cả ảnh (QR code) tải xong
        const images = Array.from(clone.querySelectorAll('img'));
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

        // 5. Tính lại height thực tế sau khi clone đã render font đầy đủ
        const cloneHeight = clone.offsetHeight;

        // Dùng domToBlob xuất thẳng ra Blob
        const blob = await domToBlob(clone, {
            scale: 3, // Nét hơn trên điện thoại
            width: width,
            height: cloneHeight, // Dùng chiều cao chuẩn vừa lấy
            backgroundColor: '#ffffff',
            style: {
                // Khắc phục triệt để lỗi đè font/rớt chữ trên iOS Safari & Chrome Mobile
                WebkitTextSizeAdjust: '100%',
                fontKerning: 'normal'
            }
        });

        if (!blob) throw new Error("Dữ liệu ảnh rỗng.");

        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
    } catch (error) {
        console.error("Lỗi xuất ảnh:", error);
        throw new Error("Lỗi khi tạo ảnh. Đảm bảo trình duyệt hỗ trợ Copy Image.");
    } finally {
        if (document.body.contains(wrapper)) {
            document.body.removeChild(wrapper);
        }
    }
};