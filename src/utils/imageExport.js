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

        if (!window.html2canvas) {
            throw new Error("Thư viện tạo ảnh chưa sẵn sàng, vui lòng tải lại trang.");
        }

        // Sử dụng html2canvas để vẽ từng pixel, tránh lỗi WebKit foreignObject làm đè chữ
        const canvas = await window.html2canvas(el, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: el.scrollWidth,
            windowHeight: el.scrollHeight
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));

        if (!blob) throw new Error("Dữ liệu ảnh rỗng.");

        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
    } catch (error) {
        console.error("Lỗi xuất ảnh:", error);
        throw new Error("Lỗi khi tạo ảnh. Đảm bảo trình duyệt hỗ trợ Copy Image.");
    }
};