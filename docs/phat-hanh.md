# Quy trình phát hành

Tài liệu dành cho người bảo trì package: build, đánh số phiên bản và đưa lên registry.

## Quy tắc đánh số phiên bản

Package theo [Semantic Versioning](https://semver.org/lang/vi/): `MAJOR.MINOR.PATCH`.

| Loại thay đổi | Tăng | Ví dụ |
|---|---|---|
| Sửa lỗi, cập nhật BIN ngân hàng, sửa tài liệu | `PATCH` | `0.1.0` → `0.1.1` |
| Thêm tính năng, tuỳ chọn, template mới mà không phá code cũ | `MINOR` | `0.1.1` → `0.2.0` |
| Đổi tên hàm/tham số, đổi hành vi mặc định, đổi bố cục ảnh đáng kể | `MAJOR` | `0.2.0` → `1.0.0` |

Khi còn ở `0.x`, thay đổi phá tương thích có thể đi kèm việc tăng `MINOR`. Chuyển lên `1.0.0` khi API đã ổn định và đã chạy trên production.

> **Thay đổi chuỗi payload luôn là thay đổi lớn.** Mọi sửa đổi khiến `buildPayload` cho kết quả khác với cùng đầu vào đều phải được đối chiếu lại với app ngân hàng thật trước khi phát hành.

## Checklist trước khi phát hành

- [ ] `npm run typecheck` không lỗi.
- [ ] `npm test` pass toàn bộ.
- [ ] `npm run samples`, mở ảnh trong `examples/out/` kiểm tra bằng mắt.
- [ ] Quét ảnh mẫu bằng app ngân hàng thật (khi có thay đổi ở payload hoặc phần vẽ QR).
- [ ] Cập nhật [CHANGELOG.md](../CHANGELOG.md).
- [ ] Kiểm tra field `author`, `license`, `repository` trong `package.json`.
- [ ] `npm pack --dry-run` để xem danh sách file sẽ được publish (chỉ gồm `dist/`, `browser/`, `node/`, `react/`, `docs/`, README, CHANGELOG, LICENSE).

Script `prepublishOnly` tự chạy `typecheck → test → build` trước mỗi lần publish. Lỗi ở bước nào thì việc publish dừng lại.

## Cách 1: npm public

```bash
npm login                          # đăng nhập tài khoản npm (một lần)
npm version patch                  # hoặc minor / major: tăng version + tạo git tag
npm publish                        # prepublishOnly tự chạy trước
git push && git push --tags
```

- Tên `napas247-qr` hiện còn trống trên npm. Người publish đầu tiên sẽ sở hữu tên này.
- `publishConfig.access` đã đặt là `public`.
- Thêm người được quyền publish: `npm owner add <username> napas247-qr`.
- Gỡ một phiên bản lỗi chỉ được trong 72 giờ (`npm unpublish napas247-qr@x.y.z`). Sau thời gian đó thì dùng `npm deprecate napas247-qr@x.y.z "lý do"` và phát hành bản sửa.

## Cách 2: registry riêng

Dùng khi không muốn công khai mã nguồn.

### GitHub Packages

GitHub Packages bắt buộc tên package có scope trùng với tên tổ chức hoặc user GitHub, ví dụ `@caresoft/napas247-qr`.

1. Đổi `name` trong `package.json` thành `@<org>/napas247-qr` và thêm:
   ```json
   "publishConfig": { "registry": "https://npm.pkg.github.com", "access": "restricted" }
   ```
2. Tạo Personal Access Token có quyền `write:packages`.
3. Tạo file `.npmrc` trong máy người publish (không commit token):
   ```
   @<org>:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```
4. `npm publish`.

Dự án sử dụng cũng cần `.npmrc` có dòng `@<org>:registry=...` và token có quyền `read:packages`. Import đổi thành `@<org>/napas247-qr/react`...

### Verdaccio (tự host)

```bash
npm publish --registry http://<host>:4873
npm i napas247-qr --registry http://<host>:4873
```

Hoặc cấu hình trong `.npmrc` của dự án: `registry=http://<host>:4873`.

## Cách 3: cài trực tiếp từ git

```bash
npm i git+ssh://git@github.com/<org>/napas247-qr.git#v0.1.0
```

> Thư mục `dist/` đang nằm trong `.gitignore`. Muốn cài từ git thì phải thêm script `"prepare": "npm run build"` vào `package.json`. Khi đó npm sẽ tự build lúc cài, và máy cài phải tải đủ devDependencies.

## Sau khi phát hành

- Kiểm tra trang package trên registry: README hiển thị đúng, đúng số phiên bản mới.
- Cài thử vào một dự án trống: `npm i napas247-qr@<version>`, import cả 4 entry.
- Cập nhật phiên bản trong các dự án đang dùng, quét thử mã QR trên môi trường staging.
