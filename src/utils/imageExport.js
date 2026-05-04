import { domToPng } from 'modern-screenshot';

export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

    const generateImageBlob = async () => {
        const width = el.offsetWidth;

        const clone = el.cloneNode(true);
        const wrapper = document.createElement('div');

        Object.assign(wrapper.style, {
            position: 'fixed',
            top: '0',
            left: '-99999px',
            width: `${width}px`,
            zIndex: -1,
            pointerEvents: 'none',
            margin: '0',
            padding: '0',
        });

        Object.assign(clone.style, {
            margin: '0',
            transform: 'none',
            boxShadow: 'none',
            width: `${width}px`,
            maxWidth: 'none',
        });

        // ✅ FIX INPUT -> SPAN
        clone.querySelectorAll('input').forEach(input => {
            const span = document.createElement('span');
            span.textContent = input.value || '';
            span.className = input.className;
            span.style.display = 'inline-block';
            input.replaceWith(span);
        });

        // ✅ FIX CHỮ DÍNH (QUAN TRỌNG NHẤT)
        clone.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);

            if (style.letterSpacing === 'normal') {
                el.style.letterSpacing = '0.02em';
            }

            el.style.fontKerning = 'none';
            el.style.textRendering = 'auto';
        });

        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        try {
            // ✅ Đợi ảnh load
            const images = Array.from(wrapper.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            // ✅ FIX FONT (Safari cực kỳ cần)
            await document.fonts.ready;
            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => setTimeout(r, 300));

            const height = clone.offsetHeight;

            const dataUrl = await domToPng(clone, {
                scale: isMobile ? 2 : 3, // 🔥 fix mobile
                width,
                height,
                backgroundColor: '#ffffff',
                style: {
                    margin: '0',
                    transform: 'none',
                    boxShadow: 'none',
                    maxWidth: 'none',
                    WebkitTextSizeAdjust: '100%',
                    fontKerning: 'none',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'auto'
                }
            });

            if (!dataUrl) throw new Error("Dữ liệu ảnh rỗng");

            const blob = await (await fetch(dataUrl)).blob();
            return blob;

        } finally {
            if (document.body.contains(wrapper)) {
                document.body.removeChild(wrapper);
            }
        }
    };

    try {
        // ✅ Safari fix (giữ gesture)
        await navigator.clipboard.write([
            new window.ClipboardItem({
                'image/png': generateImageBlob()
            })
        ]);
        return true;
    } catch (error) {
        console.warn("Fallback clipboard:", error);

        try {
            const blob = await generateImageBlob();
            await navigator.clipboard.write([
                new window.ClipboardItem({ 'image/png': blob })
            ]);
            return true;
        } catch (err) {
            console.error(err);
            throw new Error("Điện thoại không hỗ trợ copy ảnh. Hãy chụp màn hình.");
        }
    }
};