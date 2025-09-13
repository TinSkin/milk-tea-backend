import jwt from "jsonwebtoken";

const TOKEN_EXPIRY_DAYS = Number(process.env.ACCESS_TOKEN_EXPIRY_DAYS) || 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";

//! This function generates a JWT token and sets it as a cookie in the response.
export const generateTokenAndSetCookie = (res, userId) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: `${TOKEN_EXPIRY_DAYS}d`, // Token will expire in 7 day
    });

    const cookieOptions = {
        httpOnly: true, // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict', // CSRF protection
        maxAge: TOKEN_EXPIRY_DAYS * MILLISECONDS_PER_DAY, // Cookie will expire in 7 days
        path: '/',
    };

    res.cookie(COOKIE_NAME, token, cookieOptions);
};

//! This function clears the authentication cookie from the response.
export const clearCookie = (res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: '/',
    });
}