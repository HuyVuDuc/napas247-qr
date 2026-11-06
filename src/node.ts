/**
 * Node.js entry: renders QR cards with @napi-rs/canvas (prebuilt Skia binaries, no compiler needed).
 * @napi-rs/canvas is an optional peer dependency and is loaded lazily on the first render.
 */
import type { Canvas, Image } from '@napi-rs/canvas';
import { Napas247QrError } from './core/errors';
import { renderWithAdapter } from './render/renderer';
import type { CanvasAdapter, DrawableImage, RenderInput, RenderResult } from './render/types';

export * from './index';

/** Image sources accepted in Node: file path, http(s)/data URL, raw bytes, or a loaded Image. */
export type NodeImageSource = string | URL | Buffer | Uint8Array | ArrayBuffer | Image;
export type NodeRenderInput = RenderInput<NodeImageSource>;
export type NodeImageFormat = 'image/png' | 'image/jpeg' | 'image/webp';

type NapiCanvasModule = typeof import('@napi-rs/canvas');
let napiPromise: Promise<NapiCanvasModule> | undefined;

/**
 * Imports @napi-rs/canvas once and caches it. When the package is not installed,
 * a RENDER_ERROR explains how to fix it instead of a bare "module not found".
 */
function loadNapi(): Promise<NapiCanvasModule> {
    napiPromise ??= import('@napi-rs/canvas').catch((err) => {
        napiPromise = undefined;
        throw new Napas247QrError('RENDER_ERROR', `napas247-qr/node needs "@napi-rs/canvas": npm i @napi-rs/canvas (${err?.message ?? err})`);
    });
    return napiPromise;
}

/** Builds the Node adapter on top of the loaded @napi-rs/canvas module. */
function createNodeAdapter(napi: NapiCanvasModule): CanvasAdapter<NodeImageSource, Canvas> {
    return {
        createCanvas: (width, height) => napi.createCanvas(width, height),
        async loadImage(source) {
            // Already-decoded Image instances are drawable as-is.
            if (source instanceof napi.Image) return source as unknown as DrawableImage;
            // ArrayBuffer is normalised to Buffer; everything else is handled by napi.loadImage().
            const input = source instanceof ArrayBuffer ? Buffer.from(source) : source;
            return (await napi.loadImage(input as Parameters<NapiCanvasModule['loadImage']>[0])) as unknown as DrawableImage;
        },
    };
}

/** Renders the QR card onto a new @napi-rs/canvas Canvas. */
export async function renderToCanvas(input: NodeRenderInput): Promise<RenderResult<Canvas>> {
    const napi = await loadNapi();
    return renderWithAdapter(createNodeAdapter(napi), input);
}

/** Renders the QR card and encodes it (PNG by default; JPEG/WebP accept `quality` 0-100). */
export async function renderToBuffer(input: NodeRenderInput, format: NodeImageFormat = 'image/png', quality?: number): Promise<Buffer> {
    const { canvas } = await renderToCanvas(input);
    // PNG is lossless and takes no quality argument; the other formats do.
    if (format === 'image/png') return canvas.encode('png');
    return canvas.encode(format === 'image/jpeg' ? 'jpeg' : 'webp', quality);
}

/** Shorthand for a PNG buffer, e.g. `res.type('png').send(await renderToPng({...}))` in Express. */
export function renderToPng(input: NodeRenderInput): Promise<Buffer> {
    return renderToBuffer(input, 'image/png');
}

/**
 * Registers a font file (TTF/OTF/WOFF2) so card text renders with Vietnamese glyphs on servers
 * that have no suitable system font. Use the same family name in `fontFamily`.
 */
export async function registerFont(path: string, family: string): Promise<boolean> {
    const napi = await loadNapi();
    return !!napi.GlobalFonts.registerFromPath(path, family);
}
