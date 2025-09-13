import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';

//! Get all categories (Admin only)
export const getAllCategories = async (req, res) => {
    try {
        // Extract pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Extract filter parameters
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // Build filter object
        let filter = {};

        // Search filter (name)
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        // Status filter
        if (status !== "all") {
            filter.status = status;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder;

        // Get total count and categories
        const totalCategories = await Category.countDocuments(filter);
        const categories = await Category.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
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

//! Create category
export const createCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        // Check if category already exists and is available
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

        // Create new category
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

//! Update category
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

        // Check if name already exists (exclude current category)
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

        // Update fields
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

//! Soft delete category (toggle status)
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

        // Toggle status
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

//! Hard delete category (Xóa vĩnh viễn)
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

//! Sync categories with products
export const syncCategoriesWithProducts = async (req, res) => {
    try {
        // Lấy tất cả category có status là 'unavailable'
        const unavailableCategories = await Category.find({ status: 'unavailable' }).select('_id');

        // Nếu có category ngừng hoạt động, cập nhật tất cả sản phẩm thuộc các category đó thành 'unavailable'
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