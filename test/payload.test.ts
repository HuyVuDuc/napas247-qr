import { describe, expect, it } from 'vitest';
import {
    buildPayload,
    crc16,
    findBank,
    Napas247QrError,
    parsePayload,
    registerBank,
    resolveBank,
    sanitizeAddInfo,
} from '../src/index';

/**
 * Reference payloads decoded from img.vietqr.io images (2026-11-06) for the same inputs.
 * They prove byte-for-byte compatibility with what VietQR generates today.
 */
const VIETQR_VECTORS = [
    {
        input: { bank: 'MB', accountNo: '0123456789', addInfo: 'user01' },
        expected: '00020101021138540010A00000072701240006970422011001234567890208QRIBFTTA53037045802VN62100806user016304ED70',
    },
    {
        input: { bank: 'VCB', accountNo: '1234567890', addInfo: 'nap tien abc', amount: 150000 },
        expected: '00020101021238540010A00000072701240006970436011012345678900208QRIBFTTA530370454061500005802VN62160812nap tien abc6304A0D8',
    },
    {
        input: { bank: 'ACB', accountNo: '99887766', addInfo: 'Nạp tiền Đức' },
        expected: '00020101021138520010A000000727012200069704160108998877660208QRIBFTTA53037045802VN62160812Nap tien Duc63041F8C',
    },
];

describe('crc16', () => {
    it('matches the CRC-16/CCITT-FALSE check value', () => {
        expect(crc16('123456789')).toBe('29B1');
    });
});

describe('buildPayload', () => {
    it.each(VIETQR_VECTORS)('matches VietQR output for $input.bank', ({ input, expected }) => {
        expect(buildPayload(input)).toBe(expected);
    });

    it('accepts a raw BIN and an alias the same way as the short code', () => {
        const byCode = buildPayload({ bank: 'MB', accountNo: '0123456789' });
        expect(buildPayload({ bank: '970422', accountNo: '0123456789' })).toBe(byCode);
        expect(buildPayload({ bank: ' mbb ', accountNo: '0123456789' })).toBe(byCode);
    });

    it('treats amount 0 / empty as a static QR', () => {
        const p = buildPayload({ bank: 'VCB', accountNo: '1', amount: 0 });
        expect(p).toContain('010211');
        expect(p).not.toContain('5406');
    });

    it('uses QRIBFTTC for card transfers', () => {
        expect(buildPayload({ bank: 'VCB', accountNo: '9704361234567890', transferType: 'card' })).toContain('QRIBFTTC');
    });

    it('rejects invalid input with typed error codes', () => {
        const codeOf = (fn: () => unknown) => {
            try {
                fn();
            } catch (e) {
                return (e as Napas247QrError).code;
            }
            return null;
        };
        expect(codeOf(() => buildPayload({ bank: 'XYZ', accountNo: '1' }))).toBe('INVALID_BANK');
        expect(codeOf(() => buildPayload({ bank: 'VCB', accountNo: '12-34' }))).toBe('INVALID_ACCOUNT');
        expect(codeOf(() => buildPayload({ bank: 'VCB', accountNo: '1', amount: 1.5 }))).toBe('INVALID_AMOUNT');
        expect(codeOf(() => buildPayload({ bank: 'VCB', accountNo: '1', amount: -10 }))).toBe('INVALID_AMOUNT');
        expect(codeOf(() => buildPayload({ bank: 'VCB', accountNo: '1', addInfo: 'x'.repeat(96) }))).toBe('INVALID_ADD_INFO');
    });
});

describe('parsePayload', () => {
    it('round-trips every field', () => {
        const payload = buildPayload({ bank: 'VCB', accountNo: '1234567890', amount: 150000, addInfo: 'nap tien abc' });
        const parsed = parsePayload(payload);
        expect(parsed).toMatchObject({
            crcValid: true,
            isDynamic: true,
            bin: '970436',
            accountNo: '1234567890',
            transferType: 'account',
            amount: 150000,
            addInfo: 'nap tien abc',
            currency: '704',
            country: 'VN',
        });
        expect(parsed.bank?.code).toBe('VCB');
    });

    it('detects a tampered payload', () => {
        const tampered = VIETQR_VECTORS[0].expected.replace('0123456789', '0123456780');
        expect(() => parsePayload(tampered)).toThrowError(/CRC/);
        expect(parsePayload(tampered, { strict: false }).crcValid).toBe(false);
    });
});

describe('banks', () => {
    it('falls back to an unknown but well-formed BIN', () => {
        expect(resolveBank('123456').bin).toBe('123456');
    });

    it('lets callers register or override banks', () => {
        registerBank({ code: 'TESTBANK', bin: '999001', shortName: 'Test', name: 'Test Bank', aliases: ['TB'] });
        expect(findBank('tb')?.bin).toBe('999001');
        expect(() => registerBank({ code: 'BAD', bin: '12', shortName: 'x', name: 'x' })).toThrow(Napas247QrError);
    });
});

describe('sanitizeAddInfo', () => {
    it('strips diacritics, non-ASCII and extra spaces', () => {
        expect(sanitizeAddInfo('  Chuyển   khoản 🎉 Đơn #12 ')).toBe('Chuyen khoan Don #12');
    });
});
