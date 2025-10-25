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
// Primary: Official Nodemailer approach with service: "gmail"
export const transporter = nodemailer.createTransport({
  service: "gmail",  // Let Nodemailer handle optimal Gmail settings
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,  // App Password 16 characters
  },
});

// Backup: Manual configuration function
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
    console.log("🔄 Trying service: 'gmail' approach...");
    return await transporter.sendMail(opts);
  } catch (e) {
    console.log("❌ Service 'gmail' failed:", e.message);
    console.log("🔄 Fallback to manual port 587...");
    try {
      return await makeTransport({ port: 587, secure: false }).sendMail(opts);
    } catch (e2) {
      console.log("❌ Port 587 failed:", e2.message);
      console.log("🔄 Final fallback to port 465...");
      return await makeTransport({ port: 465, secure: true }).sendMail(opts);
    }
  }
}

export const sender = {
	email: process.env.GMAIL_USER,
	name: "Penny Milk Tea",
};
