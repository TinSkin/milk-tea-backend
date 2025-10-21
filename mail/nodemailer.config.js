import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Debug environment variables
console.log("📧 Email Configuration:");
console.log("   GMAIL_USER:", process.env.GMAIL_USER ? "Set" : "Missing");
console.log("   GMAIL_PASS:", process.env.GMAIL_PASS ? "Set" : "Missing");

if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error(" Warning: Gmail credentials are missing!");
    console.error("   Make sure GMAIL_USER and GMAIL_PASS are set in environment variables");
}

export const transporter = nodemailer.createTransporter({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS,
	},
});

export const sender = {
	email: process.env.GMAIL_USER,
	name: "Admin",
};

// Test transporter connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("Gmail transporter verification failed:", error);
    } else {
        console.log("Gmail transporter verified successfully");
    }
});
