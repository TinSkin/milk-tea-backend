import User from "../models/User.model.js";

//! Middleware checks if user is admin
export const checkAdminRole = async (req, res, next) => {
    try {
        // verifyToken middleware should set req.userId
        const userId = req.userId;

        // Get user from database to check role
        const user = await User.findById(userId);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin role required."
            });
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};