// Vercel: đảm bảo không chạy trên Edge Runtime
export const runtime = 'nodejs';

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Debug environment variables
console.log("Gmail Configuration:");
console.log("GMAIL_USER:", process.env.GMAIL_USER ? "Set" : "Missing");
console.log("GMAIL_APP_PASS:", process.env.GMAIL_APP_PASS ? "Set" : "Missing");

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
	console.error("⚠️ Warning: Gmail credentials are missing!");
	console.error("Make sure GMAIL_USER and GMAIL_APP_PASS are set in environment variables");
}

// ChatGPT's recommended configuration
export const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 587,              // STARTTLS port
	secure: false,          // false for STARTTLS
	auth: {
		user: process.env.GMAIL_USER,      // yourgmail@gmail.com
		pass: process.env.GMAIL_PASS,  // App Password 16 ký tự
	},
	requireTLS: true,       // ép STARTTLS khi 587
});

export const sender = {
	email: process.env.GMAIL_USER,
	name: "Penny Milk Tea",
};
