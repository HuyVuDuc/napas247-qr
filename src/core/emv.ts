import { Napas247QrError } from './errors';

/**
 * A single decoded EMVCo TLV field.
 * `children` is filled only for templates whose value is itself a TLV list (tags 26-51, 62, 64...).
 */
export interface TlvField {
    id: string;
    length: number;
    value: string;
    children?: TlvField[];
}

/**
 * Encodes one EMVCo TLV field: 2-digit ID + 2-digit length + value.
 * Throws when the value is longer than 99 characters because the length field
 * only has two digits.
 */
export function tlv(id: string, value: string): string {
    if (value.length > 99) {
        throw new Napas247QrError('INVALID_PAYLOAD', `Field ${id} is ${value.length} chars long; EMVCo fields are limited to 99.`);
    }
    return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

/**
 * Computes CRC-16/CCITT-FALSE (polynomial 0x1021, initial value 0xFFFF, no reflection, no final XOR),
 * the checksum required by EMVCo tag 63. Returns 4 upper-case hex characters.
 *
 * The input must already end with "6304" (tag + length of the CRC field itself).
 */
export function crc16(input: string): string {
    let crc = 0xffff;
    for (let i = 0; i < input.length; i++) {
        // Feed one byte (payload is ASCII-only, so one char = one byte) into the high byte.
        crc ^= (input.charCodeAt(i) & 0xff) << 8;
        for (let bit = 0; bit < 8; bit++) {
            // Shift left; when the bit falling off is 1, XOR with the polynomial.
            crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Splits an EMVCo string into a flat list of TLV fields (one nesting level).
 * Throws INVALID_PAYLOAD when an ID/length header is malformed or a value runs past the end.
 */
export function parseTlv(input: string): TlvField[] {
    const fields: TlvField[] = [];
    let pos = 0;
    while (pos < input.length) {
        // Every field needs at least a 4-char header (ID + length).
        if (pos + 4 > input.length) {
            throw new Napas247QrError('INVALID_PAYLOAD', `Truncated TLV header at position ${pos}.`);
        }
        const id = input.slice(pos, pos + 2);
        const lenText = input.slice(pos + 2, pos + 4);
        if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenText)) {
            throw new Napas247QrError('INVALID_PAYLOAD', `Malformed TLV header "${id}${lenText}" at position ${pos}.`);
        }
        const length = Number(lenText);
        const value = input.slice(pos + 4, pos + 4 + length);
        if (value.length !== length) {
            throw new Napas247QrError('INVALID_PAYLOAD', `Field ${id} declares length ${length} but only ${value.length} chars remain.`);
        }
        fields.push({ id, length, value });
        pos += 4 + length;
    }
    return fields;
}
