import sgMail, { SENDER_EMAIL, SENDER_NAME } from './sendgrid.config.js';
import { VERIFICATION_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE } from '../emailTemplates.js';

//! Function to send verification OTP via SendGrid
export const sendVerificationOTP = async (email, verificationCode) => {
    console.log("SendGrid: sendVerificationOTP called for:", email);
    console.log("Verification code:", verificationCode);
    
    try {
        console.log("🔄 Attempting to send email via SendGrid...");
        
        const msg = {
            to: email,
            from: {
                email: SENDER_EMAIL,
                name: SENDER_NAME,
            },
            subject: "Penny Milk Tea - Xác thực email của bạn",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationToken}", verificationCode)
        };

        const result = await sgMail.send(msg);
        
        console.log(`✅ Verification email sent successfully to ${email}`);
        console.log("SendGrid Message ID:", result[0].headers['x-message-id']);
        console.log("SendGrid Response:", {
            statusCode: result[0].statusCode,
            headers: result[0].headers
        });
        
        return result;
    } catch (error) {
        console.error(`❌ Error sending verification email to ${email}:`, error.message);
        
        if (error.response) {
            console.error("SendGrid Error Details:", {
                statusCode: error.response.statusCode,
                body: error.response.body
            });
        }
        
        throw error;
    }
};

//! Function to send welcome email via SendGrid
export const sendWelcomeEmail = async (email, name) => {
    console.log("SendGrid: sendWelcomeEmail called for:", email);
    
    try {
        const msg = {
            to: email,
            from: {
                email: SENDER_EMAIL,
                name: SENDER_NAME,
            },
            subject: "Chào mừng đến với Penny Milk Tea!",
            html: WELCOME_EMAIL_TEMPLATE.replace("{userName}", name)
        };

        const result = await sgMail.send(msg);
        console.log(`✅ Welcome email sent successfully to ${email}`);
        return result;
    } catch (error) {
        console.error(`❌ Error sending welcome email to ${email}:`, error.message);
        throw error;
    }
};

//! Function to send password reset email via SendGrid
export const sendPasswordResetEmail = async (email, resetURL) => {
    console.log("SendGrid: sendPasswordResetEmail called for:", email);
    
    try {
        const msg = {
            to: email,
            from: {
                email: SENDER_EMAIL,
                name: SENDER_NAME,
            },
            subject: "Đặt lại mật khẩu - Penny Milk Tea",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL)
        };

        const result = await sgMail.send(msg);
        console.log(`✅ Password reset email sent successfully to ${email}`);
        return result;
    } catch (error) {
        console.error(`❌ Error sending password reset email to ${email}:`, error.message);
        throw error;
    }
};

//! Function to send password reset success email via SendGrid
export const sendResetSuccessEmail = async (email) => {
    console.log("SendGrid: sendResetSuccessEmail called for:", email);
    
    try {
        const msg = {
            to: email,
            from: {
                email: SENDER_EMAIL,
                name: SENDER_NAME,
            },
            subject: "Mật khẩu đã được thay đổi thành công",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE
        };

        const result = await sgMail.send(msg);
        console.log(`✅ Reset success email sent successfully to ${email}`);
        return result;
    } catch (error) {
        console.error(`❌ Error sending reset success email to ${email}:`, error.message);
        throw error;
    }
};
