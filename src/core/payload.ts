import { findBank, resolveBank, type BankInfo } from './banks';
import { crc16, parseTlv, tlv, type TlvField } from './emv';
import { Napas247QrError } from './errors';
import { sanitizeAddInfo } from './text';

/** NAPAS global unique identifier (AID) placed in tag 38/00. */
export const NAPAS_GUID = 'A000000727';

/**
 * NAPAS 247 service codes (tag 38/02):
 * - account: QRIBFTTA, transfer to a bank account number.
 * - card:    QRIBFTTC, transfer to a domestic card number.
 */
export const SERVICE_CODES = { account: 'QRIBFTTA', card: 'QRIBFTTC' } as const;
export type TransferType = keyof typeof SERVICE_CODES;

/** Input describing one bank transfer. */
export interface PaymentInfo {
    /** Bank short code ("VCB", "MB"...), alias, or 6-digit NAPAS BIN. */
    bank: string;
    /** Beneficiary account number (or card number when transferType = "card"). */
    accountNo: string;
    /** Amount in VND (integer). Omit or 0 for a static QR where the payer types the amount. */
    amount?: number | string;
    /** Transfer content. Diacritics are removed automatically. */
    addInfo?: string;
    /** "account" (default) or "card". */
    transferType?: TransferType;
}

/** Maximum transfer content length: tag 62 holds at most 99 chars, minus 4 for the 08 sub-tag header. */
export const MAX_ADD_INFO_LENGTH = 95;

/**
 * Validates the amount and returns its canonical string form, or undefined for a static QR.
 * EMVCo tag 54 allows up to 13 chars; VND has no minor unit, so only positive integers are accepted.
 */
function normalizeAmount(amount: PaymentInfo['amount']): string | undefined {
    // Empty / zero amount means "let the payer enter it" -> no tag 54, static QR.
    if (amount === undefined || amount === null || amount === '' || Number(amount) === 0) return undefined;

    const text = String(amount).trim();
    if (!/^\d+$/.test(text) || text.length > 13) {
        throw new Napas247QrError('INVALID_AMOUNT', `Amount "${amount}" must be a positive integer (VND) with at most 13 digits.`);
    }
    return String(Number(text));
}

/**
 * Validates the account/card number. Bank account numbers are alphanumeric in a few banks,
 * so letters and digits are allowed; spaces are removed.
 */
function normalizeAccountNo(accountNo: string): string {
    const text = String(accountNo ?? '').replace(/\s+/g, '');
    if (!/^[0-9A-Za-z]{1,19}$/.test(text)) {
        throw new Napas247QrError('INVALID_ACCOUNT', `Account number "${accountNo}" must be 1-19 letters/digits.`);
    }
    return text;
}

/**
 * Builds the NAPAS 247 (VietQR) EMVCo payload string that is encoded into the QR.
 *
 * Layout:
 *   00 Payload format indicator = "01"
 *   01 Point of initiation      = "11" static (no amount) | "12" dynamic (amount present)
 *   38 Merchant account info    = 00 NAPAS GUID, 01 {00 BIN, 01 account}, 02 service code
 *   53 Currency                 = "704" (VND)
 *   54 Amount                   (optional)
 *   58 Country                  = "VN"
 *   62 Additional data          = 08 purpose / transfer content (optional)
 *   63 CRC16                    over everything before it, including "6304"
 */
export function buildPayload(info: PaymentInfo): string {
    const bank = resolveBank(info.bank);
    const accountNo = normalizeAccountNo(info.accountNo);
    const amount = normalizeAmount(info.amount);
    const addInfo = info.addInfo ? sanitizeAddInfo(info.addInfo) : '';
    const service = SERVICE_CODES[info.transferType ?? 'account'];

    // Content longer than what tag 62 can carry is rejected instead of silently cut.
    if (addInfo.length > MAX_ADD_INFO_LENGTH) {
        throw new Napas247QrError('INVALID_ADD_INFO', `Transfer content is ${addInfo.length} chars; max is ${MAX_ADD_INFO_LENGTH}.`);
    }

    const beneficiary = tlv('00', bank.bin) + tlv('01', accountNo);
    const merchantInfo = tlv('00', NAPAS_GUID) + tlv('01', beneficiary) + tlv('02', service);

    let payload = tlv('00', '01') + tlv('01', amount ? '12' : '11') + tlv('38', merchantInfo) + tlv('53', '704');
    if (amount) payload += tlv('54', amount);
    payload += tlv('58', 'VN');
    if (addInfo) payload += tlv('62', tlv('08', addInfo));

    // CRC covers the "6304" header of its own field.
    payload += '6304';
    return payload + crc16(payload);
}

/** Result of `parsePayload()`. */
export interface ParsedPayload {
    /** Raw top-level fields; templates 38 and 62 include `children`. */
    fields: TlvField[];
    /** True when tag 63 matches the recomputed CRC. */
    crcValid: boolean;
    isDynamic: boolean;
    bin?: string;
    /** Matching built-in bank, if the BIN is known. */
    bank?: BankInfo;
    accountNo?: string;
    transferType?: TransferType;
    amount?: number;
    addInfo?: string;
    currency?: string;
    country?: string;
}

/**
 * Parses a NAPAS 247 / VietQR payload back into its parts (useful for tests, scanners, debugging).
 * With `strict` (default true) a CRC mismatch throws CRC_MISMATCH; otherwise `crcValid` is false.
 */
export function parsePayload(payload: string, options: { strict?: boolean } = {}): ParsedPayload {
    const strict = options.strict ?? true;
    const fields = parseTlv(payload);
    const get = (list: TlvField[] | undefined, id: string) => list?.find((f) => f.id === id);

    // Expand the two templates this library cares about.
    const merchant = get(fields, '38');
    if (merchant) merchant.children = parseTlv(merchant.value);
    const beneficiary = get(merchant?.children, '01');
    if (beneficiary) beneficiary.children = parseTlv(beneficiary.value);
    const additional = get(fields, '62');
    if (additional) additional.children = parseTlv(additional.value);

    // CRC check: the checksum must be the last field and cover everything up to and including "6304".
    const crcField = get(fields, '63');
    const crcValid = !!crcField && payload.endsWith(crcField.value) && crc16(payload.slice(0, -4)) === crcField.value.toUpperCase();
    if (strict && !crcValid) {
        throw new Napas247QrError('CRC_MISMATCH', 'Payload CRC is missing or does not match its content.');
    }

    const bin = get(beneficiary?.children, '00')?.value;
    const serviceCode = get(merchant?.children, '02')?.value;
    const amountText = get(fields, '54')?.value;

    return {
        fields,
        crcValid,
        isDynamic: get(fields, '01')?.value === '12',
        bin,
        // Only report banks that are actually known; unknown BINs stay available via `bin`.
        bank: bin ? findBank(bin) : undefined,
        accountNo: get(beneficiary?.children, '01')?.value,
        transferType: serviceCode === SERVICE_CODES.card ? 'card' : serviceCode === SERVICE_CODES.account ? 'account' : undefined,
        amount: amountText ? Number(amountText) : undefined,
        addInfo: get(additional?.children, '08')?.value,
        currency: get(fields, '53')?.value,
        country: get(fields, '58')?.value,
    };
}
