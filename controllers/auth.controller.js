// Thư viện mã hóa mật khẩu
import bcryptjs from "bcryptjs";
// Thư viện tạo token ngẫu nhiên
import crypto from "crypto";
// JSON Web Token library
import jwt from "jsonwebtoken";
// Google OAuth client
import { OAuth2Client } from 'google-auth-library';
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

// import { sendVerificationOTP, sendVerificationLinkEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from "../mail/resend/resend.email.js";
import { sendVerificationOTP, sendVerificationLinkEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from "../mail/sendgrid/sendgrid.email.js";
import { shouldVerifyGoogleUser, getVerificationReason } from "../utils/verificationRules.js";

import User from "../models/User.model.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//! Hàm đăng ký để tạo người dùng mới
export const register = async (req, res) => {
    const { userName, phoneNumber, email, password } = req.body;

    try {
        // Xác thực các trường bắt buộc
        if (!userName || !email || !phoneNumber || !password) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc"
            });
        }

        // Kiểm tra email đã tồn tại
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email đã tồn tại" });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcryptjs.hash(password, 12);

        // Tạo người dùng mới
        const newUser = await User.create({
            userName,
            phoneNumber,
            email,
            password: hashedPassword,
            provider: 'local',
            isVerified: false, // Mặc định chưa xác thực
        });

        await newUser.save();

        // Tự động đăng nhập (nhưng không xác thực email) - mặc định Ghi nhớ đăng nhập là false cho đăng ký
        generateTokenAndSetCookie(res, newUser._id, false);

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công. Vui lòng xác thực email.",
        });
    } catch (error) {
        console.error("Error signing up:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Hàm xác thực mã OTP để xác nhận email người dùng
export const checkOTP = async (req, res) => {
    const { code } = req.body;
    try {
        // Kiểm tra mã có hợp lệ không
        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: "Mã OTP không hợp lệ" });
        }

        const userId = req.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Tìm người dùng theo ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ success: false, message: "Unauthorized" });
        }

        // Nếu người dùng đã được xác thực
        if (user.isVerified) {
            return res.status(200).json({ success: true, message: "Email đã được xác minh" });
        }

        // Nếu mã xác thực không được đặt hoặc đã hết hạn
        if (!user.verificationCode || !user.verificationCodeExpiresAt) {
            return res.status(410).json({ success: false, message: "Không có OTP đang chờ, vui lòng gửi lại mã" });
        }

        // Nếu mã xác thực đã hết hạn
        if (Date.now() > new Date(user.verificationCodeExpiresAt).getTime()) {
            return res.status(410).json({ success: false, message: "Mã OTP đã hết hạn, vui lòng gửi lại" });
        }

        // So sánh mã OTP
        if (code !== user.verificationCode) {
            return res.status(400).json({ success: false, message: "Mã OTP không đúng" });
        }

        // Đánh dấu người dùng đã được xác thực và xóa token xác thực cùng ngày hết hạn
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpiresAt = undefined;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;

        // Cập nhật thời gian đăng nhập cuối
        user.lastLogin = new Date();

        await user.save();

        // Gửi email chào mừng cho người dùng
        try {
            await sendWelcomeEmail(user.email, user.userName);
        } catch (e) {
            console.error("sendWelcomeEmail error:", e);
        }

        // Tạo token và đặt cookie (tự động đăng nhập khi được xác thực)
        generateTokenAndSetCookie(res, user._id);

        // Trả về thành công và dữ liệu người dùng (loại trừ mật khẩu)
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
            isAuthenticated: true, // Cho biết người dùng đã được xác thực
        });
    } catch (error) {
        console.error("Error verifying email:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
}

//! Hàm gửi lại mã xác thực OTP
export const resendVerificationOTP = async (req, res) => {
    console.log("resendVerificationOTP called with:", req.body);
    
    try {
        // Kiểm tra xem email có được cung cấp không
        const req_email = req.body?.email;
        if (!req_email) {
            console.log("Missing email in request");
            return res.status(400).json({ success: false, message: "Email là bắt buộc" });
        }

        // Chuẩn hóa email
        const email = req_email.trim().toLowerCase();
        console.log("Processing email:", email);

        // Tìm người dùng theo email
        const user = await User.findOne({ email });

        // Nếu không tìm thấy người dùng
        if (!user) {
            console.log("User not found for email:", email);
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // Nếu người dùng đã được xác thực
        if (user.isVerified) {
            console.log("User already verified:", email);
            return res.status(400).json({ success: false, message: "Email đã được xác minh" });
        }

        // Tạo token xác thực mới
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
        console.log("Generated verification code for:", email);

        // Cập nhật mã xác thực và thời gian hết hạn của người dùng
        user.verificationCode = verificationCode;
        user.verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // Mã có hiệu lực trong 10 phút

        // Lưu người dùng đã cập nhật
        await user.save();
        console.log("User verification code updated in database");

        // Gửi email xác thực mới cho người dùng
        console.log("Attempting to send verification email...");
        await sendVerificationOTP(user.email, verificationCode);
        console.log("Verification email sent successfully");

        // Trả về thông báo thành công
        res.status(200).json({ success: true, message: "Mã xác thực mới đã được gửi. Vui lòng kiểm tra email của bạn." });
    } catch (error) {
        console.error("Error in resendVerificationOTP:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Hàm xác thực email để xác nhận email người dùng
export const checkEmailLink = async (req, res) => {
    // Lấy token từ body hoặc query
    const token = req.body?.token || req.query?.token;

    // Nếu thiếu token
    if (!token) {
        return res.status(400).json({ success: false, message: "Thiếu token xác thực" });
    }

    // Xác minh JWT dựa trên JWT_SECRET của server
    try {
        let payload;

        try {
            // Kiểm tra token
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            if (e.name === "TokenExpiredError") {
                return res.status(410).json({ success: false, message: "Token đã hết hạn" });
            }

            return res.status(400).json({ success: false, message: "Token không hợp lệ" });
        }

        // Lấy userId từ payload JWT (phụ thuộc vào cách ký là userId/sub/id/_id)
        const userId = payload.userId || payload.sub || payload.id || payload._id;
        if (!userId) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ" });
        }

        // Tìm người dùng từ userId
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // Nếu người dùng đã được xác minh, trả về OK với định dạng phản hồi phù hợp
        if (user.isVerified) {
            if (user.verificationToken || user.verificationTokenExpiresAt) {
                user.verificationToken = undefined;
                user.verificationTokenExpiresAt = undefined;
                await user.save();
            }

            // Để nhất quán với frontend, trả về định dạng giống như xác minh thành công
            return res.json({
                success: true,
                message: "Email đã được xác minh trước đó",
                user: {
                    ...user._doc,
                    password: undefined,
                    verificationCode: undefined,
                    verificationCodeExpiresAt: undefined,
                    verificationToken: undefined,
                    verificationTokenExpiresAt: undefined,
                },
                isAuthenticated: true,
            });
        }

        // Ngăn chặn sử dụng token đã hết hạn hoặc không hợp lệ: so sánh token trong DB với token do client gửi (Kiểm tra chéo token)
        if (!user.verificationToken || user.verificationToken !== token) {
            return res.status(400).json({ success: false, message: "Token không hợp lệ" })
        }

        // Kiểm tra thời hạn trong DB (410 Code cho hết hạn)
        if (!user.verificationTokenExpiresAt ||
            Date.now() > new Date(user.verificationTokenExpiresAt).getTime()) {
            return res.status(410).json({ success: false, message: "Token đã hết hạn" });
        }

        // Xác minh thành công, xóa tất cả các trường xác minh
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        user.verificationCode = undefined;
        user.verificationCodeExpiresAt = undefined;

        // Cập nhật thời gian đăng nhập cuối cùng
        user.lastLogin = new Date();

        await user.save();

        // Gửi email chào mừng cho người dùng
        try {
            await sendWelcomeEmail(user.email, user.userName);
        } catch (e) {
            console.error("sendWelcomeEmail error:", e);
        }

        // Tạo token và đặt cookie (tự động đăng nhập khi được xác minh)
        generateTokenAndSetCookie(res, user._id);

        res.status(200).json({
            success: true,
            message: "Xác minh email thành công",
            user: {
                ...user._doc,
                password: undefined,
                verificationCode: undefined,
                verificationCodeExpiresAt: undefined,
                verificationToken: undefined,
                verificationTokenExpiresAt: undefined,
            },
            isAuthenticated: true,
        });

    } catch (error) {
        console.error("Error checking email link:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Hàm gửi lại email xác minh
export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Thiếu email" });
        }

        // Tìm người dùng
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // Nếu đã xác minh thì không gửi nữa
        if (user.isVerified) {
            return res.status(400).json({ success: false, message: "Email đã được xác minh" });
        }

        // Tạo token liên kết (JWT) có hiệu lực 15 phút
        const verificationToken = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Lưu vào cơ sở dữ liệu 
        user.verificationToken = verificationToken;
        user.verificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        const base = process.env.NODE_ENV === 'production'
            ? process.env.CLIENT_URL_PROD
            : process.env.CLIENT_URL_DEV;
        const verifyLink = `${base}/verify-email?token=${encodeURIComponent(verificationToken)}`;

        // Gửi email liên kết xác minh
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

//! Hàm đăng nhập để xác thực người dùng
export const login = async (req, res) => {
    const { email, password, rememberMe = false } = req.body;

    try {
        // Xác thực dữ liệu đầu vào
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Thiếu email hoặc mật khẩu" });
        }

        // Tìm người dùng theo email
        const user = await User.findOne({ email });

        // Nếu không tìm thấy người dùng
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        // Kiểm tra xem mật khẩu có đúng không
        const isPasswordCorrect = await bcryptjs.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ success: false, message: "Mật khẩu không đúng" });
        }

        // Tạo token và đặt cookie với tùy chọn rememberMe
        generateTokenAndSetCookie(res, user._id, rememberMe);

        // Cập nhật thời gian đăng nhập cuối cùng
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
            assignedStoreId: user.assignedStoreId || null,
        }

        // Trả về thành công và dữ liệu người dùng (không bao gồm mật khẩu)
        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            user: temp_user,
            isAuthenticated: true,
            requiresEmailVerification: !user.isVerified,
        });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Hàm kiểm tra xác thực để xác minh phiên đăng nhập của người dùng
export const checkAuth = async (req, res) => {
    try {
        // Debug logs
        console.log("=== CHECK AUTH DEBUG ===");
        console.log("req.userId:", req.userId);
        console.log("req.userId type:", typeof req.userId);

        // Xác thực userId tồn tại
        if (!req.userId) {
            console.log("No userId in request");
            return res.status(401).json({ success: false, message: "No userId provided" });
        }

        // Kiểm tra xem userId có đúng định dạng ObjectId không
        if (!req.userId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log("Invalid ObjectId format");
            return res.status(400).json({ success: false, message: "Invalid user ID format" });
        }

        console.log("Finding user by ID:", req.userId);
        const user = await User.findById(req.userId).select("-password");
        console.log("User found:", !!user);

        // Nếu không tìm thấy người dùng
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error checking authentication:", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
}

//! Hàm quên mật khẩu để bắt đầu quá trình đặt lại mật khẩu
export const forgotPassword = async (req, res) => {
    const rawEmail = req.body?.email;
    if (!rawEmail) {
        return res.status(400).json({ success: false, message: "Email là bắt buộc" });
    }
    const email = rawEmail.trim().toLowerCase();

    try {
        const user = await User.findOne({ email });

        if (user) {
            // Tạo token đặt lại mật khẩu
            // Tạo token ngẫu nhiên và đặt thời gian hết hạn (1 giờ từ bây giờ)
            const resetToken = crypto.randomBytes(32).toString("hex");
            // Tạo token đặt lại và đặt thời gian hết hạn
            const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;
            // Thời gian hết hạn là 1 giờ (tính bằng milliseconds)
            // 1 * 60 * 60 * 1000 có nghĩa là:
            // (1 giờ)
            // 60 phút/giờ * 60 giây/phút * 1000 milliseconds/giây = 3,600,000 ms (1 giờ)

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpiresAt = resetTokenExpiresAt;

            await user.save();

            // Gửi email
            const base = process.env.NODE_ENV === 'production'
                ? process.env.CLIENT_URL_PROD
                : process.env.CLIENT_URL_DEV;
            const resetLink = `${base}/reset-password/${resetToken}`;
            await sendPasswordResetEmail(user.email, resetLink);
        }

        res.status(200).json({ success: true, message: "Vui lòng kiểm tra email của bạn để đặt lại mật khẩu." });
    } catch (error) {
        console.log("Error in forgotPassword ", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Hàm đặt lại mật khẩu cho phép người dùng đặt mật khẩu mới bằng token hợp lệ (token được gửi qua email khi người dùng yêu cầu đặt lại mật khẩu)
export const resetPassword = async (req, res) => {
    try {
        // Lấy token từ URL params (req.params) và mật khẩu mới từ request body
        const { token } = req.params; // Token để đặt lại mật khẩu, ví dụ: /reset-password/:token
        const { password } = req.body || {}; // Mật khẩu mới do người dùng nhập

        if (!token) {
            return res.status(400).json({ success: false, message: "Thiếu token đặt lại mật khẩu" });
        }
        if (!password) {
            return res.status(400).json({ success: false, message: "Thiếu mật khẩu mới" });
        }

        // Kiểm tra độ mạnh mật khẩu tùy chọn
        const weak =
            password.length < 8 ||
            !/[A-Za-z]/.test(password) ||
            !/\d/.test(password);
        if (weak) {
            return res.status(400).json({ success: false, message: "Mật khẩu phải ≥ 8 ký tự và gồm cả chữ & số" });
        }

        // Tìm người dùng trong cơ sở dữ liệu với resetPasswordToken khớp với token được cung cấp
        // và resetPasswordExpiresAt phải lớn hơn thời gian hiện tại (tức là token vẫn còn hợp lệ)
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        });

        // Nếu không tìm thấy người dùng hoặc token đã hết hạn, trả về lỗi cho client
        if (!user) {
            return res.status(410).json({ success: false, message: "Liên kết đặt lại không hợp lệ hoặc đã hết hạn" });
        }

        // Nếu tìm thấy người dùng, tiến hành hash mật khẩu mới bằng bcryptjs với 12 salt rounds
        // Hash mật khẩu mới
        const hashedPassword = await bcryptjs.hash(password, 12);

        // Cập nhật mật khẩu, resetPasswordToken và resetPasswordExpiresAt của người dùng để ngăn tái sử dụng token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined; // Xóa token sau khi sử dụng
        user.resetPasswordExpiresAt = undefined; // Xóa thời gian hết hạn token
        await user.save(); // Lưu các thay đổi vào cơ sở dữ liệu

        // Gửi email thông báo người dùng đã đặt lại mật khẩu thành công
        // (hàm sendResetSuccessEmail cần được định nghĩa ở nơi khác, ví dụ: trong mailtrap/emails.js)
        try { await sendResetSuccessEmail(user.email); } catch (e) { console.error("sendResetSuccessEmail error:", e); }

        // Trả về thông báo thành công cho client
        res.status(200).json({ success: true, message: "Đã đặt lại mật khẩu thành công." });
    } catch (error) {
        // Nếu có lỗi, ghi log ra console và trả về thông báo lỗi cho client
        console.log("Error in resetPassword ", error);
        res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Hàm đăng xuất để xóa phiên đăng nhập của người dùng
export const logout = (req, res) => {
    try {
        // Xóa cookie
        res.clearCookie("token");

        return res.status(200).json({ success: true, message: "Đăng xuất thành công" });
    } catch (error) {
        console.error("Error logging out:", error);
        return res.status(500).json({ success: false, message: "Lỗi kết nối đến máy chủ" });
    }
};

//! Xác thực Google OAuth
export const googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: "Google credential is required"
            });
        }

        // Xác minh token Google
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const {
            sub: googleId,
            email,
            name,
            picture,
            email_verified
        } = payload;

        console.log("Google payload:", { googleId, email, name, email_verified });

        // Kiểm tra xem người dùng có tồn tại với email này không
        let user = await User.findOne({ email });

        if (user) {
            // Người dùng tồn tại - cập nhật thông tin Google nếu cần
            console.log("User exists, updating Google info...");

            if (!user.googleId) {
                user.googleId = googleId;
                user.avatar = picture;
                user.provider = 'google';
                user.isVerified = email_verified;
                await user.save();
            }
        } else {
            // Tạo người dùng mới từ thông tin Google
            console.log("Creating new user from Google...");

            user = new User({
                userName: name,
                email,
                googleId,
                avatar: picture,
                provider: 'google',
                isVerified: false, // Sẽ được xác định bởi các quy tắc xác minh
                phoneNumber: '', // Để trống, sẽ được cập nhật sau nếu cần
                password: '', // Để trống cho Google OAuth, không cần mật khẩu
                role: 'customer',
                status: 'active'
            });
            await user.save();
        }

        // Kiểm tra xem người dùng Google có cần xác minh bổ sung không
        const needsVerification = shouldVerifyGoogleUser(user, {
            isNewSession: true,
            provider: 'google'
        });

        const verificationReason = getVerificationReason(user, {
            isNewSession: true,
            provider: 'google'
        });

        console.log(`Google verification check for ${email}:`, {
            needsVerification,
            reason: verificationReason,
            userIsVerified: user.isVerified
        });

        // Nếu người dùng cần xác minh (người dùng mới hoặc chưa được xác minh)
        if (needsVerification && !user.isVerified) {
            user.isVerified = false;
            await user.save();

            console.log(`Google login requires verification for ${email} — deferring token/email send to user's choice.`);

            return res.status(200).json({
                success: true,
                message: "Để bảo mật tài khoản, vui lòng xác thực email (chọn phương thức xác thực)",
                requiresVerification: true,
                user: {
                    email: user.email,
                    provider: 'google'
                },
                verificationReason
            });
        }

        // Không cần xác minh - người dùng đã được xác minh hoặc không cần xác minh
        user.isVerified = true;

        // Cập nhật thời gian đăng nhập cuối cùng
        user.lastLogin = new Date();
        await user.save();

        // Tạo JWT token và đặt cookie
        generateTokenAndSetCookie(res, user._id);

        res.status(200).json({
            success: true,
            message: user.provider === 'google' ? "Đăng nhập Google thành công" : "Tài khoản được liên kết với Google",
            user: {
                ...user._doc,
                password: undefined, // Không gửi mật khẩu
            },
        });
    } catch (error) {
        console.error("Google login error:", error);

        if (error.message.includes('Token used too early')) {
            return res.status(400).json({
                success: false,
                message: "Token Google không hợp lệ hoặc đã hết hạn"
            });
        }

        res.status(500).json({
            success: false,
            message: "Lỗi server khi xác thực Google"
        });
    }
}