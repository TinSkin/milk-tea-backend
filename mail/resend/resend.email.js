import { resend, sender } from './resend.config.js';
import { VERIFICATION_EMAIL_TEMPLATE, VERIFICATION_LINK_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE } from "../emailTemplates.js";

//! Hàm gửi mã OTP xác thực email qua Resend
export const sendVerificationOTP = async (email, verificationCode) => {
    console.log(" sendVerificationOTP called for:", email);
    console.log("🔑 Verification code:", verificationCode);
    
    try {
        console.log(" Attempting to send email via Resend...");
        
        const { data, error } = await resend.emails.send({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Xác thực email của bạn",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationToken}", verificationCode)
        });

        if (error) {
            console.error(" Resend API error:", error);
            throw new Error(error.message);
        }

        console.log(` Verification email sent successfully to ${email}`);
        console.log(" Email data:", data);
        
    } catch (error) {
        console.error(` Error sending verification email to ${email}:`, error);
        console.error(" Error details:", {
            message: error.message,
            name: error.name
        });
        throw new Error(`Error sending verification email: ${error.message}`);
    }
};

//! Hàm gửi email liên kết xác thực qua Resend (thay thế cho OTP)
export const sendVerificationLinkEmail = async (email, verifyLink) => {
    console.log(" sendVerificationLinkEmail called for:", email);
    
    try {
        console.log(" Attempting to send verification link email via Resend...");
        
        const { data, error } = await resend.emails.send({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Xác thực email của bạn",
            html: VERIFICATION_LINK_EMAIL_TEMPLATE.replaceAll("{verifyLink}", verifyLink)
        });

        if (error) {
            console.error(" Resend API error:", error);
            throw new Error(error.message);
        }

        console.log(` Verification link email sent successfully to ${email}`);
        console.log(" Email data:", data);
        
    } catch (error) {
        console.error(` Error sending verification link email to ${email}:`, error);
        throw new Error(`Error sending verification link email: ${error.message}`);
    }
};

//! Hàm gửi email chào mừng qua Resend
export const sendWelcomeEmail = async (email, userName) => {
    console.log(" sendWelcomeEmail called for:", email);
    
    try {
        const { data, error } = await resend.emails.send({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Chào mừng đến với Penny Milk Tea",
            html: WELCOME_EMAIL_TEMPLATE.replaceAll("{userName}", userName)
        });

        if (error) {
            console.error(" Resend API error:", error);
            throw new Error(error.message);
        }

        console.log(` Welcome email sent successfully to ${email}`);
        console.log(" Email data:", data);
        
    } catch (error) {
        console.error(` Error sending welcome email to ${email}:`, error);
        throw new Error(`Error sending welcome email: ${error.message}`);
    }
};

//! Hàm gửi email đặt lại mật khẩu qua Resend
export const sendPasswordResetEmail = async (email, resetURL) => {
    console.log(" sendPasswordResetEmail called for:", email);
    
    try {
        const { data, error } = await resend.emails.send({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Đặt lại mật khẩu",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL)
        });

        if (error) {
            console.error(" Resend API error:", error);
            throw new Error(error.message);
        }

        console.log(` Password reset email sent successfully to ${email}`);
        console.log(" Email data:", data);
        
    } catch (error) {
        console.error(` Error sending password reset email to ${email}:`, error);
        throw new Error(`Error sending password reset email: ${error.message}`);
    }
};

//! Function to send confirmation email after successful password reset
export const sendResetSuccessEmail = async (email) => {
    console.log(" sendResetSuccessEmail called for:", email);
    
    try {
        const { data, error } = await resend.emails.send({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Mật khẩu đã được đặt lại thành công",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE
        });

        if (error) {
            console.error(" Resend API error:", error);
            throw new Error(error.message);
        }

        console.log(` Reset success email sent successfully to ${email}`);
        console.log(" Email data:", data);
        
    } catch (error) {
        console.error(` Error sending reset success email to ${email}:`, error);
        throw new Error(`Error sending reset success email: ${error.message}`);
    }
};