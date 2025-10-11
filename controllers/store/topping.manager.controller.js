import Store from "../../models/Store.model.js";

//! Lấy danh sách toppings của cửa hàng mình quản lý
export const getMyStoreToppings = async (req, res) => {
    try {
        const managerId = req.user.userId;

        // Lấy tham số phân trang
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy tham số lọc
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // Tìm cửa hàng và populate toppings
        const store = await Store.findOne({ manager: managerId })
            .populate({
                path: 'toppings.toppingId',
                select: 'name extraPrice description status',
                match: status !== "all" ? { status: status } : {},
                ...(search && {
                    match: {
                        ...(status !== "all" ? { status: status } : {}),
                        name: { $regex: search, $options: "i" }
                    }
                })
            })
            .select('storeName storeCode toppings');

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này"
            });
        }

        // Lọc chỉ toppings có storeStatus available
        let availableToppings = store.toppings
            .filter(topping => topping.storeStatus === 'available' && topping.toppingId)
            .map(topping => ({
                _id: topping.toppingId._id,
                name: topping.toppingId.name,
                extraPrice: topping.toppingId.extraPrice,
                description: topping.toppingId.description,
                status: topping.toppingId.status,
                storeStatus: topping.storeStatus,
                addedAt: topping.addedAt
            }));

        // Sắp xếp theo sortBy
        availableToppings.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            // Xử lý trường hợp sortBy là addedAt hoặc lastUpdated
            if (sortBy === 'addedAt' || sortBy === 'lastUpdated') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            if (sortOrder === 1) {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        // Tính toán tổng số sau khi lọc
        const totalToppings = availableToppings.length;

        // Áp dụng pagination trên mảng đã lọc
        const paginatedToppings = availableToppings.slice(skip, skip + limit);

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalToppings / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            success: true,
            message: "Lấy danh sách toppings cửa hàng thành công",
            data: {
                storeInfo: {
                    _id: store._id,
                    storeName: store.storeName,
                    storeCode: store.storeCode
                },
                toppings: paginatedToppings,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalToppings,
                    limit,
                    hasNextPage,
                    hasPrevPage
                },
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy toppings cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy toppings cửa hàng",
            error: error.message
        });
    }
};
