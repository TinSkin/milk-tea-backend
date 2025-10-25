import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Debug environment variables
console.log("SendGrid Configuration:");
console.log("SENDGRID_API_KEY:", process.env.SENDGRID_API_KEY ? "Set" : "Missing");

if (!process.env.SENDGRID_API_KEY) {
    console.error("⚠️ Warning: SENDGRID_API_KEY is missing!");
    console.error("Please set SENDGRID_API_KEY in environment variables");
} else {
    // Set API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log("✅ SendGrid API key configured successfully");
}

export const SENDER_EMAIL = "nguyennhatleha@gmail.com"; // Must match verified sender
export const SENDER_NAME = "Penny Milk Tea";

export default sgMail;
