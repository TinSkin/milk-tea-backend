// Vercel: đảm bảo không chạy trên Edge Runtime
export const runtime = 'nodejs';

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Debug environment variables
console.log("Gmail Configuration:");
console.log("GMAIL_USER:", process.env.GMAIL_USER ? "Set" : "Missing");
console.log("GMAIL_PASS:", process.env.GMAIL_PASS ? "Set" : "Missing");

if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
	console.error("⚠️ Warning: Gmail credentials are missing!");
	console.error("Make sure GMAIL_USER and GMAIL_PASS are set in environment variables");
}

// ChatGPT's advanced configuration with fallback strategy
function makeTransport({ port, secure }) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,                // 587 hoặc 465
    secure,              // 587 => false, 465 => true
    auth: { 
      user: process.env.GMAIL_USER, 
      pass: process.env.GMAIL_PASS 
    }, // App Password 16 ký tự
    requireTLS: !secure, // chỉ true với 587
    family: 4,           // ép IPv4 tránh treo IPv6
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

export async function sendMail(opts) {
  try {
    console.log("🔄 Trying port 587 (STARTTLS)...");
    return await makeTransport({ port: 587, secure: false }).sendMail(opts);
  } catch (e) {
    console.log("❌ Port 587 failed:", e.message);
    if (e?.code === "ETIMEDOUT" || e?.command === "CONN" || e?.code === "ECONNRESET") {
      console.log("🔄 Fallback to port 465 (SSL)...");
      // fallback TLS 465
      return await makeTransport({ port: 465, secure: true }).sendMail(opts);
    }
    throw e;
  }
}

export const sender = {
	email: process.env.GMAIL_USER,
	name: "Penny Milk Tea",
};
