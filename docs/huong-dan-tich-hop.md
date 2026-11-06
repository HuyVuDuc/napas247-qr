# Hướng dẫn tích hợp

Tài liệu này hướng dẫn đưa `napas247-qr` vào một dự án có sẵn, đặc biệt là khi thay thế API ảnh `img.vietqr.io`.

## 1. Chuyển từ `img.vietqr.io` sang thư viện

### Đối chiếu tham số

URL VietQR có dạng:

```
https://img.vietqr.io/image/{BANK}-{ACCOUNT}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={INFO}&accountName={NAME}
```

| VietQR | napas247-qr | Ghi chú |
|---|---|---|
| `{BANK}` | `bank` | Mã ngắn hoặc BIN đều dùng được |
| `{ACCOUNT}` | `accountNo` | |
| `{TEMPLATE}` = `qr_only` | `template: 'qr_only'` | |
| `{TEMPLATE}` = `compact` | `template: 'compact'` | |
| `{TEMPLATE}` = `compact2`, `print` | `template: 'print'` | Bố cục tương tự; logo do bạn tự truyền |
| `amount` | `amount` | |
| `addInfo` | `addInfo` | Không cần `encodeURI` nữa |
| `accountName` | `accountName` | |

### Ví dụ: trang nạp tiền React

Trước:

```jsx
const qrCodeURL = `https://img.vietqr.io/image/${account.bank_code}-${account.account_number}-print.png`
  + `?addInfo=${encodeURI(user.UserName)}&accountName=${account.beneficiary_name}`;

<img src={qrCodeURL} style={{ width: 450 }} />
```

Sau:

```jsx
import { Napas247QR } from 'napas247-qr/react';

<Napas247QR
  bank={account.bank_code}
  accountNo={account.account_number}
  accountName={account.beneficiary_name}
  addInfo={user.UserName}
  template="print"
  style={{ width: 450 }}
  onError={(e) => console.error('[QR]', e.code, e.message)}
/>
```

### Những điểm cần kiểm tra khi chuyển

1. **Mã ngân hàng trong database.** Nếu cột lưu mã do người dùng tự nhập (ví dụ `VCB`, `TCB`), kiểm tra mọi giá trị đều tra được: dùng `findBank(code)` cho từng dòng. Mã nào không tìm thấy thì sửa dữ liệu, gọi `registerBank()`, hoặc lưu BIN 6 số thay cho mã.
2. **Logo.** VietQR tự chèn logo VietQR, NAPAS 247 và logo ngân hàng. Với thư viện, bạn tự lưu file logo trong dự án rồi truyền qua `logos`.
3. **Font.** Trên trình duyệt thì font hệ thống đã đủ dấu tiếng Việt. Phía server nên đăng ký font bằng `registerFont()`.
4. **Quét thử.** Quét ảnh mới bằng vài app ngân hàng thật, so tên người nhận và nội dung với ảnh cũ.

## 2. Cài đặt trước khi publish (thử nghiệm nội bộ)

Khi package chưa lên registry, nên cài bằng **tarball**:

```bash
# trong thư mục napas247-qr
npm run build
npm pack                       # tạo napas247-qr-0.1.0.tgz
```

```bash
# trong dự án cần dùng
npm i ../napas247-qr/napas247-qr-0.1.0.tgz
```

> **Không nên** dùng `npm i ../napas247-qr` (link `file:`) với dự án React. Link `file:` tạo symlink, khiến thư viện dùng bản `react` trong `node_modules` của chính nó (devDependency). Kết quả là có 2 bản React và gặp lỗi *"Invalid hook call"*. Tarball không bị lỗi này.

Mỗi lần sửa thư viện thì chạy lại `npm pack` và cài lại tarball.

## 3. Tích hợp theo loại dự án

### Create React App (react-scripts 5) / webpack 5

Dùng được ngay, không cần cấu hình thêm. Webpack 5 hiểu field `exports`.

### Jest 27 (đi kèm CRA 5)

Jest 27 không đọc field `exports`. Package có sẵn các thư mục `browser/`, `node/`, `react/`, mỗi thư mục chứa `package.json` trỏ vào `dist/`, nên `import 'napas247-qr/react'` vẫn resolve được.

Môi trường `jsdom` của Jest **không có canvas thật**, nên khi render ra ảnh sẽ báo lỗi. Trong test của dự án, nên mock component:

```js
jest.mock('napas247-qr/react', () => ({
  Napas247QR: (props) => <div data-testid="napas247-qr">{props.accountNo}</div>,
}));
```

Muốn kiểm tra payload thì gọi trực tiếp `buildPayload` từ `napas247-qr`, vì entry này không cần canvas.

### Vite / Next.js

- Vite: dùng được ngay.
- Next.js: chỉ dùng `napas247-qr/react` trong Client Component (`'use client'`), vì việc vẽ chạy trong `useEffect` trên trình duyệt. Khi render phía server, component trả về `fallback`.

### Vue 3

```vue
<script setup>
import { ref, watchEffect } from 'vue';
import { toDataURL } from 'napas247-qr/browser';

const props = defineProps(['bank', 'accountNo', 'amount', 'addInfo']);
const src = ref('');

watchEffect(async () => {
  src.value = await toDataURL({ ...props, template: 'compact' });
});
</script>

<template>
  <img v-if="src" :src="src" alt="QR chuyển khoản" />
</template>
```

### HTML / JS thuần

```html
<img id="qr" alt="QR chuyển khoản">
<script type="module">
  import { toDataURL } from 'napas247-qr/browser';
  document.getElementById('qr').src = await toDataURL({ bank: 'VCB', accountNo: '1234567890' });
</script>
```

Không có bundler thì cần import map để trình duyệt tìm được `qrcode-generator`, hoặc dùng CDN hỗ trợ ESM (esm.sh, jsDelivr) sau khi package đã publish.

### Node.js / Express (CommonJS)

```js
const { renderToPng } = require('napas247-qr/node');
```

Cần cài `@napi-rs/canvas`. Nếu thiếu, lần vẽ đầu tiên sẽ báo `RENDER_ERROR` kèm hướng dẫn cài.

## 4. Vẽ phía client hay phía server?

| | Phía client (`/browser`, `/react`) | Phía server (`/node`) |
|---|---|---|
| Tải CPU server | Không | Có (vài ms mỗi ảnh) |
| Phụ thuộc native | Không | `@napi-rs/canvas` |
| Font | Font của trình duyệt | Phải đăng ký font tiếng Việt |
| Có URL ảnh cố định | Không (data URL) | Có, cache được qua CDN |
| Dùng trong email, admin, file tải về | Hạn chế | Phù hợp |

Gợi ý: trang web chỉ hiển thị QR thì vẽ phía client. Khi cần link ảnh dùng ở nhiều nơi thì làm thêm một endpoint phía server.

## 5. Kiểm tra sau khi tích hợp

- [ ] Ảnh hiển thị đúng ở desktop và mobile, chữ tiếng Việt có dấu đầy đủ.
- [ ] Quét bằng ít nhất 2–3 app ngân hàng khác nhau: đúng ngân hàng, số tài khoản, số tiền, nội dung.
- [ ] Mọi `bank_code` trong database đều tra được (`findBank`).
- [ ] Có xử lý `onError` / `try-catch` để hiện thông báo khi dữ liệu tài khoản sai.
- [ ] Logo khác domain có header CORS (nếu dùng `toDataURL`/`toBlob`).
