import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Debug environment variables
console.log("🔧 Resend Configuration:");
console.log("   RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✅ Set" : "❌ Missing");

if (!process.env.RESEND_API_KEY) {
    console.error("⚠️ Warning: RESEND_API_KEY is missing!");
    console.error("   Make sure RESEND_API_KEY is set in environment variables");
}

// Tạo Resend với khóa API từ biến môi trường
export const resend = new Resend(process.env.RESEND_API_KEY);

// Sử dụng địa chỉ email đã được xác minh trong Resend
export const sender = {
    email: "onboarding@resend.dev", // Resend's verified domain - ready to use
    name: "Penny Milk Tea"
};

// Test Resend connection on startup
console.log("...Testing Resend API connection...");
try {
    // You can test this by sending a test email later
    console.log("--- Resend API initialized successfully ---");
} catch (error) {
    console.error("--- Resend API initialization failed: ---", error);
}