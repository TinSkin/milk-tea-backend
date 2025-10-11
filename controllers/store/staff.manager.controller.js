import Store from "../../models/Store.model.js";
import User from "../../models/User.model.js";

//! Lấy danh sách nhân viên của cửa hàng mình quản lý (chỉ staff và customer)
export const getMyStoreStaff = async (req, res) => {
    try {
        const managerId = req.user.userId;

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

        console.log("Manager ID:", managerId);

        // Tìm cửa hàng trước
        const store = await Store.findOne({ manager: managerId })
            .select('_id storeName storeCode address phone email staff');

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này"
            });
        }

        console.log("Store found:", store.storeName);
        console.log("Store staff IDs:", store.staff);

        // Logic riêng cho staff và customer
        let filter;

        if (role === "staff") {
            // Chỉ lấy staff của cửa hàng này
            filter = {
                _id: { $in: store.staff },
                role: 'staff'
            };
        } else if (role === "customer") {
            // Lấy tất cả customer có assignedStoreId là cửa hàng này
            filter = {
                role: 'customer',
                assignedStoreId: store._id
            };
        } else {
            // Lấy cả staff (trong store.staff) và customer (có assignedStoreId)
            filter = {
                $or: [
                    { _id: { $in: store.staff }, role: 'staff' },
                    { role: 'customer', assignedStoreId: store._id }
                ]
            };
        }

        // Lọc tìm kiếm (theo tên hoặc email)
        if (search) {
            const searchCondition = {
                $or: [
                    { userName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } }
                ]
            };

            // Kết hợp với filter hiện tại
            filter = {
                $and: [filter, searchCondition]
            };
        }

        // Lọc theo trạng thái
        if (status !== "all") {
            const statusCondition = { status: status };
            filter = filter.$and ?
                { $and: [...filter.$and, statusCondition] } :
                { $and: [filter, statusCondition] };
        }

        // Lọc theo trạng thái xác thực
        if (isVerified !== "all") {
            const verifiedCondition = { isVerified: isVerified === "true" };
            filter = filter.$and ?
                { $and: [...filter.$and, verifiedCondition] } :
                { $and: [filter, verifiedCondition] };
        }

        console.log("Final filter:", filter);

        // Lấy tổng số staff để phân trang
        const totalStaff = await User.countDocuments(filter);

        // Tạo đối tượng sắp xếp
        const sort = {};
        sort[sortBy] = sortOrder;

        // Lấy danh sách staff có phân trang
        const staff = await User.find(filter)
            .select('userName email phoneNumber role status assignedStoreId lastLogin isVerified createdAt')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Lấy thông tin manager
        const manager = await User.findById(store.manager)
            .select('userName email phoneNumber role status');

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalStaff / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Thống kê staff trong store này
        const staffStatsAgg = await User.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalStaff: { $sum: 1 },
                    activeStaff: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
                    inactiveStaff: { $sum: { $cond: [{ $eq: ['$isVerified', false] }, 1, 0] } },
                    // Thống kê theo status
                    statusActive: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    statusInactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
                    statusBanned: { $sum: { $cond: [{ $eq: ['$status', 'banned'] }, 1, 0] } },
                    statusSuspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
                    // Thống kê theo role
                    staffCount: { $sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] } },
                    customerCount: { $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] } }
                }
            }
        ]);

        const stats = staffStatsAgg[0] || {
            totalStaff: 0,
            activeStaff: 0,
            inactiveStaff: 0,
            statusActive: 0,
            statusInactive: 0,
            statusBanned: 0,
            statusSuspended: 0,
            staffCount: 0,
            customerCount: 0
        };

        console.log("Final staff count:", staff.length);
        console.log("Total staff:", totalStaff);

        res.status(200).json({
            success: true,
            message: "Lấy danh sách nhân viên cửa hàng thành công",
            data: {
                storeInfo: {
                    _id: store._id,
                    storeName: store.storeName,
                    storeCode: store.storeCode,
                    address: store.address,
                    phone: store.phone,
                    email: store.email
                },
                manager,
                staff,
                stats,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalStaff,
                    limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách nhân viên cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách nhân viên cửa hàng",
            error: error.message
        });
    }
};