import User from "../models/User.model.js";

//! Get all users (Admin only)
export const getAllUsers = async (req, res) => {
    try {
        // Extract pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Extract filter parameters
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const role = req.query.role || "all";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
        const isVerified = req.query.isVerified || "all";

        // Filter object
        let filter = {};

        // Search filter (name or email)
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        // Status filter
        if (status !== "all") {
            filter.status = status;
        }

        // Role filter
        if (role !== "all") {
            filter.role = role;
        }

        // Verified filter
        if (isVerified !== "all") {
            filter.isVerified = isVerified;
        }

        // Get total count for pagination
        const totalUsers = await User.countDocuments(filter);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder;

        // Get paginated users
        const users = await User.find(filter)
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
        const totalPages = Math.ceil(totalUsers / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Tổng số khách hàng + thống kê hoạt động
        const overallStatsAgg = await User.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 },
                    activeCustomers: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
                    inactiveCustomers: { $sum: { $cond: [{ $eq: ['$isVerified', false] }, 1, 0] } }
                }
            }
        ]);
        const stats = overallStatsAgg[0] || { totalCustomers: 0, activeCustomers: 0, inactiveCustomers: 0 };

        res.status(200).json({
            success: true,
            users,
            stats,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers,
                limit,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Update user profile
export const updateUserProfile = async (req, res) => {
    try {
        const { userName, phoneNumber } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Update user fields
        if (userName) user.userName = userName;
        if (phoneNumber) user.phoneNumber = phoneNumber;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                ...user._doc,
                password: undefined
            }
        });
    } catch (error) {
        console.error("Error in updateUserProfile:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Update user role (Admin only)
export const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin', 'manager'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
            });
        }

        // Don't allow admin to change their own role
        if (userId === req.userId) {
            return res.status(400).json({
                success: false,
                message: "Cannot change your own role"
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User role updated successfully",
            user
        });
    } catch (error) {
        console.error("Error in updateUserRole:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Soft delete user (Admin only)
export const softDeleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Don't allow admin to soft delete themselves
        if (userId === req.userId) {
            return res.status(400).json({
                success: false,
                message: "Cannot deactivate your own account"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Toggle status between active and inactive
        const newStatus = user.status === 'active' ? 'inactive' : 'active';

        user.status = newStatus;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
            user: {
                ...user._doc,
                password: undefined
            }
        });
    } catch (error) {
        console.error("Error in softDeleteUser:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};