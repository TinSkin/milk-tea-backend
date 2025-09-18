import mongoose from "mongoose";
import Order from "../models/Order.model.js";
import Product from "../models/Product.js";

const computeTotal = (products = []) => {
    return products.reduce((sum, p) => {
        const qty = Number(p.quantity) || 0;
        const price = Number(p.price) || 0;
        return sum + qty * price;
    }, 0);
};

//! Create new order
export const createOrder = async (req, res) => {
    const userId = req.user._id;

    // Validate userId
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "Thiếu hoặc sai user id" });
    }

    const {
        products = [],
        address,
        phone,
        note,
        paymentMethod = "cash",
        totalPrice,
    } = req.body;

    // Validate product list, address, and phone
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "Giỏ hàng trống" });
    }
    if (!address || !phone) {
        return res.status(400).json({ message: "Thiếu địa chỉ hoặc số điện thoại" });
    }

    // Validate each product item
    for (const item of products) {
        if (!item.product || !mongoose.isValidObjectId(item.product)) {
            return res.status(400).json({ message: "product id không hợp lệ" });
        }
        if (typeof item.quantity !== "number" || item.quantity <= 0) {
            return res.status(400).json({ message: "quantity phải > 0" });
        }
        if (typeof item.price !== "number" || item.price < 0) {
            return res.status(400).json({ message: "price không hợp lệ" });
        }
    }

    const order = await Order.create({
        user: userId,
        products,
        totalPrice,
        address,
        phone,
        note,
        paymentMethod,
    });

    const populated = await order.populate([
        { path: "user", select: "name email" },
        { path: "products.product", select: "name images" },
    ]);

    return res.status(201).json({
        message: "Tạo đơn thành công",
        data: populated
    });
}