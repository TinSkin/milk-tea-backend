import { VERIFICATION_EMAIL_TEMPLATE, VERIFICATION_LINK_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE } from "./emailTemplates.js";
import { transporter, sender } from "./nodemailer.config.js";

//! Function to send verification OTP
export const sendVerificationOTP = async (email, verificationCode) => {
    console.log("sendVerificationOTP called for:", email);
    console.log("Verification code:", verificationCode);
    
    const recipient = [{ email }];

    try {
        console.log("Attempting to send email via transporter...");
        const info = await transporter.sendMail({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Xác thực email của bạn",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationToken}", verificationCode)
        });

        console.log(`Verification email sent successfully to ${email}:`, info.messageId);
        console.log("Email info:", {
            messageId: info.messageId,
            response: info.response,
            envelope: info.envelope
        });
    } catch (error) {
        console.log(`Error sending verification email to ${email}:`, error);
        console.log("Error details:", {
            message: error.message,
            code: error.code,
            command: error.command,
            stack: error.stack
        });
        throw new Error(`Error sending verification email: ${error}`);
    }
};

//! Function to send verification email link
export const sendVerificationLinkEmail = async (email, verifyLink) => {
    const recipient = [{ email }];
    try {
        const info = await transporter.sendMail({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Xác thực email của bạn",
            html: VERIFICATION_LINK_EMAIL_TEMPLATE.replaceAll("{verifyLink}", verifyLink)
        });

        console.log(`Verification link email sent successfully to ${email}:`, info);
    } catch (error) {
        console.log(`Error sending verification link email:`, error);
        throw new Error(`Error sending verification link email: ${error}`);
    }
};

//! Function to send welcome email
export const sendWelcomeEmail = async (email, userName) => {
    const recipient = [{ email }];
    try {
        const info = await transporter.sendMail({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Chào mừng đến với Penny Milk Tea",
            html: WELCOME_EMAIL_TEMPLATE.replaceAll("{userName}", userName),
        });

        console.log("Welcome email sent successfully", info);
    } catch (error) {
        console.error(`Error sending welcome email`, error);

        throw new Error(`Error sending welcome email: ${error}`);
    }
};

//! Function to send password reset request email
export const sendPasswordResetEmail = async (email, resetURL) => {
    const recipient = [{ email }];

    try {
        const info = await transporter.sendMail({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Đặt lại mật khẩu của bạn",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
        });

        console.log("Password reset email sent successfully", info);
    } catch (error) {
        console.error(`Error sending password reset email`, error);

        throw new Error(`Error sending password reset email: ${error}`);
    }
};

//! Function to send password reset success email
export const sendResetSuccessEmail = async (email) => {
    const recipient = [{ email }];

    try {
        const info = await transporter.sendMail({
            from: `${sender.name} <${sender.email}>`,
            to: email,
            subject: "Penny Milk Tea - Thành công đặt lại mật khẩu",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE,
        });

        console.log("Password reset email sent successfully", info);
    } catch (error) {
        console.error(`Error sending password reset success email`, error);

        throw new Error(`Error sending password reset success email: ${error}`);
    }
};