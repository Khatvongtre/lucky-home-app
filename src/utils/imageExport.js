import { domToPng } from 'modern-screenshot';

export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    // Đóng gói logic tạo ảnh vào một hàm bất đồng bộ
    const generateImageBlob = async () => {
        // Lấy chiều rộng thật của hóa đơn trên màn hình
        const width = el.offsetWidth;

        // Clone phần tử
        const clone = el.cloneNode(true);
        const wrapper = document.createElement('div');

        // Đặt wrapper ở chế độ absolute, đẩy hoàn toàn ra khỏi khung nhìn để tránh bị đè layout trên mobile
        Object.assign(wrapper.style, {
            position: 'absolute',
            top: '0px',
            left: '-9999px',
            width: `${width}px`,
            zIndex: -1,
            pointerEvents: 'none',
            margin: '0',
            padding: '0',
        });

        // Ép width cho clone, tắt shadow và margin để tránh html2canvas bị sai lệch padding
        Object.assign(clone.style, {
            margin: '0',
            transform: 'none',
            boxShadow: 'none',
            width: `${width}px`,
            maxWidth: 'none',
        });

        // FIX CỰC MẠNH: Thay thế ô <input> nhập giảm giá thành văn bản <span>
        // Khắc phục triệt để lỗi html2canvas render padding ô input làm đẩy/xô lệch layout các chữ khác
        const inputs = clone.querySelectorAll('input');
        inputs.forEach(input => {
            const span = document.createElement('span');
            span.textContent = input.value;
            span.className = input.className; // Kế thừa nguyên vẹn class của Tailwind
            span.style.display = 'inline-block';
            input.parentNode.replaceChild(span, input);
        });

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        try {
            // Đợi ảnh bên trong clone tải xong
            const images = Array.from(wrapper.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            await document.fonts.ready;
            await new Promise(r => setTimeout(r, 250)); // Tăng thời gian chờ

            const height = clone.offsetHeight;

            const dataUrl = await domToPng(clone, {
                scale: 3,
                width: width,
                height: height,
                backgroundColor: '#ffffff',
                style: {
                    margin: '0',
                    transform: 'none',
                    boxShadow: 'none',
                    maxWidth: 'none',
                    WebkitTextSizeAdjust: '100%',
                    fontKerning: 'normal',
                    textRendering: 'optimizeLegibility'
                }
            });

            if (!dataUrl) throw new Error("Dữ liệu ảnh rỗng.");

            // Chuyển đổi chuỗi base64 (Data URL) thành định dạng Blob để lưu vào Clipboard
            const blob = await (await fetch(dataUrl)).blob();
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