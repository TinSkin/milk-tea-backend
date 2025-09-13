import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

//! Middleware verifyToken to verify user based on JWT
export const verifyToken = (req, res, next) => {
    // Using token from cookie of request
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null;

    // Using token from cookie of request
    const token = req.cookies?.token || headerToken;

    // If there's no token in cookie will return 401 error ( Unauthorized Error )
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized !!!" });

    try {
        // Handle verify token by secret key ( JWT_TOKEN )
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // If token is not valid or can't handled will return 401 error ( Unauthorized Error )
        if (!decoded) return res.status(401).json({ success: false, message: "Unauthorized !!!" });

        // Save userId from token to request for middleware/route further use
        req.userId = decoded.id || decoded._id || decoded.userId;

        // Permit request to go to next middleware/route
        next();
    } catch (error) {

        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }
        console.error("Error verifying token:", error);

        //! If there's an error in verifying process will return 500 error ( Bad Server Error)
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