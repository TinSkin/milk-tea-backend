import jwt from "jsonwebtoken";

const TOKEN_EXPIRY_DAYS = Number(process.env.ACCESS_TOKEN_EXPIRY_DAYS) || 7;
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";

// Kiểm tra môi trường là production hay development
const IS_PROD = process.env.NODE_ENV === "production";

// Thời gian không có Ghi nhớ đăng nhập (Remember Me = false)
const NO_REMEMBER_ME_TOKEN_EXPIRY = Number(process.env.NONREMEMBER_TOKEN_EXPIRY_HOURS) || 6;

// Cấu hình cookie (ghi đè qua env khi cần)
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'strict';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';

//! Hàm này tạo JWT token và đặt nó làm cookie trong response
export const generateTokenAndSetCookie = (res, userId, rememberMe = false) => {
    // Chuyển đổi thời gian hết hạn token sang giây cho JWT
    // const tokenExpiryTime = rememberMe ? TOKEN_EXPIRY_DAYS * 24 * 60 * 60 : NO_REMEMBER_ME_TOKEN_EXPIRY * 60 * 60;
    // TEST MODE: Thời gian ngắn để test nhanh
    const tokenExpiryTime = rememberMe 
        ? 4 * 60           // rememberMe = true: 4 phút
        : 3 * 60;          // rememberMe = false: 3 phút
    // Xác định thời gian hết hạn dựa trên tùy chọn rememberMe
    const cookieMaxAge = tokenExpiryTime * 1000;

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: tokenExpiryTime,
    });

    const cookieOptions = {
        httpOnly: true, // Ngăn chặn tấn công XSS
        secure: IS_PROD || COOKIE_SAMESITE === "none", // Secure cần thiết cho SameSite=None
        sameSite: COOKIE_SAMESITE, // Bảo vệ CSRF / xử lý cross-site
        maxAge: cookieMaxAge,
        path: '/',
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    };

    // Đặt tùy chọn rememberMe như một cookie riêng biệt để frontend tham khảo
    const rememberMeCookieOptions = {
        secure: IS_PROD || COOKIE_SAMESITE === "none",
        sameSite: COOKIE_SAMESITE,
        maxAge: cookieMaxAge,
        path: '/',
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    };

    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.cookie("rememberMe", rememberMe.toString(), rememberMeCookieOptions);
};

//! Hàm này xóa cookie xác thực khỏi response
export const clearCookie = (res) => {
    const opts = {
        secure: IS_PROD || COOKIE_SAMESITE === "none",
        sameSite: COOKIE_SAMESITE,
        path: "/",
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    };
    res.clearCookie(COOKIE_NAME, { ...opts, httpOnly: true });
    res.clearCookie("rememberMe", opts);
}
