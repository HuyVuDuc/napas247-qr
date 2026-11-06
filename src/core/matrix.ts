import qrcode from 'qrcode-generator';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/** Square QR module matrix: `modules[row][col] === true` means a dark module. */
export interface QrMatrix {
    size: number;
    modules: boolean[][];
}

/**
 * Encodes a payload into a QR module matrix (auto version, byte mode).
 * The payload produced by `buildPayload()` is pure ASCII, so byte mode equals the raw string.
 */
export function createQrMatrix(payload: string, errorCorrectionLevel: ErrorCorrectionLevel = 'M'): QrMatrix {
    const qr = qrcode(0, errorCorrectionLevel);
    qr.addData(payload, 'Byte');
    qr.make();

    const size = qr.getModuleCount();
    const modules: boolean[][] = [];
    for (let row = 0; row < size; row++) {
        const line: boolean[] = [];
        for (let col = 0; col < size; col++) line.push(qr.isDark(row, col));
        modules.push(line);
    }
    return { size, modules };
}
