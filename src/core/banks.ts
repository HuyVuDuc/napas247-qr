import { Napas247QrError } from './errors';

/**
 * One NAPAS 247 participant.
 * - code: short code as used by VietQR URLs (e.g. "VCB").
 * - bin: 6-digit NAPAS acquirer ID / BIN that goes into the QR payload.
 * - shortName: display name shown on the card.
 * - aliases: extra codes people commonly type (stock tickers, old brand names...).
 */
export interface BankInfo {
    code: string;
    bin: string;
    shortName: string;
    name: string;
    aliases?: string[];
}

/**
 * Built-in bank list (snapshot of the public NAPAS/VietQR participant list).
 * Banks rename and merge from time to time: verify BINs against your bank before going live,
 * pass a 6-digit BIN directly, or call `registerBank()` to add/override entries.
 */
export const BANKS: readonly BankInfo[] = [
    { code: 'VCB', bin: '970436', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
    { code: 'ICB', bin: '970415', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam', aliases: ['CTG', 'VIETINBANK'] },
    { code: 'BIDV', bin: '970418', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', aliases: ['BID'] },
    { code: 'VBA', bin: '970405', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', aliases: ['AGRIBANK', 'AGR'] },
    { code: 'TCB', bin: '970407', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
    { code: 'MB', bin: '970422', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân đội', aliases: ['MBB', 'MBBANK'] },
    { code: 'ACB', bin: '970416', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
    { code: 'VPB', bin: '970432', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', aliases: ['VPBANK'] },
    { code: 'TPB', bin: '970423', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong', aliases: ['TPBANK'] },
    { code: 'STB', bin: '970403', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', aliases: ['SACOMBANK'] },
    { code: 'HDB', bin: '970437', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', aliases: ['HDBANK'] },
    { code: 'VIB', bin: '970441', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
    { code: 'SHB', bin: '970443', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
    { code: 'EIB', bin: '970431', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', aliases: ['EXIMBANK'] },
    { code: 'MSB', bin: '970426', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
    { code: 'OCB', bin: '970448', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
    { code: 'SCB', bin: '970429', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn' },
    { code: 'LPB', bin: '970449', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', aliases: ['LPBANK'] },
    { code: 'SEAB', bin: '970440', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á', aliases: ['SSB', 'SEABANK'] },
    { code: 'ABB', bin: '970425', shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình', aliases: ['ABBANK'] },
    { code: 'NAB', bin: '970428', shortName: 'NamABank', name: 'Ngân hàng TMCP Nam Á' },
    { code: 'BAB', bin: '970409', shortName: 'BacABank', name: 'Ngân hàng TMCP Bắc Á' },
    { code: 'VCCB', bin: '970454', shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt', aliases: ['BVBANK'] },
    { code: 'PVCB', bin: '970412', shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam' },
    { code: 'NCB', bin: '970419', shortName: 'NCB', name: 'Ngân hàng TMCP Quốc Dân' },
    { code: 'KLB', bin: '970452', shortName: 'KienLongBank', name: 'Ngân hàng TMCP Kiên Long' },
    { code: 'SGICB', bin: '970400', shortName: 'SaigonBank', name: 'Ngân hàng TMCP Sài Gòn Công Thương', aliases: ['SGB'] },
    { code: 'PGB', bin: '970430', shortName: 'PGBank', name: 'Ngân hàng TMCP Thịnh vượng và Phát triển' },
    { code: 'VAB', bin: '970427', shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á' },
    { code: 'VIETBANK', bin: '970433', shortName: 'VietBank', name: 'Ngân hàng TMCP Việt Nam Thương Tín' },
    { code: 'BVB', bin: '970438', shortName: 'BaoVietBank', name: 'Ngân hàng TMCP Bảo Việt' },
    { code: 'GPB', bin: '970408', shortName: 'GPBank', name: 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu' },
    { code: 'COOPBANK', bin: '970446', shortName: 'COOPBANK', name: 'Ngân hàng Hợp tác xã Việt Nam' },
    { code: 'CAKE', bin: '546034', shortName: 'CAKE', name: 'TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank' },
    { code: 'UBANK', bin: '546035', shortName: 'Ubank', name: 'TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank' },
    { code: 'TIMO', bin: '963388', shortName: 'Timo', name: 'Ngân hàng số Timo by Bản Việt Bank' },
    { code: 'SHBVN', bin: '970424', shortName: 'ShinhanBank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam' },
    { code: 'WVN', bin: '970457', shortName: 'Woori', name: 'Ngân hàng TNHH MTV Woori Việt Nam' },
    { code: 'UOB', bin: '970458', shortName: 'UnitedOverseas', name: 'Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh' },
    { code: 'PBVN', bin: '970439', shortName: 'PublicBank', name: 'Ngân hàng TNHH MTV Public Việt Nam' },
    { code: 'IVB', bin: '970434', shortName: 'IndovinaBank', name: 'Ngân hàng TNHH Indovina' },
    { code: 'VRB', bin: '970421', shortName: 'VRB', name: 'Ngân hàng Liên doanh Việt - Nga' },
    { code: 'HLBVN', bin: '970442', shortName: 'HongLeong', name: 'Ngân hàng TNHH MTV Hong Leong Việt Nam' },
    { code: 'SCVN', bin: '970410', shortName: 'StandardChartered', name: 'Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam' },
    { code: 'HSBC', bin: '458761', shortName: 'HSBC', name: 'Ngân hàng TNHH MTV HSBC (Việt Nam)' },
    { code: 'CIMB', bin: '422589', shortName: 'CIMB', name: 'Ngân hàng TNHH MTV CIMB Việt Nam' },
    { code: 'KBANK', bin: '668888', shortName: 'KBank', name: 'Ngân hàng Đại chúng TNHH Kasikornbank' },
    { code: 'VBSP', bin: '999888', shortName: 'VBSP', name: 'Ngân hàng Chính sách Xã hội' },
];

/** Lookup table keyed by upper-case code, alias and BIN; rebuilt lazily after `registerBank()`. */
const index = new Map<string, BankInfo>();

/** Adds one bank under its code, BIN and every alias. Later calls overwrite earlier keys. */
function indexBank(bank: BankInfo): void {
    index.set(bank.code.toUpperCase(), bank);
    index.set(bank.bin, bank);
    for (const alias of bank.aliases ?? []) index.set(alias.toUpperCase(), bank);
}

BANKS.forEach(indexBank);

/**
 * Registers a custom bank or overrides a built-in one (e.g. after a rebrand or a new BIN).
 * Throws INVALID_BANK when the BIN is not 6 digits.
 */
export function registerBank(bank: BankInfo): void {
    if (!/^\d{6}$/.test(bank.bin)) {
        throw new Napas247QrError('INVALID_BANK', `BIN "${bank.bin}" must be exactly 6 digits.`);
    }
    indexBank(bank);
}

/**
 * Looks up a bank by short code, alias or BIN (case-insensitive, surrounding spaces ignored).
 * Returns undefined when nothing matches.
 */
export function findBank(codeOrBin: string): BankInfo | undefined {
    return index.get(String(codeOrBin ?? '').trim().toUpperCase());
}

/**
 * Resolves the input to a bank, or throws INVALID_BANK.
 * - Known code/alias/BIN -> the matching entry.
 * - Unknown but well-formed 6-digit BIN -> a minimal entry, so new banks work without a library update.
 * - Anything else -> error.
 */
export function resolveBank(codeOrBin: string): BankInfo {
    const found = findBank(codeOrBin);
    if (found) return found;

    const raw = String(codeOrBin ?? '').trim();
    if (/^\d{6}$/.test(raw)) {
        return { code: raw, bin: raw, shortName: raw, name: raw };
    }
    throw new Napas247QrError('INVALID_BANK', `Unknown bank "${raw}". Pass a 6-digit NAPAS BIN or call registerBank().`);
}
