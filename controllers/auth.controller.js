import bcryptjs from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

import { sendVerificationOTP, sendVerificationLinkEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from "../mail/email.js";

import User from "../models/User.model.js";

//! Register function to create a new user
export const register = async (req, res) => {
    const { userName, phoneNumber, email, password } = req.body;

    try {
        // Validate input
        if (!userName || !phoneNumber || !email || !password) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin để đăng ký" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email đã tồn tại" });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 12);

        // Create new user
        const newUser = await User.create({
            userName,
            phoneNumber,
            email,
            password: hashedPassword,
            isVerified: false, // Initially set to false
        });

        // Generate verification code (6 digits)
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
        newUser.verificationCode = verificationCode;
        newUser.verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Generate verification email (Link)
        const verificationToken = jwt.sign(
            { userId: newUser._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );
        newUser.verificationToken = verificationToken;
        newUser.verificationTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await newUser.save();

        // Auto login (but not verify email)
        generateTokenAndSetCookie(res, newUser._id);

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công. Vui lòng xác thực email.",
        });
    } catch (error) {
        console.error("Error signing up:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Verify code function to confirm user email
export const checkOTP = async (req, res) => {
    const { code } = req.body;
    try {
        // Check if code is valid
        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: "Mã OTP không hợp lệ" });
        }

        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ success: false, message: "Unauthorized" });
        }

        // If user is verified
        if (user.isVerified) {
            return res.status(200).json({ success: true, message: "Email đã được xác minh" });
        }

        // If verification code is not set or has expired
        if (!user.verificationCode || !user.verificationCodeExpiresAt) {
            return res.status(410).json({ success: false, message: "Không có OTP đang chờ, vui lòng gửi lại mã" });
        }

        // If verification code has expired
        if (Date.now() > new Date(user.verificationCodeExpiresAt).getTime()) {
            return res.status(410).json({ success: false, message: "Mã OTP đã hết hạn, vui lòng gửi lại" });
        }

        // Compare OTP code
        if (code !== user.verificationCode) {
            return res.status(400).json({ success: false, message: "Mã OTP không đúng" });
        }

        // Mark the user as verified and remove the verification token and its expiration date
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpiresAt = undefined;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;

        // Update last login time
        user.lastLogin = new Date();

        await user.save();

        // Send a welcome email to the user
        await sendWelcomeEmail(user.email, user.userName);

        // Generate token and set cookie (auto login when verified)
        generateTokenAndSetCookie(res, user._id);

        // Respond with success and the user data (excluding password)
        res.status(200).json({
            success: true,
            message: "Email đã được xác thực thành công",
            user: {
                ...user._doc,
                password: undefined,
                verificationCode: undefined,
                verificationCodeExpiresAt: undefined,
                verificationToken: undefined,
                verificationTokenExpiresAt: undefined,
            },
            isAuthenticated: true, // Indicate user is authenticated
        });
    } catch (error) {
        console.error("Error verifying email:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
}

//! Resend verification OTP function
export const resendVerificationOTP = async (req, res) => {
    try {
        // Check if email is provided
        const req_email = req.body?.email;
        if (!req_email) {
            return res.status(400).json({ success: false, message: "Email là bắt buộc" });
        }

        // Normalize email
        const email = req_email.trim().toLowerCase();

        // Find user by email
        const user = await User.findOne({ email });

        // If user not found
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // If user is already verified
        if (user.isVerified) {
            return res.status(400).json({ success: false, message: "Email đã được xác minh" });
        }

        // Generate new verification token
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

        // Update user's verification code and code expiry
        user.verificationCode = verificationCode;
        user.verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // Code valid for 10 minutes

        // Save updated user
        await user.save();

        // Send a new verification email to the user
        await sendVerificationOTP(user.email, verificationCode);

        // Respond with success message
        res.status(200).json({ success: true, message: "Mã xác thực mới đã được gửi. Vui lòng kiểm tra email của bạn." });
    } catch (error) {
        console.error("Error resending verification email:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Verify email function to confirm user email
export const checkEmailLink = async (req, res) => {
    // Take token from body or query
    const token = req.body?.token || req.query?.token;

    // If token is missing
    if (!token) {
        return res.status(400).json({ success: false, message: "Thiếu token xác thực" });
    }

    // Verify JWT based on JWT_SECRET of server
    try {
        let payload;

        try {
            // Check token
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            if (e.name === "TokenExpiredError") {
                return res.status(410).json({ success: false, message: "Token đã hết hạn" });
            }

            return res.status(400).json({ success: false, message: "Token không hợp lệ" });
        }

        // Take userId from payload JWT (depend on your sign is userId/sub/id/_id)
        const userId = payload.userId || payload.sub || payload.id || payload._id;
        if (!userId) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ" });
        }

        // Find user from userId
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // If user is verified, return OK
        if (user.isVerified) {
            if (user.verificationToken || user.verificationTokenExpiresAt) {
                user.verificationToken = undefined;
                user.verificationTokenExpiresAt = undefined;
                await user.save();
            }
            return res.json({ success: true, message: "Email đã được xác minh trước đó" });
        }

        // Prevent using expired or invalid tokens: compare to token in DB with token sent by client (Cross-check token)
        if (!user.verificationToken || user.verificationToken !== token) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ" })
        }

        // Check expiry in DB (410 Code for expired)
        if (!user.verificationTokenExpiresAt ||
            Date.now() > new Date(user.verificationTokenExpiresAt).getTime()) {
            return res.status(410).json({ success: false, message: "Token đã hết hạn" });
        }

        // Successfully verified, clear out all verification fields
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        user.verificationCode = undefined;
        user.verificationCodeExpiresAt = undefined;

        await user.save();

        // Send a welcome email to the user
        try {
            await sendWelcomeEmail(user.email, user.userName);
        } catch (e) {
            console.error("sendWelcomeEmail error:", e);
        }

        //* Auto-login when verified, check for existing token
        // - If request has existing token (cookie or auth header/bearer) of this user -> refresh token/cookie
        // - If no existing token, generate new token and set cookie -> using for redirect to login page
        const existing = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
        let autoLogin = false;
        if (existing) {
            try {
                const dec = jwt.verify(existing, process.env.JWT_SECRET);
                const decId = dec.id || dec.userId || dec._id;
                autoLogin = String(decId) === String(user._id);
            } catch (_) { }

            // Generate token and set cookie (auto login when verified)
            if (autoLogin) {
                generateTokenAndSetCookie(res, user._id); // refresh cookie nếu muốn
            }
            return res.json({
                success: true,
                message: "Email đã được xác minh trước đó",
                loginRequired: !autoLogin, // FE có thể dựa vào flag này để điều hướng
            });
        }
        
        return res.json({ success: true, message: "Xác minh email thành công", loginRequired: !autoLogin });

    } catch (error) {
        console.error("Error checking email link:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Resend verification email function
export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Thiếu email" });
        }

        // 1) Tìm user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // 2) Nếu đã verify thì không gửi nữa
        if (user.isVerified) {
            return res.status(400).json({ success: false, message: "Email đã được xác minh" });
        }

        // 3) Tạo token link (JWT) 15 phút
        const verificationToken = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        // 4) Lưu vào DB (đồng bộ hạn 15 phút)
        user.verificationToken = verificationToken;
        user.verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        const base = process.env.APP_ORIGIN || process.env.CLIENT_URL; // CLIENT_URL
        const verifyLink = `${base}/verify-email?token=${encodeURIComponent(verificationToken)}`;

        // 5) Gửi email link
        await sendVerificationLinkEmail(user.email, verifyLink);

        if (process.env.NODE_ENV !== "production") {
            res.set("X-Debug-VerifyToken", verificationToken);
            // hoặc trả trong body: debugToken / debugLink
        }

        return res.status(200).json({
            success: true,
            message: "Đã gửi lại liên kết xác minh. Vui lòng kiểm tra email của bạn.",
        });
    } catch (err) {
        console.error("Error resending verification link:", err);
        return res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
}

//! Login function to authenticate user
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Thiếu email hoặc mật khẩu" });
        }

        // Find user by email
        const user = await User.findOne({ email });

        // If user not found
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // Check if password is correct
        const isPasswordCorrect = await bcryptjs.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ success: false, message: "Mật khẩu không đúng" });
        }

        // Generate token and set cookie
        generateTokenAndSetCookie(res, user._id);

        // Update last login time
        user.lastLogin = Date.now();
        await user.save();

        const temp_user = {
            id: user._id,
            userName: user.userName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isVerified: user.isVerified,
            lastLogin: user.lastLogin,
        }

        // Respond with success and the user data (excluding password)
        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            user: temp_user,
            isAuthenticated: true,
            requiresEmailVerification: !user.isVerified, // redirect /verify-choice
        });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Check authentication function to verify user session
