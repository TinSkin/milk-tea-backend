import User from "../models/User.model.js";

//! General role checking middleware
export const checkRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // verifyToken middleware should set req.userId
            const userId = req.userId;

            // Get user from database to check role
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            // Check if user's role is in allowed roles
            const userRole = user.role;
            const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (!rolesArray.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required role: ${rolesArray.join(' or ')}. Your role: ${userRole}`
                });
            }

            // Add user info to request for further use
            req.user = {
                userId: user._id,
                role: user.role,
                email: user.email,
                userName: user.userName
            };

            next();
        } catch (error) {
            console.error("Error in checkRole middleware:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    };
};

//! ===== Common use case middlewares =====
export const checkAdminRole = checkRole(['admin']);
export const checkStoreManagerRole = checkRole(['storeManager']);
export const checkStaffRole = checkRole(['staff']);
export const checkCustomerRole = checkRole(['customer']);

//! ===== Business logic middlewares =====
export const checkAdminOrStoreManager = checkRole(['admin', 'storeManager']);
export const checkStaffOrStoreManager = checkRole(['staff', 'storeManager']);
export const checkAllStoreRoles = checkRole(['staff', 'storeManager', 'admin']);