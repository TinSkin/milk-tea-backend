//! Verification Email Template
export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác minh Email - Penny Milk Tea</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #D2691E, #CD853F); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Welcome to Penny Milk Tea! 🧋</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Xin chào,</p>
    <p>Cảm ơn bạn đã đăng ký tài khoản Penny Milk Tea! Mã xác thực của bạn là:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #D2691E;">{verificationToken}</span>
    </div>
    <p>Nhập mã này vào trang xác thực để hoàn tất đăng ký tài khoản.</p>
    <p>Mã này sẽ hết hạn sau <b>10 phút</b> vì lý do bảo mật.</p>
    <p>Nếu bạn không tạo tài khoản với chúng tôi, vui lòng bỏ qua email này.</p>
    <p>Trân trọng,<br>Đội ngũ Penny Milk Tea 🧋</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
  </div>
</body>
</html>
`;

//! Verification Link Email Template
export const VERIFICATION_LINK_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Xác minh Email - Penny Milk Tea</title>
</head>
<body style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px;">
  <div style="background: linear-gradient(to right, #D2691E, #CD853F); padding:20px; text-align:center;">
    <h1 style="color:#fff; margin:0;">Welcome to Penny Milk Tea! 🧋</h1>
  </div>

  <div style="background-color:#f9f9f9; padding:20px; border-radius:0 0 5px 5px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
    <p>Xin chào,</p>
    <p>Cảm ơn bạn đã đăng ký tài khoản Penny Milk Tea! Vui lòng xác minh email của bạn bằng cách bấm nút bên dưới:</p>

    <div style="text-align:center; margin:28px 0;">
      <a href="{verifyLink}" style="display:inline-block; background:#D2691E; color:#fff; text-decoration:none; padding:12px 24px; border-radius:6px; font-weight:bold;">
        XÁC MINH EMAIL
      </a>
    </div>

    <p>Nếu nút không hoạt động, hãy sao chép và dán liên kết sau vào trình duyệt của bạn:</p>
    <p style="word-break: break-all;">
      <a href="{verifyLink}" style="color:#D2691E; text-decoration:underline;">{verifyLink}</a>
    </p>

    <p>Liên kết này sẽ hết hạn sau <b>10 phút</b> vì lý do bảo mật.</p>
    <p>Nếu bạn không tạo tài khoản với chúng tôi, vui lòng bỏ qua email này.</p>

    <p>Trân trọng,<br/>Đội ngũ Penny Milk Tea 🧋</p>
  </div>

  <div style="text-align:center; margin-top:20px; color:#888; font-size:0.8em;">
    <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
  </div>
</body>
</html>
`;

//! Welcome Email Template
export const WELCOME_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chào mừng bạn đến với Penny Milk Tea</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #D2691E, #CD853F); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Chào mừng {userName} đến với Penny Milk Tea! 🎉</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Xin chào {userName},</p>
    <p>🎉 Chào mừng bạn đến với gia đình Penny Milk Tea!</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="font-size: 60px;">🧋</div>
      <h2 style="color: #D2691E; margin: 10px 0;">Email đã được xác thực thành công!</h2>
    </div>
    <p>Bây giờ bạn có thể:</p>
    <ul style="color: #555;">
      <li> Đặt hàng trực tuyến</li>
      <li>🎁 Nhận ưu đãi đặc biệt</li>
      <li>⭐ Tích điểm thành viên</li>
      <li>📱 Theo dõi đơn hàng</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pennymilktea.com/menu" style="background-color: #D2691E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        🧋 Khám phá Menu ngay!
      </a>
    </div>
    <p>Cảm ơn bạn đã tin tưởng và lựa chọn Penny Milk Tea!</p>
    <p>Trân trọng,<br>Đội ngũ Penny Milk Tea 🧋</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
  </div>
</body>
</html>
`;

//! Password Reset Success Template
export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu thành công - Penny Milk Tea</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #D2691E, #CD853F); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Đặt lại mật khẩu thành công! 🔐</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Xin chào,</p>
    <p>Chúng tôi xác nhận rằng mật khẩu tài khoản Penny Milk Tea của bạn đã được đặt lại thành công.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #D2691E; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p>Nếu bạn không thực hiện việc đặt lại mật khẩu này, vui lòng liên hệ với đội hỗ trợ của chúng tôi ngay lập tức.</p>
    <p>Vì lý do bảo mật, chúng tôi khuyến nghị bạn:</p>
    <ul>
      <li>🔒 Sử dụng mật khẩu mạnh và duy nhất</li>
      <li>🛡️ Bật xác thực hai yếu tố nếu có</li>
      <li>🚫 Tránh sử dụng cùng mật khẩu trên nhiều trang web</li>
    </ul>
    <p>Cảm ơn bạn đã giúp chúng tôi bảo vệ tài khoản của bạn.</p>
    <p>Trân trọng,<br>Đội ngũ Penny Milk Tea 🧋</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
  </div>
</body>
</html>
`;

//! Password Reset Request Template
export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yêu cầu đặt lại mật khẩu - Penny Milk Tea</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #D2691E, #CD853F); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Đặt lại mật khẩu Penny Milk Tea 🔑</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Xin chào,</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Penny Milk Tea của bạn. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
    <p>Để đặt lại mật khẩu, vui lòng nhấp vào nút bên dưới:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{resetURL}" style="background-color: #D2691E; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">🔑 Đặt lại mật khẩu</a>
    </div>
    <p>Liên kết này sẽ hết hạn sau 1 giờ vì lý do bảo mật.</p>
    <p>Trân trọng,<br>Đội ngũ Penny Milk Tea 🧋</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
  </div>
</body>
</html>
`;