export const checkAuth = async (req, res) => {
    try {
        // Debug logs
        console.log("=== CHECK AUTH DEBUG ===");
        console.log("req.userId:", req.userId);
        console.log("req.userId type:", typeof req.userId);

        // Validate userId exists
        if (!req.userId) {
            console.log("No userId in request");
            return res.status(401).json({ success: false, message: "No userId provided" });
        }

        // Check if userId is valid ObjectId format
        if (!req.userId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log("Invalid ObjectId format");
            return res.status(400).json({ success: false, message: "Invalid user ID format" });
        }

        console.log("Finding user by ID:", req.userId);
        const user = await User.findById(req.userId).select("-password");
        console.log("User found:", !!user);

        // If user not found
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error checking authentication:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
}

//! Forgot password function to initiate password reset
export const forgotPassword = async (req, res) => {
    const rawEmail = req.body?.email;
    if (!rawEmail) {
        return res.status(400).json({ success: false, message: "Email là bắt buộc" });
    }
    const email = rawEmail.trim().toLowerCase();

    try {
        const user = await User.findOne({ email });

        if (user) {
            // Generate reset token
            // Generate a random token and set its expiration time (1 hour from now)
            const resetToken = crypto.randomBytes(32).toString("hex");
            // Create a reset token and set its expiration time
            const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;
            // Expiry time is 1 hour (in milliseconds)
            // 1 * 60 * 60 * 1000 means:
            // (1 hour)
            // 60 minutes/hour * 60 seconds/minute * 1000 milliseconds/second = 3,600,000 ms (1 hour)

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpiresAt = resetTokenExpiresAt;

            await user.save();

            // Send email
            const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
            await sendPasswordResetEmail(user.email, resetLink);
        }

        res.status(200).json({ success: true, message: "Vui lòng kiểm tra email của bạn để đặt lại mật khẩu." });
    } catch (error) {
        console.log("Error in forgotPassword ", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Reset password function allowing user to set a new password using a valid token (token is usually sent via email when user requests a password reset)
export const resetPassword = async (req, res) => {
    try {
        // Get the token from URL params (req.params) and new password from request body
        const { token } = req.params; // Token for resetting password, e.g., /reset-password/:token
        const { password } = req.body || {}; // New password entered by the user

        if (!token) {
            return res.status(400).json({ success: false, message: "Thiếu token đặt lại mật khẩu" });
        }
        if (!password) {
            return res.status(400).json({ success: false, message: "Thiếu mật khẩu mới" });
        }

        // Optional password strength check
        const weak =
            password.length < 8 ||
            !/[A-Za-z]/.test(password) ||
            !/\d/.test(password);
        if (weak) {
            return res.status(400).json({ success: false, message: "Mật khẩu phải ≥ 8 ký tự và gồm cả chữ & số" });
        }

        // Find user in the database with resetPasswordToken matching the provided token
        // and resetPasswordExpiresAt must be greater than the current time (i.e., token is still valid)
        // must be greater than the current time (i.e., token is still valid)
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        });

        // If user not found or token expired, return error to client
        if (!user) {
            return res.status(410).json({ success: false, message: "Liên kết đặt lại không hợp lệ hoặc đã hết hạn" });
        }

        // If user found, proceed to hash the new password using bcryptjs with 10 salt rounds
        // Hash the new password 
        const hashedPassword = await bcryptjs.hash(password, 12);

        // Update user's password, resetPasswordToken and resetPasswordExpiresAt to prevent reuse of the token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined; // Delete token after use
        user.resetPasswordExpiresAt = undefined; // Delete token expiration time
        await user.save(); // Save changes to database

        // Send email to notify user that password has been successfully reset
        // (sendResetSuccessEmail function needs to be defined elsewhere, e.g., in mailtrap/emails.js)
        try { await sendResetSuccessEmail(user.email); } catch (e) { console.error("sendResetSuccessEmail error:", e); }

        // Respond with success message to client
        res.status(200).json({ success: true, message: "Đã đặt lại mật khẩu thành công." });
    } catch (error) {
        // If there is an error, log it to the console and return an error response to the client
        console.log("Error in resetPassword ", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Logout function to clear user session
export const logout = (req, res) => {
    try {
        // Clear the cookie
        res.clearCookie("token");

        return res.status(200).json({ success: true, message: "Đăng xuất thành công" });
    } catch (error) {
        console.error("Error logging out:", error);
        return res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};