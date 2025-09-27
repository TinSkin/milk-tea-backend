import Cart from '../models/Cart.model.js';

//! Lấy giỏ hàng của người dùng
export const getCart = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;

        // Tìm giỏ hàng active của user
        const cart = await Cart.findOne({
            userId,
            status: 'active'
        })
            .populate('storeId', 'name address')
            .populate('items.productId', 'name price image category')
            .populate('items.toppings.toppingId', 'name price');

        if (!cart) {
            return res.status(200).json({
                success: true,
                cart: {
                    userId,
                    storeId: null,
                    items: [],
                    totalAmount: 0
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: { cart }
        });

    } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error fetching cart",
            error: error.message
        });
    }
};

//! Thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const { productId, quantity, toppings = [], specialNotes = "", storeId } = req.body;

        // Kiểm tra tính hợp lệ của dữ liệu đầu vào
        if (!productId || !storeId) {
            return res.status(400).json({
                success: false,
                message: "ProductId và StoreId là bắt buộc"
            });
        }

        // Tìm giỏ hàng hiện tại của user
        let cart = await Cart.findOne({ userId, storeId, status: 'active' });

        if (!cart) {
            // Tạo cart mới nếu chưa có
            cart = new Cart({
                userId,
                storeId,
                items: []
            });
        } else {
            // Kiểm tra storeId có khớp không (1 cart chỉ cho 1 store)
            if (cart.storeId.toString() !== storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Không thể thêm sản phẩm từ cửa hàng khác vào giỏ hàng"
                });
            }
        }

        // Kiểm tra xem item đã có trong cart chưa (cùng product và toppings)
        const existingItemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId &&
            JSON.stringify(item.toppings) === JSON.stringify(toppings)
        );

        if (existingItemIndex > -1) {
            // Nếu đã có thì cộng thêm quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Nếu chưa có thì thêm item mới
            cart.items.push({
                productId,
                quantity,
                toppings,
                specialNotes
            });
        }

        await cart.save();

        // Populate để trả về thông tin đầy đủ
        await cart.populate('items.productId', 'name price')
            .populate('items.toppings.toppingId', 'name price');

        res.status(200).json({
            success: true,
            data: { cart },
            message: "Đã thêm sản phẩm vào giỏ hàng"
        });

    } catch (error) {
        console.error("Lỗi thêm sản phẩm vào giỏ hàng:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error adding to cart",
            error: error.message
        });
    }
}