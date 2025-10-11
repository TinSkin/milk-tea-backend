import Store from "../../models/Store.model.js";

//! Lấy danh sách categories của cửa hàng do manager quản lý
export const getMyStoreCategories = async (req, res) => {
    try {
        const managerId = req.user.userId;

        // Phân trang
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Lọc & sắp xếp
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const sortBy = req.query.sortBy || "addedAt"; // addedAt | lastUpdated | name ...
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // Tìm cửa hàng và populate categories theo filter
        const store = await Store.findOne({ manager: managerId })
            .populate({
                path: "categories.categoryId",
                select: "name slug description status",
                match: status !== "all" ? { status: status } : {},
                ...(search && {
                    match: {
                        ...(status !== "all" ? { status: status } : {}),
                        name: { $regex: search, $options: "i" },
                    },
                }),
            })
            .select("storeName storeCode categories");

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này",
            });
        }

        // Lọc category ở trạng thái storeStatus 'available' + categoryId đã match populate
        let availableCategories = (store.categories || [])
            .filter((cat) => cat.storeStatus === "available" && cat.categoryId)
            .map((cat) => ({
                _id: cat.categoryId._id,
                name: cat.categoryId.name,
                slug: cat.categoryId.slug,
                description: cat.categoryId.description,
                status: cat.categoryId.status,     // status của chính Category (global)
                storeStatus: cat.storeStatus,      // status trong phạm vi Store
                addedAt: cat.addedAt,
                lastUpdated: cat.lastUpdated,
            }));

        // Sort theo sortBy/sortOrder
        availableCategories.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === "addedAt" || sortBy === "lastUpdated") {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            return sortOrder === 1 ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
        });

        // Tổng sau khi lọc
        const totalCategories = availableCategories.length;

        // Áp dụng pagination
        const paginatedCategories = availableCategories.slice(skip, skip + limit);

        // Tính thông tin phân trang
        const totalPages = Math.ceil(totalCategories / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách categories cửa hàng thành công",
            data: {
                storeInfo: {
                    _id: store._id,
                    storeName: store.storeName,
                    storeCode: store.storeCode,
                },
                categories: paginatedCategories,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCategories,
                    limit,
                    hasNextPage,
                    hasPrevPage,
                },
            },
        });
    } catch (error) {
        console.error("Lỗi khi lấy categories cửa hàng:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy categories cửa hàng",
            error: error.message,
        });
    }
};
