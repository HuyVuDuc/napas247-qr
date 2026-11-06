# Cấu trúc payload NAPAS 247 / VietQR

Tài liệu này giải thích chuỗi dữ liệu nằm bên trong mã QR chuyển khoản. Đọc khi cần debug, đối soát, hoặc tự kiểm tra một mã QR.

## Nền tảng: chuẩn EMVCo

Mã QR chuyển khoản NAPAS 247 (thương hiệu VietQR) theo chuẩn **EMVCo QR Code Specification for Payment Systems – Merchant-Presented Mode**. Chuỗi dữ liệu gồm nhiều trường nối tiếp nhau theo dạng **TLV**:

```
[ID: 2 chữ số][Độ dài: 2 chữ số][Giá trị]
```

Ví dụ `5802VN` nghĩa là trường `58`, dài `02` ký tự, giá trị `VN`.

Một số trường là **template**: giá trị của nó lại là một chuỗi TLV con (trường `38`, `62`). Vì độ dài chỉ có 2 chữ số nên mỗi trường dài tối đa 99 ký tự.

## Các trường thư viện tạo ra

| ID | Tên | Giá trị | Ghi chú |
|---|---|---|---|
| `00` | Payload Format Indicator | `01` | Luôn cố định |
| `01` | Point of Initiation Method | `11` hoặc `12` | `11` = QR tĩnh (không có số tiền), `12` = QR động (có số tiền) |
| `38` | Merchant Account Information | template | Xem bảng bên dưới |
| `53` | Transaction Currency | `704` | Mã tiền tệ VND theo ISO 4217 |
| `54` | Transaction Amount | số tiền | Chỉ có khi truyền `amount` > 0 |
| `58` | Country Code | `VN` | |
| `62` | Additional Data Field | template | Chỉ có khi truyền `addInfo` |
| `63` | CRC | 4 ký tự hex | Luôn là trường cuối cùng |

### Trường `38` – thông tin người nhận

| ID con | Tên | Giá trị |
|---|---|---|
| `00` | GUID | `A000000727` – mã định danh của NAPAS |
| `01` | Beneficiary Organization | template: `00` = BIN ngân hàng (6 số), `01` = số tài khoản hoặc số thẻ |
| `02` | Service Code | `QRIBFTTA` = chuyển tới tài khoản · `QRIBFTTC` = chuyển tới thẻ |

### Trường `62` – dữ liệu bổ sung

| ID con | Tên | Giá trị |
|---|---|---|
| `08` | Purpose of Transaction | Nội dung chuyển khoản (ASCII, không dấu) |

Vì trường `62` dài tối đa 99 ký tự, và header `08xx` chiếm 4 ký tự, nên nội dung dài tối đa **95 ký tự** (hằng số `MAX_ADD_INFO_LENGTH`).

## Phân tích một ví dụ

Đầu vào:

```js
buildPayload({ bank: 'MB', accountNo: '0123456789', addInfo: 'user01' });
```

Kết quả:

```
00020101021138540010A00000072701240006970422011001234567890208QRIBFTTA53037045802VN62100806user016304ED70
```

Tách ra từng trường:

```
00 02 01                           Phiên bản payload = 01
01 02 11                           QR tĩnh (không có số tiền)
38 54                              Thông tin người nhận (54 ký tự):
   00 10 A000000727                  GUID NAPAS
   01 24                             Tổ chức thụ hưởng (24 ký tự):
      00 06 970422                     BIN của MB
      01 10 0123456789                 Số tài khoản
   02 08 QRIBFTTA                    Chuyển tới tài khoản
53 03 704                          VND
58 02 VN                           Việt Nam
62 10                              Dữ liệu bổ sung (10 ký tự):
   08 06 user01                      Nội dung chuyển khoản
63 04 ED70                         CRC
```

Có thể kiểm tra lại bằng:

```js
parsePayload('000201010211...6304ED70');
```

## Cách tính CRC

- Thuật toán: **CRC-16/CCITT-FALSE**. Đa thức `0x1021`, giá trị khởi tạo `0xFFFF`, không đảo bit, không XOR cuối.
- Phạm vi tính: toàn bộ chuỗi phía trước, **bao gồm cả `6304`** (ID và độ dài của chính trường CRC).
- Kết quả ghi dưới dạng 4 ký tự hex viết hoa.
- Giá trị kiểm tra chuẩn: `crc16('123456789') === '29B1'`.

Các bước tạo:

```
chuỗi = "000201...0806user01" + "6304"
crc   = crc16(chuỗi)          // "ED70"
payload = chuỗi + crc
```

Chỉ cần sai 1 ký tự là CRC không khớp. App ngân hàng sẽ từ chối mã, và `parsePayload` báo lỗi `CRC_MISMATCH`.

## Làm sạch nội dung chuyển khoản

`addInfo` được xử lý trước khi đưa vào trường `62/08`:

1. Bỏ dấu tiếng Việt: `Nạp tiền Đức` → `Nap tien Duc`. Dùng chuẩn hoá Unicode NFD rồi bỏ dấu; riêng `đ/Đ` được đổi thủ công.
2. Bỏ mọi ký tự ngoài ASCII in được (`0x20`–`0x7E`), ví dụ emoji, chữ Trung, ký tự điều khiển.
3. Gộp nhiều khoảng trắng thành một, cắt khoảng trắng hai đầu.

Cách này khớp với hành vi của VietQR hiện tại. Mẫu `print` cũng hiển thị nội dung đã làm sạch, nên chữ in trên ảnh luôn đúng với dữ liệu trong QR.

## Những gì KHÔNG nằm trong QR

- **Tên chủ tài khoản** (`accountName`) và **tên ngân hàng** (`bankName`) chỉ để vẽ lên ảnh. App ngân hàng tự tra tên chủ tài khoản thật qua NAPAS khi quét mã.
- Logo, màu sắc, tiêu đề và mọi tuỳ chọn hiển thị khác.

Vì vậy, nếu nhập sai `accountName` thì ảnh hiển thị sai, nhưng tiền vẫn chuyển đúng tới tài khoản trong QR.

## Đối chiếu với VietQR

Bộ test `test/payload.test.ts` chứa các chuỗi được decode trực tiếp từ ảnh của `img.vietqr.io`. Thư viện phải tạo ra chuỗi giống hệt cho cùng đầu vào:

| Trường hợp | Đặc điểm |
|---|---|
| MB, không có số tiền | QR tĩnh (`010211`) |
| VCB, 150.000 VND | QR động (`010212`), có trường `54` |
| ACB, nội dung có dấu | Kiểm tra việc bỏ dấu |
