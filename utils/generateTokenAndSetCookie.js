import jwt from "jsonwebtoken";

const TOKEN_EXPIRY_DAYS = Number(process.env.ACCESS_TOKEN_EXPIRY_DAYS) || 7;
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";

// Check if the environment is production or development
const IS_PROD = process.env.NODE_ENV === "production";

// Time without Remember Me
const NO_REMEMBER_ME_TOKEN_EXPIRY = Number(process.env.NONREMEMBER_TOKEN_EXPIRY_HOURS) || 6;

// Cookie configuration (override via env when needed)
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'strict';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';

// This function generates a JWT token and sets it as a cookie in the response.
export const generateTokenAndSetCookie = (res, userId, rememberMe = false) => {
    // Convert token expiry to seconds for JWT
    // const tokenExpiryTime = rememberMe ? TOKEN_EXPIRY_DAYS * 24 * 60 * 60 : NO_REMEMBER_ME_TOKEN_EXPIRY * 60 * 60;
    // TEST MODE: Thời gian ngắn để test nhanh
    const tokenExpiryTime = rememberMe 
        ? 4 * 60          // rememberMe = true: 3 phút
        : 3 * 60;          // rememberMe = false: 3 phút
    // Determine expiry time based on rememberMe option
    const cookieMaxAge = tokenExpiryTime * 1000;

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: tokenExpiryTime,
    });

    const cookieOptions = {
        httpOnly: true, // Prevents XSS attacks
        secure: IS_PROD || COOKIE_SAMESITE === "none", // Secure required for SameSite=None
        sameSite: COOKIE_SAMESITE, // CSRF protection / cross-site handling
        maxAge: cookieMaxAge,
        path: '/',
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    };

    // Set the rememberMe preference as a separate cookie for frontend reference
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

// This function clears the authentication cookie from the response.
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
