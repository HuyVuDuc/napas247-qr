/**
 * Machine-readable error codes thrown by this library.
 * - INVALID_BANK: bank code/BIN is empty, unknown, or not 6 digits.
 * - INVALID_ACCOUNT: account/card number is empty or contains unsupported characters.
 * - INVALID_AMOUNT: amount is not a positive integer or exceeds 13 digits.
 * - INVALID_ADD_INFO: transfer content is too long after sanitising.
 * - INVALID_PAYLOAD: a payload string could not be parsed as EMVCo TLV.
 * - CRC_MISMATCH: a parsed payload carries a CRC that does not match its content.
 * - RENDER_ERROR: the canvas backend is missing or an image could not be loaded.
 */
export type Napas247QrErrorCode =
    | 'INVALID_BANK'
    | 'INVALID_ACCOUNT'
    | 'INVALID_AMOUNT'
    | 'INVALID_ADD_INFO'
    | 'INVALID_PAYLOAD'
    | 'CRC_MISMATCH'
    | 'RENDER_ERROR';

/**
 * Error class used by every public function so callers can branch on `error.code`
 * instead of parsing human-readable messages.
 */
export class Napas247QrError extends Error {
    readonly code: Napas247QrErrorCode;

    constructor(code: Napas247QrErrorCode, message: string) {
        super(message);
        this.name = 'Napas247QrError';
        this.code = code;
        // Keep the prototype chain intact when transpiled to ES5-style classes.
        Object.setPrototypeOf(this, Napas247QrError.prototype);
    }
}
