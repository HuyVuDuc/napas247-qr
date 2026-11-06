/**
 * Platform-independent entry: payload building/parsing, bank lookup and QR matrix.
 * Has no DOM or native dependency, so it runs in browsers, Node.js, workers and edge runtimes.
 */
export { buildPayload, parsePayload, NAPAS_GUID, SERVICE_CODES, MAX_ADD_INFO_LENGTH } from './core/payload';
export type { PaymentInfo, ParsedPayload, TransferType } from './core/payload';
export { BANKS, findBank, resolveBank, registerBank } from './core/banks';
export type { BankInfo } from './core/banks';
export { crc16, tlv, parseTlv } from './core/emv';
export type { TlvField } from './core/emv';
export { createQrMatrix } from './core/matrix';
export type { QrMatrix, ErrorCorrectionLevel } from './core/matrix';
export { removeVietnameseTones, sanitizeAddInfo } from './core/text';
export { Napas247QrError } from './core/errors';
export type { Napas247QrErrorCode } from './core/errors';
export { renderWithAdapter, DEFAULT_LABELS, formatAmount } from './render/renderer';
export type * from './render/types';
