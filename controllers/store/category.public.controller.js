import Store from "../../models/Store.model.js";

//! Lấy danh sách categories có sẵn tại cửa hàng cụ thể (cho sidebar filtering)
export const getStoreCategories = async (req, res) => {
    try {
        const { storeId } = req.params;

        if (!storeId) {
            return res.status(400).json({
                success: false,
                message: "Store ID là bắt buộc"
            });
        }

        // Lấy store với categories populated
        const store = await Store.findOne({ _id: storeId, status: 'active' })
            .populate({
                path: 'categories.categoryId',
                select: 'name slug description status'
            })
            .select('storeName categories');

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng hoặc cửa hàng không hoạt động"
            });
        }

        // Lọc categories có storeStatus available và map data
        const availableCategories = store.categories
            .filter(cat => cat.storeStatus === 'available' && cat.categoryId)
            .map(cat => ({
                _id: cat.categoryId._id,
                name: cat.categoryId.name,
                slug: cat.categoryId.slug,
                description: cat.categoryId.description,
                status: cat.categoryId.status, // Admin status
                storeStatus: cat.storeStatus,  // Store-specific status
                addedAt: cat.addedAt
            }));

        res.status(200).json({
            success: true,
            message: "Lấy danh sách danh mục của cửa hàng thành công",
            data: {
                storeId: store._id,
                storeName: store.storeName,
                categories: availableCategories,
                total: availableCategories.length
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh mục của cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh mục của cửa hàng",
            error: error.message
        });
    }
};
