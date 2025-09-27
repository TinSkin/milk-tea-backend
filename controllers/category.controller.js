import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';

//! Lấy tất cả danh mục (Chỉ Admin)
export const getAllCategories = async (req, res) => {
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

        // Lấy tổng số và danh sách danh mục
        const totalCategories = await Category.countDocuments(filter);
        const categories = await Category.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalCategories / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            success: true,
            categories,
            pagination: {
                currentPage: page,
                totalPages,
                totalCategories,
                limit,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error("Error in getAllCategories:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Tạo mới danh mục
export const createCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;

        // Kiểm tra trường bắt buộc
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        // Kiểm tra danh mục đã tồn tại và đang khả dụng
        const existingCategory = await Category.findOne({
            name: name.trim(),
            status: 'available'
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category with this name already exists and is available"
            });
        }

        // Tạo danh mục mới
        const category = new Category({
            name: name.trim(),
            description: description?.trim() || "",
            status: status || 'available'
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            category
        });
    } catch (error) {
        console.error("Error in createCategory:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Cập nhật danh mục
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Kiểm tra tên đã tồn tại (loại trừ danh mục hiện tại)
        if (name && name.trim() !== category.name) {
            const existingCategory = await Category.findOne({
                name: name.trim(),
                status: 'available',
                _id: { $ne: id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Category with this name already exists"
                });
            }
        }

        // Cập nhật các trường
        if (name) category.name = name.trim();
        if (description !== undefined) category.description = description.trim();
        if (status) category.status = status;

        await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category
        });
    } catch (error) {
        console.error("Error in updateCategory:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Xóa mềm danh mục (chuyển trạng thái)
export const softDeleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Chuyển đổi trạng thái
        category.status = category.status === 'available' ? 'unavailable' : 'available';
        await category.save();

        res.status(200).json({
            success: true,
            message: `Category ${category.status === 'available' ? 'unavailable' : 'available'} successfully`,
            category
        });
    } catch (error) {
        console.error("Error in softDeleteCategory:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Xóa cứng danh mục (Xóa vĩnh viễn)
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        await Category.deleteOne({ _id: id });

        res.status(200).json({
            success: true,
            message: "Category deleted permanently"
        });
    } catch (error) {
        console.error("Error in deleteCategory:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Đồng bộ danh mục với sản phẩm
export const syncCategoriesWithProducts = async (req, res) => {
    try {
        // Lấy tất cả danh mục có status là 'unavailable'
        const unavailableCategories = await Category.find({ status: 'unavailable' }).select('_id');

        // Nếu có danh mục ngừng hoạt động, cập nhật tất cả sản phẩm thuộc các danh mục đó thành 'unavailable'
        if (unavailableCategories.length > 0) {
            const categoryIds = unavailableCategories.map(category => category._id);

            await Product.updateMany(
                { category: { $in: categoryIds }, status: { $ne: 'unavailable' } },
                { $set: { status: 'unavailable' } }
            );
        }

        res.status(200).json({
            success: true,
            message: "Categories synced with products successfully"
        });
    } catch (error) {
        console.error("Error in syncCategoriesWithProducts:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
