import { domToBlob } from 'modern-screenshot';

export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    // 1. Lấy chính xác kích thước thực tế đang hiển thị trên màn hình
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    // 2. Clone phần tử để tránh các lỗi liên quan đến Scroll Offset (cắt xén ảnh)
    const clone = el.cloneNode(true);
    const wrapper = document.createElement('div');

    // 3. Đặt wrapper ở chế độ fixed, off-screen với kích thước cố định
    Object.assign(wrapper.style, {
        position: 'fixed',
        top: '-9999px',
        left: '0px',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: -1000,
        pointerEvents: 'none',
        overflow: 'visible'
    });

    // 4. Ép kích thước clone chính xác bằng phần tử gốc, xóa margin auto để không bị lệch
    Object.assign(clone.style, {
        margin: '0',
        width: `${width}px`,
        height: `${height}px`,
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

        // Dùng domToBlob xuất thẳng ra Blob (tốt hơn domToCanvas -> toBlob)
        const blob = await domToBlob(clone, {
            scale: 3, // Nét hơn trên điện thoại
            width: width,
            height: height,
            backgroundColor: '#ffffff',
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