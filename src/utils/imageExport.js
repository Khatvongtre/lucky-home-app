export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    // Đóng gói logic tạo ảnh vào một hàm bất đồng bộ
    const generateImageBlob = async () => {
        // Lấy chiều rộng thật của hóa đơn trên màn hình
        const width = el.offsetWidth;

        // Clone phần tử để render độc lập, tránh lỗi tọa độ Scroll và CSS Transform (nguyên nhân gây đẩy chữ)
        const clone = el.cloneNode(true);
        const wrapper = document.createElement('div');

        // Đặt wrapper ẩn, cố định ở góc (0,0) tuyệt đối để html2canvas vẽ tọa độ chuẩn xác 100%
        Object.assign(wrapper.style, {
            position: 'fixed',
            top: '0px',
            left: '-9999px',
            width: `${width}px`,
            zIndex: -1000,
            pointerEvents: 'none'
        });

        // Ép width cho clone, tắt shadow và margin để tránh html2canvas bị sai lệch padding
        Object.assign(clone.style, {
            margin: '0',
            transform: 'none',
            boxShadow: 'none',
            width: `${width}px`,
            maxWidth: `${width}px`
        });

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        try {
            const images = Array.from(wrapper.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            await document.fonts.ready;
            await new Promise(r => setTimeout(r, 200));

            if (!window.html2canvas) {
                throw new Error("Thư viện tạo ảnh chưa sẵn sàng, vui lòng tải lại trang.");
            }

            // Gọi html2canvas trên phần tử clone, triệt tiêu mọi hiệu ứng cuộn trang (scrollY, scrollX)
            const canvas = await window.html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: width,
                height: clone.offsetHeight, // Lấy đúng chiều cao thật sau khi clone đã render
                scrollY: 0,
                scrollX: 0
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            if (!blob) throw new Error("Dữ liệu ảnh rỗng.");
            return blob;
        } finally {
            if (document.body.contains(wrapper)) {
                document.body.removeChild(wrapper);
            }
        }
    };

    try {
        // Khắc phục lỗi Safari (iOS): Truyền trực tiếp Promise vào ClipboardItem để giữ ngữ cảnh thao tác
        await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': generateImageBlob() })
        ]);
        return true;
    } catch (error) {
        console.error("Lỗi xuất ảnh với Promise:", error);

        // Fallback: Nếu trình duyệt (Chrome cũ, Android) không hỗ trợ truyền Promise vào ClipboardItem
        try {
            const blob = await generateImageBlob();
            await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
            return true;
        } catch (fallbackError) {
            console.error("Lỗi Fallback:", fallbackError);
            throw new Error("Trình duyệt điện thoại không hỗ trợ Copy tự động. Vui lòng tự chụp màn hình.");
        }
    }
};