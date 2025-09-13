# Middleware để check token của người dùng
# Check token của người dùng dựa trên JWT và check email đã được xác thực hay chưa

<!--! Method: Tách riêng verifyEmail và verifyToken -->

- Ưu điểm: rõ ràng, dễ đọc, tách biệt logic xác thực và logic xác minh email.

* verifyToken sẽ kiểm tra token của người dùng, nếu token hợp lệ sẽ lấy thông tin người dùng từ token và lưu vào `req.userId` và `req.user` để sử dụng trong các middleware hoặc route tiếp theo.

* verifyEmail sẽ chỉ check email đã được xác thực hay chưa, không cần phải verify token

<!--! Method: Dùng chung cho cả verifyEmail và verifyToken -->

- Ưu điểm: chỉ cần 1 middleware cho protected route.
- Nhược điểm: mất tính tách biệt, khó tái sử dụng nếu có route yêu cầu đăng nhập nhưng không yêu cầu verify email.

* verifyTokenAndEmail sẽ kiểm tra token của người dùng, nếu token hợp lệ sẽ lấy thông tin người dùng từ token và lưu vào `req.userId` và `req.user` để sử dụng trong các middleware hoặc route tiếp theo. Đồng thời, nó cũng sẽ kiểm tra xem email của người dùng đã được xác thực hay chưa.

# Middleware để giới hạn gửi lại email
# Giới hạn gửi lại email xác thực trong vòng 15 phút

<!--! Method: rateLimitResendEmail sử dụng middleware để giới hạn số lần gửi lại email xác thực -->

- Ưu điểm: dễ dàng cấu hình, có thể tùy chỉnh số lần gửi lại và thời gian chờ.
- Nhược điểm: sử dụng cho một instance duy nhất, không thể chia sẻ giữa các instance khác nhau.

* rateLimitResendEmail sẽ giới hạn số lần gửi lại email xác thực trong vòng 15 phút. Nếu người dùng đã gửi quá số lần giới hạn, middleware sẽ trả về lỗi 429 (Too Many Requests).

