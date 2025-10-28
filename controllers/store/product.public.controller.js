import Store from "../../models/Store.model.js";
import Product from "../../models/Product.model.js";

//! Lấy danh sách sản phẩm của cửa hàng (dành cho user)
export const getStoreProducts = async (req, res) => {
    try {
        const { storeId } = req.params;

        // Lấy tham số phân trang
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;

        // Lấy tham số lọc và sắp xếp
        const search = req.query.search || '';
        const category = req.query.category || 'all';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        if (!storeId) {
            return res.status(400).json({
                success: false,
                message: "Store ID là bắt buộc"
            });
        }

        // Kiểm tra store có tồn tại và đang hoạt động không
        const store = await Store.findOne({ _id: storeId, status: 'active' })
            .select('storeName storeCode address products');

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng hoặc cửa hàng không hoạt động"
            });
        }

        console.log(" Store found:", store.storeName);
        console.log(" Store products count:", store.products.length);
        console.log(" Store products structure:", store.products[0]);

        // Lấy danh sách productId từ store.products và chỉ những sản phẩm có storeStatus available
        const availableStoreProducts = store.products.filter(p => p.storeStatus === 'available');
        const productIds = availableStoreProducts.map(p => p.productId);

        console.log(" Available store products:", availableStoreProducts.length);
        console.log(" Product IDs to query:", productIds);

        // Tạo điều kiện lọc cho sản phẩm
        let filter = {};

        // Chỉ lấy sản phẩm thuộc cửa hàng này, có trạng thái available trong Product model VÀ có storeStatus available
        filter._id = { $in: productIds };
        filter.status = 'available'; // Status gốc từ Product model

        // Tìm kiếm theo tên hoặc mô tả
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Lọc theo danh mục
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Tạo đối tượng sắp xếp
        const sort = {};
        sort[sortBy] = sortOrder;

        console.log(" Filter used for products:", filter);

        // Đếm tổng số sản phẩm và lấy danh sách sản phẩm với phân trang
        const totalProducts = await Product.countDocuments(filter);
        console.log(" Total products found:", totalProducts);

        const products = await Product.find(filter)
            .populate('category', 'name slug')
            .populate('toppings', 'name extraPrice')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('name price category images description status sizeOptions toppings createdAt');

        console.log(" Products returned:", products.length);
        console.log(" First product:", products[0]?.name || "No products");

        // Kết hợp thông tin Product với thông tin Store-specific
        const productsWithStoreInfo = products.map(product => {
            const storeProduct = store.products.find(sp => sp.productId.toString() === product._id.toString());
            return {
                ...product.toObject(),
                // Thông tin riêng của store
                storeInfo: {
                    storeStatus: storeProduct?.storeStatus || 'available',
                    stockQuantity: storeProduct?.stockQuantity || 0,
                    customPrice: storeProduct?.customPrice || null,
                    storeNotes: storeProduct?.storeNotes || null,
                    addedAt: storeProduct?.addedAt,
                    lastUpdated: storeProduct?.lastUpdated
                }
            };
        });

        console.log(" Products with store info:", productsWithStoreInfo.length);

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalProducts / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Trả về kết quả với thông tin phân trang
        res.status(200).json({
            success: true,
            message: "Lấy danh sách sản phẩm của cửa hàng thành công",
            data: {
                store: {
                    _id: store._id,
                    storeName: store.storeName,
                    storeCode: store.storeCode,
                    address: store.address
                },
                products: productsWithStoreInfo,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalProducts,
                    limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm của cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy sản phẩm của cửa hàng",
            error: error.message
        });
    }
};
