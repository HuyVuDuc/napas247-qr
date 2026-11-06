import { createCanvas, loadImage } from '@napi-rs/canvas';
import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { renderToBuffer, renderToPng, type NodeRenderInput } from '../src/node';

/** Decodes the first QR code in an encoded image buffer (PNG/JPEG/WebP). */
async function decode(buffer: Buffer): Promise<string | undefined> {
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    return jsQR(data.data, img.width, img.height)?.data;
}

/** Creates a solid-colour PNG used as a stand-in logo (the library ships no brand assets). */
function fakeLogo(width: number, height: number, color: string): Buffer {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    return canvas.toBuffer('image/png');
}

const BASE: NodeRenderInput = {
    bank: 'VCB',
    accountNo: '1234567890',
    accountName: 'Trần Thị B',
    amount: 150000,
    addInfo: 'nap tien abc',
};

describe('node renderer', () => {
    it.each(['qr_only', 'compact', 'print'] as const)('renders a scannable %s image', async (template) => {
        const png = await renderToPng({ ...BASE, template, title: 'QR CHUYỂN KHOẢN' });
        expect(png.subarray(1, 4).toString()).toBe('PNG');
        expect(await decode(png)).toBe(
            '00020101021238540010A00000072701240006970436011012345678900208QRIBFTTA530370454061500005802VN62160812nap tien abc6304A0D8',
        );
    });

    it('stays scannable with header, footer and center logos', async () => {
        const png = await renderToPng({
            ...BASE,
            template: 'print',
            logos: {
                header: [fakeLogo(300, 100, '#d32f2f')],
                footer: [fakeLogo(200, 80, '#1565c0'), fakeLogo(160, 80, '#2e7d32')],
                center: fakeLogo(100, 100, '#f9a825'),
            },
        });
        expect(await decode(png)).toContain('QRIBFTTA');
    });

    it('wraps long text and grows the card instead of overflowing', async () => {
        const short = await loadImage(await renderToPng({ ...BASE, template: 'print' }));
        const long = await loadImage(
            await renderToPng({ ...BASE, template: 'print', accountName: 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ ĐẦU TƯ PHÁT TRIỂN CÔNG NGHỆ' }),
        );
        expect(long.width).toBe(short.width);
        expect(long.height).toBeGreaterThan(short.height);
    });

    it('applies the scale factor and other output formats', async () => {
        const x1 = await loadImage(await renderToPng({ ...BASE, template: 'qr_only' }));
        const x2buf = await renderToBuffer({ ...BASE, template: 'qr_only', scale: 2 }, 'image/jpeg', 90);
        const x2 = await loadImage(x2buf);
        expect(x2.width).toBe(x1.width * 2);
        expect(await decode(x2buf)).toContain('970436');
    });

    it('reports bad logo sources as RENDER_ERROR', async () => {
        await expect(renderToPng({ ...BASE, logos: { header: [Buffer.from('not an image')] } })).rejects.toMatchObject({ code: 'RENDER_ERROR' });
    });
});
