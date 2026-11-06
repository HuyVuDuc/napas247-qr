/**
 * Browser entry: renders QR cards with the DOM canvas (or OffscreenCanvas inside workers).
 */
import { Napas247QrError } from './core/errors';
import { renderWithAdapter } from './render/renderer';
import type { CanvasAdapter, DrawableImage, RenderInput, RenderResult } from './render/types';

export * from './index';

/** Image sources accepted in the browser: a URL / data URI, or an already-created drawable. */
export type BrowserImageSource = string | HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas | SVGImageElement;
export type BrowserRenderInput = RenderInput<BrowserImageSource>;
type BrowserCanvas = HTMLCanvasElement | OffscreenCanvas;

/**
 * Loads a URL into an HTMLImageElement.
 * `crossOrigin = "anonymous"` keeps the canvas untainted so toDataURL()/toBlob() still work;
 * the image host must then send CORS headers (same-origin assets always work).
 */
function loadUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image ${url.slice(0, 80)}`));
        img.src = url;
    });
}

/** Browser adapter: DOM canvas when `document` exists, OffscreenCanvas otherwise (web workers). */
const browserAdapter: CanvasAdapter<BrowserImageSource, BrowserCanvas> = {
    createCanvas(width, height) {
        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            return canvas;
        }
        if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
        throw new Napas247QrError('RENDER_ERROR', 'No canvas implementation available (no document / OffscreenCanvas).');
    },
    async loadImage(source) {
        // String -> fetch it; HTMLImageElement -> wait until decoded; anything else is already drawable.
        if (typeof source === 'string') return loadUrl(source);
        if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement && !source.complete) {
            await source.decode();
        }
        return source as unknown as DrawableImage;
    },
};

/**
 * Renders the QR card. Pass `target` to draw into an existing <canvas> (it is resized),
 * otherwise a new canvas is created. Resolves with the canvas and the encoded payload.
 */
export function renderToCanvas<T extends BrowserCanvas = HTMLCanvasElement>(
    input: BrowserRenderInput,
    target?: T,
): Promise<RenderResult<T>> {
    return renderWithAdapter(browserAdapter as unknown as CanvasAdapter<BrowserImageSource, T>, input, target);
}

/** Renders the QR card and returns it as a data URL (PNG by default), ready for <img src>. */
export async function toDataURL(input: BrowserRenderInput, type = 'image/png', quality?: number): Promise<string> {
    const { canvas } = await renderToCanvas<HTMLCanvasElement>(input);
    return canvas.toDataURL(type, quality);
}

/** Renders the QR card as a Blob, e.g. for download links or uploads. */
export async function toBlob(input: BrowserRenderInput, type = 'image/png', quality?: number): Promise<Blob> {
    const { canvas } = await renderToCanvas<BrowserCanvas>(input);
    // OffscreenCanvas exposes convertToBlob(); HTMLCanvasElement uses the callback-style toBlob().
    if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality });
    return new Promise((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Napas247QrError('RENDER_ERROR', 'canvas.toBlob() returned null.'))),
            type,
            quality,
        );
    });
}
