import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

//! Middleware verifyToken to verify user based on JWT
export const verifyToken = async (req, res, next) => {
    try {
        const headerToken = req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.slice(7)
            : null;

        const token = req.cookies?.token || headerToken;

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized !!!" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ success: false, message: "Unauthorized !!!" });
        }

        // Lấy user từ DB
        const user = await User.findById(decoded.id).select("role storeId name email assignedStoreId").lean();
        if (!user) {
            return res.status(401).json({ success: false, message: "User không tồn tại" });
        }

        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        console.error("verifyToken error:", error);
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

//! Middleware to verify if user's email is verified
export const verifyEmail = async (req, res, next) => {
    try {
        const userId = req.userId || req.user?.id;

        // If userId is not present, return 401 Unauthorized
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Find user by ID and check if email is verified
        const user = await User.findById(userId).select("_id isVerified").lean();
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // If email is not verified, return 403 Forbidden
        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: "Email not verified" });
        }

        next();
    } catch (err) {
        console.error("verifyEmail error:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};