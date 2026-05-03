export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    // Đóng gói logic tạo ảnh vào một hàm bất đồng bộ
    const generateImageBlob = async () => {
        const images = Array.from(el.querySelectorAll('img'));
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

        const canvas = await window.html2canvas(el, {
            scale: 2, // Giảm xuống 2 để tránh lỗi văng bộ nhớ (Crash Canvas) trên điện thoại
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: el.scrollWidth,
            windowHeight: el.scrollHeight
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
        if (!blob) throw new Error("Dữ liệu ảnh rỗng.");
        return blob;
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