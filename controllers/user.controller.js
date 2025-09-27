import User from "../models/User.model.js";

//! Lấy tất cả người dùng (Chỉ Admin)
export const getAllUsers = async (req, res) => {
    try {
        // Lấy tham số phân trang từ query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy tham số lọc
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const role = req.query.role || "all";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
        const isVerified = req.query.isVerified || "all";

        // Đối tượng filter
        let filter = {};

        // Lọc tìm kiếm (theo tên hoặc email)
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        // Lọc theo trạng thái
        if (status !== "all") {
            filter.status = status;
        }

        // Lọc theo vai trò
        if (role !== "all") {
            filter.role = role;
        }

        // Lọc theo trạng thái xác thực
        if (isVerified !== "all") {
            filter.isVerified = isVerified;
        }

        // Lấy tổng số người dùng để phân trang
        const totalUsers = await User.countDocuments(filter);

        // Tạo đối tượng sắp xếp
        const sort = {};
        sort[sortBy] = sortOrder;

        // Lấy danh sách người dùng có phân trang
        const users = await User.find(filter)
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Tính toán thông tin phân trang
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
            message: "Lỗi server"
        });
    }
};

//! Lấy thông tin hồ sơ người dùng
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
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
            message: "Lỗi server"
        });
    }
};

//! Cập nhật hồ sơ người dùng
export const updateUserProfile = async (req, res) => {
    try {
        const { userName, phoneNumber } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        // Cập nhật các trường của người dùng
        if (userName) user.userName = userName;
        if (phoneNumber) user.phoneNumber = phoneNumber;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Cập nhật hồ sơ thành công",
            user: {
                ...user._doc,
                password: undefined
            }
        });
    } catch (error) {
        console.error("Error in updateUserProfile:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

//! Cập nhật vai trò người dùng (Chỉ Admin)
export const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin', 'manager'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Vai trò không hợp lệ"
            });
        }

        // Không cho phép admin thay đổi vai trò của chính mình
        if (userId === req.userId) {
            return res.status(400).json({
                success: false,
                message: "Không thể thay đổi vai trò của chính bạn"
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
                message: "Không tìm thấy người dùng"
            });
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật vai trò thành công",
            user
        });
    } catch (error) {
        console.error("Error in updateUserRole:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

//! Xóa mềm người dùng (Chỉ Admin)
export const softDeleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Không cho phép admin tự xóa mềm chính mình
        if (userId === req.userId) {
            return res.status(400).json({
                success: false,
                message: "Không thể vô hiệu hóa tài khoản của chính bạn"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        // Chuyển đổi trạng thái giữa hoạt động và không hoạt động
        const newStatus = user.status === 'active' ? 'inactive' : 'active';

        user.status = newStatus;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Người dùng đã được ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} thành công`,
            user: {
                ...user._doc,
                password: undefined
            }
        });
    } catch (error) {
        console.error("Error in softDeleteUser:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};