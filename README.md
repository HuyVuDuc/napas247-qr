# napas247-qr

Thư viện tạo **mã QR chuyển khoản NAPAS 247 / VietQR** theo chuẩn EMVCo (Merchant-Presented Mode) và vẽ thành ảnh bằng Canvas. Chạy được trên trình duyệt, Node.js, và có sẵn component React. Không gọi API bên ngoài.

- Chuỗi dữ liệu trong QR **trùng từng byte** với mã mà `img.vietqr.io` đang tạo (có test đối chiếu).
- Có sẵn bảng ngân hàng (mã ngắn / alias → BIN 6 số của NAPAS), mở rộng được bằng `registerBank()`.
- 3 mẫu ảnh: `qr_only`, `compact`, `print`. Logo ở đầu, cuối và giữa mã do dự án tự truyền vào.
- Xuất ra ESM + CommonJS + file kiểu TypeScript. Entry core không phụ thuộc DOM, React hay thư viện native.

## Mục lục

- [Cài đặt](#cài-đặt)
- [Các entry](#các-entry)
- [Chỉ tạo chuỗi dữ liệu QR](#chỉ-tạo-chuỗi-dữ-liệu-qr)
- [Trình duyệt (JS thuần)](#trình-duyệt-js-thuần)
- [React](#react)
- [Node.js](#nodejs)
- [Tham số thanh toán](#tham-số-thanh-toán)
- [Tuỳ chọn vẽ ảnh](#tuỳ-chọn-vẽ-ảnh)
- [Ngân hàng](#ngân-hàng)
- [Xử lý lỗi](#xử-lý-lỗi)
- [Logo và thương hiệu](#logo-và-thương-hiệu)
- [Phát triển](#phát-triển)
- Tài liệu chi tiết: [Cấu trúc payload](docs/cau-truc-payload.md) · [Hướng dẫn tích hợp](docs/huong-dan-tich-hop.md) · [Quy trình phát hành](docs/phat-hanh.md) · [Lịch sử thay đổi](CHANGELOG.md)

## Cài đặt

```bash
npm i napas247-qr
```

Nếu cần vẽ ảnh phía server (Node.js), cài thêm:

```bash
npm i @napi-rs/canvas
```

`@napi-rs/canvas` có sẵn bản build cho Windows, Linux, macOS nên không cần trình biên dịch C++.

## Các entry

| Import | Dùng để | Phụ thuộc thêm |
|---|---|---|
| `napas247-qr` | Tạo/đọc chuỗi dữ liệu QR, tra ngân hàng, tạo ma trận QR | – |
| `napas247-qr/browser` | `renderToCanvas`, `toDataURL`, `toBlob` | – |
| `napas247-qr/node` | `renderToPng`, `renderToBuffer`, `renderToCanvas`, `registerFont` | `@napi-rs/canvas` |
| `napas247-qr/react` | `<Napas247QR />`, `useNapas247QR()` | `react >= 16.8` |

Core viết độc lập, không dùng framework. React chỉ là lớp bọc nằm trong entry `napas247-qr/react`. Dự án không dùng React sẽ không bị kéo React về.

Các entry `browser`, `node`, `react` đều export lại toàn bộ API của core, nên chỉ cần import từ một chỗ.

## Chỉ tạo chuỗi dữ liệu QR

Dùng khi bạn đã có thư viện vẽ QR riêng, hoặc chỉ cần chuỗi để lưu hay gửi đi.

```js
import { buildPayload, parsePayload } from 'napas247-qr';

const payload = buildPayload({
  bank: 'VCB',             // mã ngắn, alias ("CTG", "MBB"...) hoặc BIN 6 số ("970436")
  accountNo: '1234567890',
  amount: 150000,          // tuỳ chọn; bỏ trống hoặc 0 => QR tĩnh, người chuyển tự nhập số tiền
  addInfo: 'Nạp tiền',     // tuỳ chọn; tự bỏ dấu => "Nap tien"
  transferType: 'account', // 'account' (mặc định) hoặc 'card'
});
// => "00020101021238540010A000000727..."

const info = parsePayload(payload);
// => { bin: '970436', bank: {...}, accountNo: '1234567890', amount: 150000, addInfo: 'Nap tien', crcValid: true, ... }
```

## Trình duyệt (JS thuần)

```html
<img id="qr" style="width: 360px" alt="QR chuyển khoản">

<script type="module">
  import { toDataURL } from 'napas247-qr/browser';

  document.getElementById('qr').src = await toDataURL({
    bank: 'MB',
    accountNo: '0123456789',
    accountName: 'NGUYEN VAN A',
    addInfo: 'user01',
    template: 'print',
    scale: window.devicePixelRatio, // ảnh nét trên màn hình độ phân giải cao
    logos: {
      header: ['/img/vietqr.png'],
      footer: ['/img/napas247.png', '/img/banks/mb.png'],
    },
  });
</script>
```

Các hàm khác:

```js
import { renderToCanvas, toBlob } from 'napas247-qr/browser';

// Vẽ thẳng vào một <canvas> có sẵn (canvas sẽ được đổi kích thước cho vừa)
const { canvas, payload } = await renderToCanvas({ bank: 'MB', accountNo: '0123456789' }, document.querySelector('canvas'));

// Lấy Blob để tạo link tải về hoặc upload
const blob = await toBlob({ bank: 'MB', accountNo: '0123456789' });
```

> Logo lấy từ domain khác phải có header CORS. Nếu không, canvas bị "taint" và không xuất ảnh được (`toDataURL`/`toBlob` báo lỗi). Logo cùng domain hoặc data URI thì luôn dùng được.

Trong web worker không có `document`, thư viện tự dùng `OffscreenCanvas`.

## React

```jsx
import { Napas247QR } from 'napas247-qr/react';

<Napas247QR
  bank={account.bank_code}
  accountNo={account.account_number}
  accountName={account.beneficiary_name}
  addInfo={user.UserName}
  template="print"
  style={{ width: 450 }}
  fallback={<Spinner />}
  onError={(e) => console.error(e.code, e.message)}
/>
```

| Prop | Mặc định | Ý nghĩa |
|---|---|---|
| Toàn bộ [tham số thanh toán](#tham-số-thanh-toán) và [tuỳ chọn vẽ](#tuỳ-chọn-vẽ-ảnh) | | |
| `as` | `'img'` | `'img'`: hiển thị thẻ `<img>`, người dùng nhấn giữ để lưu được. `'canvas'`: vẽ thẳng vào `<canvas>` |
| `alt` | `'QR chuyển khoản'` | Thuộc tính alt của ảnh |
| `className`, `style` | | Gắn vào thẻ `<img>`/`<canvas>` |
| `fallback` | `null` | Nội dung hiển thị trong lúc đang vẽ (chế độ `img`) |
| `onRender(payload)` | | Gọi khi vẽ xong |
| `onError(error)` | | Gọi khi có lỗi (`Napas247QrError`) |

Component chỉ vẽ lại khi dữ liệu đầu vào thực sự thay đổi.

Nếu muốn tự dựng giao diện, dùng hook:

```jsx
import { useNapas247QR } from 'napas247-qr/react';

const { dataUrl, payload, error, loading } = useNapas247QR({ bank: 'VCB', accountNo: '1234567890' });
```

## Node.js

Ví dụ endpoint Express trả ảnh PNG:

```js
const { renderToPng, registerFont } = require('napas247-qr/node');

// Server không có font tiếng Việt thì đăng ký file font trước
await registerFont('./fonts/BeVietnamPro-Regular.ttf', 'Be Vietnam Pro');

app.get('/qr.png', async (req, res, next) => {
  try {
    const png = await renderToPng({
      bank: 'VCB',
      accountNo: '1234567890',
      amount: req.query.amount,
      template: 'compact',
    });
    res.type('png').set('Cache-Control', 'public, max-age=86400').send(png);
  } catch (err) {
    next(err);
  }
});
```

| Hàm | Trả về |
|---|---|
| `renderToPng(input)` | `Promise<Buffer>` ảnh PNG |
| `renderToBuffer(input, format?, quality?)` | `Promise<Buffer>`; `format` là `'image/png'` (mặc định), `'image/jpeg'` hoặc `'image/webp'`, `quality` từ 0–100 |
| `renderToCanvas(input)` | `Promise<{ canvas, payload }>` với `canvas` của `@napi-rs/canvas` |
| `registerFont(path, family)` | `Promise<boolean>` – đăng ký font, sau đó dùng `family` trong `fontFamily` |

Logo phía Node nhận: đường dẫn file, URL http(s), data URI, `Buffer`, `Uint8Array`, `ArrayBuffer` hoặc `Image` đã load.

## Tham số thanh toán

Đây là các tham số được mã hoá vào QR. Dùng chung cho `buildPayload` và mọi hàm vẽ ảnh.

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `bank` | ✔ | Mã ngắn, alias hoặc BIN 6 số. Không phân biệt hoa thường, tự bỏ khoảng trắng hai đầu |
| `accountNo` | ✔ | 1–19 ký tự chữ hoặc số; khoảng trắng bị bỏ |
| `amount` | | Số nguyên dương (VND), tối đa 13 chữ số. Bỏ trống, `0` hoặc `''` → QR tĩnh |
| `addInfo` | | Tự bỏ dấu tiếng Việt, bỏ ký tự ngoài ASCII (emoji...), gộp khoảng trắng. Tối đa 95 ký tự sau khi làm sạch |
| `transferType` | | `'account'` (mặc định, mã dịch vụ `QRIBFTTA`) hoặc `'card'` (chuyển tới số thẻ, `QRIBFTTC`) |

> Thực tế nhiều app ngân hàng chỉ giữ khoảng 25 ký tự đầu của nội dung chuyển khoản. Nếu hệ thống của bạn đối soát theo nội dung, hãy giữ nội dung ngắn.

## Tuỳ chọn vẽ ảnh

Các kích thước tính bằng px, trước khi nhân `scale`.

| Tuỳ chọn | Mặc định | Ghi chú |
|---|---|---|
| `template` | `'compact'` | `'qr_only'`: chỉ mã QR · `'compact'`: thẻ trắng có logo/tiêu đề · `'print'`: `compact` + thông tin người nhận |
| `qrSize` | `480` | Cạnh vùng mã QR (gồm cả lề trắng) |
| `scale` | `1` | Hệ số nhân độ phân giải (màn hình HiDPI, in ấn) |
| `quietZone` | `2` (thẻ) / `4` (`qr_only`) | Độ rộng lề trắng quanh mã, tính theo số module |
| `errorCorrectionLevel` | `'M'`, hoặc `'Q'` khi có logo giữa | `'L'` · `'M'` · `'Q'` · `'H'` |
| `title` | – | Chữ ở đầu thẻ; chỉ hiện khi không truyền logo header |
| `accountName` | – | Tên chủ tài khoản, chỉ để hiển thị (không nằm trong QR); in hoa ở mẫu `print` |
| `bankName` | Tên ngắn của ngân hàng | Chỉ để hiển thị |
| `labels` | Tiếng Việt | Ghi đè nhãn: `accountName`, `accountNo`, `bank`, `amount`, `addInfo`, `currency` |
| `logos` | – | `{ header?: Ảnh[], footer?: Ảnh[], center?: Ảnh }` |
| `foreground` | `'#000000'` | Màu module QR |
| `background` | `'#ffffff'` | Màu nền |
| `textColor` | `'#1f2937'` | Màu chữ phần thông tin |
| `accentColor` | `'#0b3b8c'` | Màu tiêu đề và viền thẻ |
| `fontFamily` | `"Be Vietnam Pro", Roboto, "Segoe UI", Arial, sans-serif` | |
| `border` | `true` | Viền bo góc quanh thẻ |

Mẫu `print` hiển thị theo thứ tự: tên chủ tài khoản → ngân hàng → số tài khoản → số tiền (nếu có) → nội dung (nếu có). Chữ dài sẽ tự xuống dòng và thẻ tự cao thêm.

Logo giữa mã được đặt trên một ô nền trắng bo góc, chiếm khoảng 20% cạnh mã. Khi dùng logo giữa mà tự chọn `errorCorrectionLevel`, nên chọn `'Q'` hoặc `'H'`.

## Ngân hàng

```js
import { BANKS, findBank, resolveBank, registerBank } from 'napas247-qr';

findBank('ctg');        // => { code: 'ICB', bin: '970415', shortName: 'VietinBank', ... }
resolveBank('970999');  // BIN 6 số chưa có trong bảng vẫn dùng được
registerBank({ code: 'NEWBANK', bin: '970999', shortName: 'NewBank', name: 'Ngân hàng mới', aliases: ['NB'] });
```

| Hàm | Hành vi |
|---|---|
| `findBank(codeOrBin)` | Trả về ngân hàng hoặc `undefined` |
| `resolveBank(codeOrBin)` | Trả về ngân hàng; BIN 6 số lạ được chấp nhận; còn lại báo lỗi `INVALID_BANK` |
| `registerBank(bank)` | Thêm mới hoặc ghi đè ngân hàng (khi đổi tên, sáp nhập...) |
| `BANKS` | Danh sách có sẵn (chỉ đọc) |

Bảng ngân hàng có sẵn là bản chụp tại thời điểm phát hành. Hãy đối chiếu BIN của các ngân hàng bạn thực sự dùng. `registerBank()` gọi ở entry nào cũng có tác dụng với mọi entry khác.

## Xử lý lỗi

Mọi hàm báo lỗi bằng `Napas247QrError`, có thuộc tính `code`:

| `code` | Khi nào |
|---|---|
| `INVALID_BANK` | Mã ngân hàng trống, không tìm thấy, hoặc BIN không đủ 6 số |
| `INVALID_ACCOUNT` | Số tài khoản trống hoặc có ký tự không hợp lệ |
| `INVALID_AMOUNT` | Số tiền không phải số nguyên dương hoặc dài quá 13 chữ số |
| `INVALID_ADD_INFO` | Nội dung dài quá 95 ký tự sau khi làm sạch |
| `INVALID_PAYLOAD` | Chuỗi không đúng cấu trúc EMVCo (khi `parsePayload`) |
| `CRC_MISMATCH` | CRC không khớp nội dung (khi `parsePayload`, chế độ `strict` mặc định) |
| `RENDER_ERROR` | Thiếu canvas / `@napi-rs/canvas`, hoặc không load được logo |

```js
import { Napas247QrError } from 'napas247-qr';

try {
  buildPayload({ bank: 'XYZ', accountNo: '1' });
} catch (e) {
  if (e instanceof Napas247QrError && e.code === 'INVALID_BANK') {
    // xử lý riêng
  }
}
```

## Logo và thương hiệu

Package **không kèm logo nào**. Logo VietQR, NAPAS 247 và logo các ngân hàng là tài sản thương hiệu của chủ sở hữu. Dự án tự lưu file logo và sử dụng theo quy định nhận diện thương hiệu của từng bên.

## Phát triển

```bash
npm test           # vitest: đối chiếu payload VietQR + vẽ ảnh rồi decode lại
npm run typecheck  # kiểm tra kiểu TypeScript
npm run build      # tsup -> dist/ (ESM, CJS, .d.ts)
npm run samples    # tạo ảnh mẫu vào examples/out/
```

Cấu trúc mã nguồn:

```
src/
├─ core/             logic chính, không phụ thuộc DOM/React
│  ├─ emv.ts         mã hoá/đọc trường TLV, CRC16
│  ├─ payload.ts     buildPayload / parsePayload
│  ├─ banks.ts       bảng ngân hàng → BIN
│  ├─ matrix.ts      tạo ma trận QR
│  ├─ text.ts        bỏ dấu, làm sạch nội dung
│  └─ errors.ts      Napas247QrError
├─ render/           bộ vẽ dùng chung cho browser và Node
├─ index.ts          entry core
├─ browser.ts        entry trình duyệt
├─ node.ts           entry Node.js
└─ react.tsx         entry React (lớp bọc)
```

## Giấy phép

MIT
