import type { ErrorCorrectionLevel } from '../core/matrix';
import type { PaymentInfo } from '../core/payload';

/**
 * Output layouts:
 * - qr_only: just the QR code with its quiet zone.
 * - compact: white card with optional header logos, the QR, and optional footer logos.
 * - print:   compact + beneficiary details (name, account, amount, content) under the QR.
 */
export type Template = 'qr_only' | 'compact' | 'print';

/** Text labels used by the "print" template; defaults are Vietnamese. */
export interface Labels {
    accountName: string;
    accountNo: string;
    bank: string;
    amount: string;
    addInfo: string;
    currency: string;
}

/**
 * Logo slots. Images are supplied by the host project (the library ships no brand assets):
 * - header: row above the QR (e.g. VietQR logo), drawn left-to-right.
 * - footer: row below the QR (e.g. NAPAS 247 + bank logo).
 * - center: small logo on a white plate in the middle of the QR; raises error correction to Q.
 */
export interface Logos<TImage> {
    header?: TImage[];
    footer?: TImage[];
    center?: TImage;
}

/** Visual options shared by every platform. All sizes are in CSS pixels before `scale`. */
export interface RenderOptions<TImage> {
    template?: Template;
    /** Side length of the QR area (modules + quiet zone). Default 480. */
    qrSize?: number;
    /** Quiet-zone width in modules. Default 2 inside a card, 4 for qr_only. */
    quietZone?: number;
    /** Default "M", or "Q" when a center logo is present. */
    errorCorrectionLevel?: ErrorCorrectionLevel;
    /** Pixel ratio multiplier for sharp output on HiDPI screens / print. Default 1. */
    scale?: number;
    foreground?: string;
    background?: string;
    textColor?: string;
    /** Color of the title text and card border. */
    accentColor?: string;
    fontFamily?: string;
    /** Draw a rounded border around the card (compact/print). Default true. */
    border?: boolean;
    /** Header text shown when no header logos are provided (compact/print). */
    title?: string;
    /** Display-only beneficiary name (not part of the QR payload). */
    accountName?: string;
    /** Display-only bank name; defaults to the resolved bank's short name. */
    bankName?: string;
    labels?: Partial<Labels>;
    logos?: Logos<TImage>;
}

/** Full input of a render call: payment data + visual options. */
export type RenderInput<TImage> = PaymentInfo & RenderOptions<TImage>;

/** Anything drawable that exposes its intrinsic size (HTMLImageElement, ImageBitmap, @napi-rs Image...). */
export interface DrawableImage {
    width: number;
    height: number;
}

/**
 * Minimal 2D context surface used by the renderer. Both the DOM CanvasRenderingContext2D and
 * @napi-rs/canvas SKRSContext2D satisfy it, which lets one drawing routine serve both platforms.
 */
export interface Ctx2D {
    fillStyle: unknown;
    strokeStyle: unknown;
    lineWidth: number;
    font: string;
    textAlign: string;
    textBaseline: string;
    imageSmoothingEnabled: boolean;
    save(): void;
    restore(): void;
    scale(x: number, y: number): void;
    fillRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number): void;
    measureText(text: string): { width: number };
    beginPath(): void;
    moveTo(x: number, y: number): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
    closePath(): void;
    fill(): void;
    stroke(): void;
    drawImage(image: any, dx: number, dy: number, dw: number, dh: number): void;
}

/** Minimal canvas surface (DOM canvas, OffscreenCanvas, @napi-rs Canvas). */
export interface CanvasLike {
    width: number;
    height: number;
    getContext(type: '2d'): unknown;
}

/** Platform glue injected into the shared renderer. */
export interface CanvasAdapter<TImage, TCanvas extends CanvasLike> {
    createCanvas(width: number, height: number): TCanvas;
    loadImage(source: TImage): Promise<DrawableImage>;
}

/** Result of a render: the canvas plus the exact payload encoded in it. */
export interface RenderResult<TCanvas> {
    canvas: TCanvas;
    payload: string;
}
