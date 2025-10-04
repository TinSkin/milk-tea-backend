import Topping from '../models/Topping.model.js';

//! Lấy tất cả topping (Chỉ Admin)
export const getAllToppings = async (req, res) => {
    try {
        // Lấy tham số phân trang
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy tham số lọc
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // Tạo đối tượng filter
        let filter = {};

        // Lọc tìm kiếm (theo tên)
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        // Lọc theo trạng thái
        if (status !== "all") {
            filter.status = status;
        }

        // Tạo đối tượng sắp xếp
        const sort = {};
        sort[sortBy] = sortOrder;

        // Lấy tổng số và danh sách topping
        const totalToppings = await Topping.countDocuments(filter);
        const toppings = await Topping.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalToppings / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            success: true,
            toppings,
            pagination: {
                currentPage: page,
                totalPages,
                totalToppings,
                limit,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error("Error in getAllToppings:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Tạo mới topping
export const createTopping = async (req, res) => {
    try {
        const { name, extraPrice, description, status } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!name || extraPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Name and extra price are required"
            });
        }

        // Kiểm tra topping đã tồn tại và đang khả dụng
        const existingTopping = await Topping.findOne({
            name: name.trim(),
            status: 'available'
        });

        if (existingTopping) {
            return res.status(400).json({
                success: false,
                message: "Topping with this name already exists and is available"
            });
        }

        // Tạo topping mới
        const topping = new Topping({
            name: name.trim(),
            extraPrice: parseFloat(extraPrice),
            description: description?.trim() || "",
            status: status || 'available'
        });

        await topping.save();

        res.status(201).json({
            success: true,
            message: "Topping created successfully",
            topping
        });
    } catch (error) {
        console.error("=== CREATE TOPPING ERROR ===");
        console.error("Error:", error);
        console.error("Stack:", error.stack);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Cập nhật topping
export const updateTopping = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, extraPrice, description, status } = req.body;

        const topping = await Topping.findById(id);

        if (!topping) {
            return res.status(404).json({
                success: false,
                message: "Topping not found"
            });
        }

        // Kiểm tra tên đã tồn tại (loại trừ topping hiện tại)
        if (name && name.trim() !== topping.name) {
            const existingTopping = await Topping.findOne({
                name: name.trim(),
                status: 'available',
                _id: { $ne: id }
            });

            if (existingTopping) {
                return res.status(400).json({
                    success: false,
                    message: "Topping with this name already exists"
                });
            }
        }

        // Cập nhật các trường
        if (name) topping.name = name.trim();
        if (extraPrice !== undefined) topping.extraPrice = parseFloat(extraPrice);
        if (description !== undefined) topping.description = description.trim();
        if (status) topping.status = status;

        await topping.save();

        res.status(200).json({
            success: true,
            message: "Topping updated successfully",
            topping
        });
    } catch (error) {
        console.error("Error in updateTopping:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Xóa mềm topping (chuyển trạng thái)
export const softDeleteTopping = async (req, res) => {
    try {
        const { id } = req.params;

        const topping = await Topping.findById(id);

        if (!topping) {
            return res.status(404).json({
                success: false,
                message: "Topping not found"
            });
        }

        // Chuyển đổi trạng thái
        topping.status = topping.status === 'available' ? 'unavailable' : 'available';
        await topping.save();

        res.status(200).json({
            success: true,
            message: `Topping ${topping.status === 'available' ? 'activated' : 'deactivated'} successfully`,
            topping
        });
    } catch (error) {
        console.error("Error in softDeleteTopping:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Xóa vĩnh viễn topping (hard delete)
export const deleteTopping = async (req, res) => {
    try {
        const { id } = req.params;

        const topping = await Topping.findById(id);

        if (!topping) {
            return res.status(404).json({
                success: false,
                message: "Topping not found"
            });
        }

        // Xóa vĩnh viễn khỏi database
        await Topping.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Topping deleted permanently",
            deletedTopping: topping
        });
    } catch (error) {
        console.error("Error in deleteTopping:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
