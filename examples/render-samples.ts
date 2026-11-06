/**
 * Writes sample images to examples/out/ for visual review: `npm run samples`.
 * Logos here are plain coloured blocks; real projects pass their own logo files.
 */
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToPng } from '../src/node';

/** Draws a simple labelled block standing in for a brand logo. */
function block(text: string, w: number, h: number, color: string): Buffer {
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(h * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    return c.toBuffer('image/png');
}

const base = { bank: 'VCB', accountNo: '1234567890', accountName: 'Trần Thị B', amount: 150000, addInfo: 'nap tien user01' };

/** Renders one image per template into examples/out/. */
async function main() {
    mkdirSync('examples/out', { recursive: true });
    writeFileSync('examples/out/qr_only.png', await renderToPng({ ...base, template: 'qr_only' }));
    writeFileSync('examples/out/compact.png', await renderToPng({ ...base, template: 'compact', title: 'QR CHUYỂN KHOẢN' }));
    writeFileSync(
        'examples/out/print.png',
        await renderToPng({
            ...base,
            template: 'print',
            logos: {
                header: [block('LOGO HEADER', 360, 100, '#c62828')],
                footer: [block('NAPAS 247', 220, 80, '#1565c0'), block('BANK', 160, 80, '#2e7d32')],
                center: block('B', 100, 100, '#f9a825'),
            },
        }),
    );
    console.log('written to examples/out/');
}

main();
