import { toPng } from 'html-to-image';

const withCacheBust = (src, exportToken) => {
    try {
        const url = new URL(src, window.location.href);
        url.searchParams.set('_export', exportToken);
        return url.toString();
    } catch {
        return src;
    }
};

const waitForImage = async (img) => {
    if (img.decode) {
        try {
            await img.decode();
            return;
        } catch {
            // Fall back to load/error listeners below.
        }
    }

    if (img.complete && img.naturalWidth > 0) return;

    await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
    });
};

const imageElementToDataUrl = async (img) => {
    await waitForImage(img);

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) throw new Error('Image is not ready');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/png');
};

const fetchImageAsDataUrl = async (src, exportToken) => {
    const res = await fetch(withCacheBust(src, exportToken), {
        cache: 'no-store',
        credentials: 'include'
    });
    if (!res.ok) throw new Error('Cannot load image');

    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const hideBrokenImage = (img) => {
    const linkedTile = img.closest('a');
    const target = linkedTile || img;

    target.style.display = 'none';
    target.setAttribute('data-export-hidden-image', 'true');
};

const inlineRenderedImages = async (sourceRoot, cloneRoot, exportToken) => {
    const sourceImages = Array.from(sourceRoot.querySelectorAll('img'));
    const cloneImages = Array.from(cloneRoot.querySelectorAll('img'));

    await Promise.all(cloneImages.map(async (cloneImg, index) => {
        const sourceImg = sourceImages[index];
        const src = sourceImg?.currentSrc || sourceImg?.src || cloneImg.getAttribute('src') || cloneImg.src;
        if (!src) return;

        cloneImg.removeAttribute('srcset');
        cloneImg.crossOrigin = 'anonymous';

        try {
            cloneImg.src = await imageElementToDataUrl(sourceImg);
        } catch {
            try {
                cloneImg.src = await fetchImageAsDataUrl(src, exportToken);
            } catch {
                hideBrokenImage(cloneImg);
            }
        }
    }));
};

export const exportToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Giao diện chưa sẵn sàng, vui lòng thử lại sau");

    const generateImageBlob = async () => {
        const width = el.offsetWidth;

        const clone = el.cloneNode(true);
        const wrapper = document.createElement('div');
        const exportToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

        clone.querySelectorAll('input').forEach(input => {
            const span = document.createElement('span');
            span.textContent = input.value || '';
            span.className = input.className;
            span.style.display = 'inline-block';
            input.replaceWith(span);
        });

        await inlineRenderedImages(el, clone, exportToken);

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
            const images = Array.from(wrapper.querySelectorAll('img'));
            await Promise.all(images.map(waitForImage));

            await document.fonts.ready;
            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => setTimeout(r, 300));

            const height = clone.offsetHeight;

            const dataUrl = await toPng(clone, {
                pixelRatio: 3,
                width,
                height,
                backgroundColor: '#ffffff',
                cacheBust: true,
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

            return await (await fetch(dataUrl)).blob();
        } finally {
            if (document.body.contains(wrapper)) {
                document.body.removeChild(wrapper);
            }
        }
    };

    try {
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
