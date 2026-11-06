/**
 * Removes Vietnamese diacritics: "Nạp tiền Đức" -> "Nap tien Duc".
 * NFD splits each accented letter into base letter + combining marks, which are then dropped;
 * "đ/Đ" has no decomposition, so it is mapped explicitly.
 */
export function removeVietnameseTones(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

/**
 * Normalises transfer content (EMVCo tag 62/08) so every bank app accepts it:
 * 1. strip Vietnamese diacritics,
 * 2. drop anything outside printable ASCII (emoji, CJK, control chars...),
 * 3. collapse repeated whitespace and trim.
 */
export function sanitizeAddInfo(text: string): string {
    return removeVietnameseTones(text)
        .replace(/[^\x20-\x7e]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
