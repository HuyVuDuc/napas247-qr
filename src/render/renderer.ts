import { resolveBank } from '../core/banks';
import { Napas247QrError } from '../core/errors';
import { createQrMatrix, type QrMatrix } from '../core/matrix';
import { buildPayload } from '../core/payload';
import { sanitizeAddInfo } from '../core/text';
import type { CanvasAdapter, CanvasLike, Ctx2D, DrawableImage, Labels, RenderInput, RenderResult } from './types';

/** Default Vietnamese labels for the "print" template. */
export const DEFAULT_LABELS: Labels = {
    accountName: 'Chủ tài khoản',
    accountNo: 'Số tài khoản',
    bank: 'Ngân hàng',
    amount: 'Số tiền',
    addInfo: 'Nội dung',
    currency: 'VND',
};

const DEFAULT_FONT = '"Be Vietnam Pro", Roboto, "Segoe UI", Arial, sans-serif';

/** One line of text in the details block of the "print" template. */
interface TextLine {
    text: string;
    font: string;
    lineHeight: number;
}

/** Formats an integer VND amount with dot thousand separators: 1500000 -> "1.500.000". */
export function formatAmount(amount: number | string): string {
    return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Greedy word wrap using the context's current font.
 * Words wider than `maxWidth` on their own (long account names, URLs) are split per character.
 */
function wrapText(ctx: Ctx2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let current = '';

    for (const word of text.split(' ')) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
            // Word fits on the current line.
            current = candidate;
            continue;
        }
        if (current) lines.push(current);

        if (ctx.measureText(word).width <= maxWidth) {
            // Word fits on a fresh line.
            current = word;
        } else {
            // Word alone is too wide: hard-break it into character chunks.
            let chunk = '';
            for (const ch of word) {
                if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
                    lines.push(chunk);
                    chunk = ch;
                } else {
                    chunk += ch;
                }
            }
            current = chunk;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/** Traces a rounded rectangle path (arcTo works in every canvas implementation, unlike roundRect). */
function roundedRectPath(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/**
 * Draws QR modules as filled squares. Module edges are snapped to whole device pixels
 * so neighbouring modules never leave hairline gaps that confuse scanners.
 */
function drawModules(ctx: Ctx2D, matrix: QrMatrix, x: number, y: number, size: number, quietZone: number, color: string): void {
    const cell = size / (matrix.size + quietZone * 2);
    ctx.fillStyle = color;
    for (let row = 0; row < matrix.size; row++) {
        for (let col = 0; col < matrix.size; col++) {
            if (!matrix.modules[row][col]) continue;
            const left = Math.round(x + (col + quietZone) * cell);
            const top = Math.round(y + (row + quietZone) * cell);
            const right = Math.round(x + (col + quietZone + 1) * cell);
            const bottom = Math.round(y + (row + quietZone + 1) * cell);
            ctx.fillRect(left, top, right - left, bottom - top);
        }
    }
}

/**
 * Lays out a row of logos centred horizontally, all scaled to the same height
 * and keeping their aspect ratio. Returns nothing; draws directly.
 */
function drawLogoRow(ctx: Ctx2D, images: DrawableImage[], centerX: number, top: number, height: number, gap: number): void {
    const widths = images.map((img) => (img.width / img.height) * height);
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * (images.length - 1);
    let x = centerX - total / 2;
    images.forEach((img, i) => {
        ctx.drawImage(img, x, top, widths[i], height);
        x += widths[i] + gap;
    });
}

/** Loads every image of a slot in parallel; wraps loader failures in RENDER_ERROR. */
async function loadAll<TImage>(adapter: CanvasAdapter<TImage, CanvasLike>, sources: TImage[] | undefined): Promise<DrawableImage[]> {
    if (!sources?.length) return [];
    try {
        return await Promise.all(sources.map((src) => adapter.loadImage(src)));
    } catch (err) {
        throw new Napas247QrError('RENDER_ERROR', `Could not load logo image: ${(err as Error)?.message ?? err}`);
    }
}

/**
 * Platform-independent renderer: builds the payload, lays out the chosen template and paints it
 * onto a canvas created by `adapter` (or onto `target` when provided, which is resized to fit).
 */
export async function renderWithAdapter<TImage, TCanvas extends CanvasLike>(
    adapter: CanvasAdapter<TImage, TCanvas>,
    input: RenderInput<TImage>,
    target?: TCanvas,
): Promise<RenderResult<TCanvas>> {
    const payload = buildPayload(input);
    const template = input.template ?? 'compact';
    const scale = input.scale ?? 1;
    const qrSize = input.qrSize ?? 480;
    const fg = input.foreground ?? '#000000';
    const bg = input.background ?? '#ffffff';
    const textColor = input.textColor ?? '#1f2937';
    const accent = input.accentColor ?? '#0b3b8c';
    const fontFamily = input.fontFamily ?? DEFAULT_FONT;
    const labels: Labels = { ...DEFAULT_LABELS, ...input.labels };

    // A center logo hides some modules, so default to a stronger error-correction level.
    const ecLevel = input.errorCorrectionLevel ?? (input.logos?.center ? 'Q' : 'M');
    const matrix = createQrMatrix(payload, ecLevel);

    // Load all logo images up front so layout knows which rows exist.
    const anyAdapter = adapter as unknown as CanvasAdapter<TImage, CanvasLike>;
    const [headerLogos, footerLogos, centerLogos] = await Promise.all([
        loadAll(anyAdapter, template === 'qr_only' ? undefined : input.logos?.header),
        loadAll(anyAdapter, template === 'qr_only' ? undefined : input.logos?.footer),
        loadAll(anyAdapter, input.logos?.center ? [input.logos.center] : undefined),
    ]);

    // ---- Layout -------------------------------------------------------------------------
    // Everything below is measured in CSS pixels; the context is scaled once before drawing.
    const isCard = template !== 'qr_only';
    const quietZone = input.quietZone ?? (isCard ? 2 : 4);
    const pad = isCard ? Math.round(qrSize * 0.06) : 0;
    const width = qrSize + pad * 2;
    const headerHeight = Math.round(qrSize * 0.1);
    const footerHeight = Math.round(qrSize * 0.085);
    const gap = Math.round(qrSize * 0.03);
    const titleFont = `bold ${Math.round(qrSize * 0.055)}px ${fontFamily}`;

    // Header: logos win over the title; neither -> no header row.
    const hasHeaderLogos = headerLogos.length > 0;
    const hasTitle = isCard && !hasHeaderLogos && !!input.title;
    const headerBlock = isCard && (hasHeaderLogos || hasTitle) ? headerHeight + gap : 0;
    const footerBlock = footerLogos.length ? footerHeight + gap : 0;

    // Details block (print only): measure wrapped lines with a throw-away canvas.
    const lines: TextLine[] = [];
    if (template === 'print') {
        const measureCanvas = adapter.createCanvas(1, 1);
        const mctx = measureCanvas.getContext('2d') as Ctx2D;
        const maxTextWidth = width - pad * 2;
        const nameSize = Math.round(qrSize * 0.05);
        const bodySize = Math.round(qrSize * 0.038);

        // Push one logical field, wrapped to as many physical lines as needed.
        const push = (text: string, font: string, size: number) => {
            mctx.font = font;
            for (const t of wrapText(mctx, text, maxTextWidth)) lines.push({ text: t, font, lineHeight: Math.round(size * 1.45) });
        };
        const bankName = input.bankName ?? resolveBank(input.bank).shortName;
        const nameFont = `bold ${nameSize}px ${fontFamily}`;
        const bodyFont = `${bodySize}px ${fontFamily}`;

        if (input.accountName) push(input.accountName.toUpperCase(), nameFont, nameSize);
        push(`${labels.bank}: ${bankName}`, bodyFont, bodySize);
        push(`${labels.accountNo}: ${String(input.accountNo).replace(/\s+/g, '')}`, bodyFont, bodySize);
        // Amount / content lines only appear when they are actually encoded in the QR.
        if (input.amount && Number(input.amount) > 0) push(`${labels.amount}: ${formatAmount(Number(input.amount))} ${labels.currency}`, bodyFont, bodySize);
        if (input.addInfo) push(`${labels.addInfo}: ${sanitizeAddInfo(input.addInfo)}`, bodyFont, bodySize);
    }
    const detailsBlock = lines.length ? gap + lines.reduce((sum, l) => sum + l.lineHeight, 0) : 0;
    const height = pad + headerBlock + qrSize + footerBlock + detailsBlock + pad;

    // ---- Canvas -------------------------------------------------------------------------
    const canvas = target ?? adapter.createCanvas(Math.round(width * scale), Math.round(height * scale));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d') as Ctx2D | null;
    if (!ctx) throw new Napas247QrError('RENDER_ERROR', 'Canvas 2D context is not available.');

    ctx.save();
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;

    // Background (rounded card with optional border, or a plain square for qr_only).
    ctx.fillStyle = bg;
    if (isCard) {
        const radius = Math.round(qrSize * 0.04);
        roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, radius);
        ctx.fill();
        if (input.border ?? true) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    } else {
        ctx.fillRect(0, 0, width, height);
    }

    let y = pad;

    // Header row.
    if (hasHeaderLogos) {
        drawLogoRow(ctx, headerLogos, width / 2, y, headerHeight, gap);
        y += headerBlock;
    } else if (hasTitle) {
        ctx.fillStyle = accent;
        ctx.font = titleFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(input.title!, width / 2, y + headerHeight / 2);
        y += headerBlock;
    }

    // QR code.
    const qrX = pad;
    const qrY = y;
    drawModules(ctx, matrix, qrX, qrY, qrSize, quietZone, fg);

    // Center logo on a white rounded plate (~20% of the code area).
    if (centerLogos.length) {
        const logo = centerLogos[0];
        const codeSize = (qrSize * matrix.size) / (matrix.size + quietZone * 2);
        const plate = Math.round(codeSize * 0.2);
        const px = qrX + (qrSize - plate) / 2;
        const py = qrY + (qrSize - plate) / 2;
        ctx.fillStyle = bg;
        roundedRectPath(ctx, px, py, plate, plate, plate * 0.18);
        ctx.fill();
        // Fit the logo inside the plate with a small inner margin, preserving aspect ratio.
        const inner = plate * 0.84;
        const ratio = Math.min(inner / logo.width, inner / logo.height);
        const lw = logo.width * ratio;
        const lh = logo.height * ratio;
        ctx.drawImage(logo, px + (plate - lw) / 2, py + (plate - lh) / 2, lw, lh);
    }
    y += qrSize;

    // Footer logo row.
    if (footerLogos.length) {
        y += gap;
        drawLogoRow(ctx, footerLogos, width / 2, y, footerHeight, gap * 2);
        y += footerHeight;
    }

    // Details text (print).
    if (lines.length) {
        y += gap;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (const line of lines) {
            ctx.font = line.font;
            ctx.fillText(line.text, width / 2, y);
            y += line.lineHeight;
        }
    }

    ctx.restore();
    return { canvas, payload };
}
