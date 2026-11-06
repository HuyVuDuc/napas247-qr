# Lịch sử thay đổi

Mọi thay đổi đáng chú ý của package được ghi tại đây. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

Các nhóm dùng trong mỗi phiên bản: **Thêm mới**, **Thay đổi**, **Sửa lỗi**, **Loại bỏ**, **Ngân hàng** (cập nhật bảng BIN).

## [Chưa phát hành]

## [0.1.0] - 2026-11-06

### Thêm mới

- `buildPayload()` tạo chuỗi dữ liệu QR NAPAS 247 theo chuẩn EMVCo. Hỗ trợ QR tĩnh/động, chuyển tới tài khoản (`QRIBFTTA`) hoặc thẻ (`QRIBFTTC`), tự bỏ dấu nội dung chuyển khoản. Kết quả trùng từng byte với `img.vietqr.io`.
- `parsePayload()` đọc ngược chuỗi QR và kiểm tra CRC.
- Các hàm cấp thấp: `crc16`, `tlv`, `parseTlv`, `createQrMatrix`, `removeVietnameseTones`, `sanitizeAddInfo`.
- Bảng 48 ngân hàng (mã ngắn, alias → BIN) cùng `findBank`, `resolveBank`, `registerBank`. BIN 6 số chưa có trong bảng vẫn dùng được.
- Bộ vẽ dùng chung với 3 mẫu `qr_only`, `compact`, `print`; hỗ trợ logo đầu/cuối/giữa mã, tự xuống dòng, hệ số `scale`, tuỳ biến màu, font, nhãn.
- Entry `napas247-qr/browser`: `renderToCanvas`, `toDataURL`, `toBlob`; tự dùng `OffscreenCanvas` trong web worker.
- Entry `napas247-qr/node`: `renderToPng`, `renderToBuffer` (PNG/JPEG/WebP), `renderToCanvas`, `registerFont`, dựa trên `@napi-rs/canvas` (peer dependency tuỳ chọn).
- Entry `napas247-qr/react`: component `<Napas247QR />` (chế độ `img` hoặc `canvas`) và hook `useNapas247QR()`.
- `Napas247QrError` với các mã lỗi `INVALID_BANK`, `INVALID_ACCOUNT`, `INVALID_AMOUNT`, `INVALID_ADD_INFO`, `INVALID_PAYLOAD`, `CRC_MISMATCH`, `RENDER_ERROR`.
- Build ESM + CommonJS + `.d.ts`. Các entry dùng chung một bản core, nên `registerBank()` có tác dụng với mọi entry.
- Tài liệu tiếng Việt: README, cấu trúc payload, hướng dẫn tích hợp, quy trình phát hành.

[Chưa phát hành]: https://github.com/HuyVuDuc/napas247-qr/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/HuyVuDuc/napas247-qr/releases/tag/v0.1.0
