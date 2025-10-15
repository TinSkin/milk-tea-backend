## Mục đích

Thư mục này chứa các schema dùng để **xác thực dữ liệu đầu vào (validate input)** cho các API trong hệ thống.  
Mục tiêu là đảm bảo dữ liệu từ frontend hoặc bên thứ ba gửi lên có **đúng định dạng, kiểu dữ liệu, và giá trị hợp lệ** trước khi xử lý logic chính.

Điều này giúp:

- Ngăn lỗi logic hoặc lỗi database do dữ liệu sai kiểu.
- Đảm bảo API trả lỗi rõ ràng, dễ debug.
- Tách biệt phần kiểm tra dữ liệu ra khỏi controller để code gọn và dễ bảo trì.

---

## Thư viện sử dụng

Thư viện được sử dụng ở đây là **Joi**, một công cụ mạnh mẽ cho việc mô tả và kiểm tra cấu trúc dữ liệu trong Node.js.

Cài đặt:

```bash
npm install joi
```

## Lơi ích của việc sử dụng Joi:

## Lợi ích || Mô tả

Tách biệt logic || Controller chỉ tập trung xử lý nghiệp vụ, không phải kiểm tra dữ liệu.
Giảm lỗi nhập liệu || Dữ liệu sai bị chặn trước khi vào DB hoặc logic chính.
Dễ mở rộng || Thêm endpoint mới chỉ cần tạo schema tương ứng.
Dễ test || Có thể unit test riêng các schema mà không cần chạy server.
