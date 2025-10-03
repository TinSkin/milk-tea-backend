// import mongoose from "mongoose";
// import Order from "../models/Order.model.js";
// import Product from "../models/Product.js";
// import Payment from '../models/payment.model.js';

// const computeTotal = (products = []) => {
//     return products.reduce((sum, p) => {
//         const qty = Number(p.quantity) || 0;
//         const price = Number(p.price) || 0;
//         return sum + qty * price;
//     }, 0);
// };

// //! Create new order
// export const createOrder = async (req, res) => {
//     const userId = req.user._id;

//     // Validate userId
//     if (!userId || !mongoose.isValidObjectId(userId)) {
//         return res.status(400).json({ message: "Thiếu hoặc sai user id" });
//     }

//     const {
//         products = [],
//         address,
//         phone,
//         note,
//         paymentMethod = "cash",
//         totalPrice,
//     } = req.body;

//     // Validate product list, address, and phone
//     if (!Array.isArray(products) || products.length === 0) {
//         return res.status(400).json({ message: "Giỏ hàng trống" });
//     }
//     if (!address || !phone) {
//         return res.status(400).json({ message: "Thiếu địa chỉ hoặc số điện thoại" });
//     }

//     // Validate each product item
//     for (const item of products) {
//         if (!item.product || !mongoose.isValidObjectId(item.product)) {
//             return res.status(400).json({ message: "product id không hợp lệ" });
//         }
//         if (typeof item.quantity !== "number" || item.quantity <= 0) {
//             return res.status(400).json({ message: "quantity phải > 0" });
//         }
//         if (typeof item.price !== "number" || item.price < 0) {
//             return res.status(400).json({ message: "price không hợp lệ" });
//         }
//     }

//     const order = await Order.create({
//         user: userId,
//         products,
//         totalPrice,
//         address,
//         phone,
//         note,
//         paymentMethod,
//     });

//     const populated = await order.populate([
//         { path: "user", select: "name email" },
//         { path: "products.product", select: "name images" },
//     ]);

//     return res.status(201).json({
//         message: "Tạo đơn thành công",
//         data: populated
//     });
// }

import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Payment from "../models/payment.model.js";
import Topping from "../models/Topping.model.js";

const VALID_STATUSES = [
  "finding_driver",
  "picking_up",
  "delivering",
  "delivered",
  "cancelled",
];
const VALID_PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

// Helper function để xử lý đường dẫn hình ảnh
const processImagePath = (imagePath) => {
  if (!imagePath) return "/placeholder-product.jpg";

  // Chuyển backslash thành forward slash
  let processedPath = imagePath.replace(/\\/g, "/");

  // Đảm bảo có '/' ở đầu nếu chưa có
  if (!processedPath.startsWith("/") && !processedPath.startsWith("http")) {
    processedPath = "/" + processedPath;
  }

  return processedPath;
};

// ============================
// Tạo đơn hàng mới
// ============================
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const {
      items,
      shippingAddress,
      paymentMethod,
      shippingFee = 0,
      discountAmount = 0,
      notes = "",
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao hàng",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn phương thức thanh toán",
      });
    }

    // Xử lý danh sách sản phẩm và tính tổng tiền
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm ${item.productId}`,
        });
      }

      // Kiểm tra size hợp lệ và lấy giá theo size
      const sizeOption = product.sizeOptions.find(
        (opt) => opt.size === item.size
      );
      if (!sizeOption) {
        return res.status(400).json({
          success: false,
          message: `Size ${item.size} không hợp lệ cho sản phẩm ${product.name}`,
        });
      }

      let itemPrice = sizeOption.price;

      // Lấy topping chi tiết từ DB
      let toppings = [];
      let toppingTotalPrice = 0;

      if (item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0) {
        toppings = await Topping.find({
          _id: { $in: item.toppings },
          status: "available",
        });

        // Tính tổng giá topping
        toppingTotalPrice = toppings.reduce((sum, t) => sum + t.extraPrice, 0);
      }

      itemPrice += toppingTotalPrice;

      // Chuẩn hóa mảng topping để lưu vào orderItem
      const orderToppings = toppings.map((t) => ({
        _id: t._id,
        name: t.name,
        extraPrice: t.extraPrice,
      }));

      orderItems.push({
        productId: product._id,
        productName: product.name,
        price: itemPrice,
        quantity: item.quantity,
        size: item.size,
        toppings: orderToppings,
        image: product.images[0] || item.image,
        subtotal: itemPrice * item.quantity,
      });

      totalAmount += itemPrice * item.quantity;
    }

    const finalAmount = totalAmount + shippingFee - discountAmount;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = new Order({
      orderNumber,
      customerId: userId,
      customerInfo: {
        name: req.user?.name || shippingAddress.fullName,
        email: req.user?.email,
      },
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "processing",
      totalAmount,
      shippingFee,
      discountAmount,
      finalAmount,
      notes,
      status: "finding_driver",
      statusHistory: [
        {
          status: "finding_driver",
          timestamp: new Date(),
          note: "Đơn hàng được tạo",
          updatedBy: userId,
        },
      ],
    });

    await order.save();

    const payment = new Payment({
      orderId: order._id,
      userId,
      amount: finalAmount,
      currency: "VND",
      paymentMethod: paymentMethod || "cod",
      transactionId: Payment.generateTransactionId(),
      status: paymentMethod === "cod" ? "pending" : "processing",
      description: `Thanh toán cho đơn hàng ${orderNumber}`,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    await payment.save();

    // Xử lý thanh toán cho các phương thức không phải COD
    if (paymentMethod !== "cod") {
      setTimeout(async () => {
        try {
          const isSuccess = Math.random() > 0.1;
          if (isSuccess) {
            payment.status = "paid";
            payment.processedAt = new Date();
            order.paymentStatus = "paid";
          } else {
            payment.status = "failed";
            payment.failureReason = "Không đủ số dư";
            order.paymentStatus = "failed";
          }

          await payment.save();
          await order.save();
        } catch (error) {
          console.error("Lỗi khi xử lý thanh toán:", error);
        }
      }, 3000);
    }

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      order,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Lỗi tạo đơn hàng:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tạo đơn hàng",
      error: error.message,
    });
  }
};

// ============================
// Lấy danh sách đơn hàng (Admin)
// ============================
export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "",
      paymentStatus = "",
      search = "",
      sortBy = "newest",
      startDate = "",
      endDate = "",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (status && status !== "all") filter.status = status;
    if (paymentStatus && paymentStatus !== "all") filter.paymentStatus = paymentStatus;

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customerInfo.name": { $regex: search, $options: "i" } },
        { "customerInfo.email": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let sort = {};
    switch (sortBy) {
      case "oldest":
        sort.createdAt = 1;
        break;
      case "amount_asc":
        sort.finalAmount = 1;
        break;
      case "amount_desc":
        sort.finalAmount = -1;
        break;
      case "newest":
      default:
        sort.createdAt = -1;
        break;
    }

    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate("customerId", "name email")
      .populate("items.productId", "name images status");

    const processedOrders = orders.map((order) => ({
      ...order.toObject(),
      items: order.items.map((item) => ({
        ...item,
        image: processImagePath(item.productId?.images?.[0] || item.image),
      })),
    }));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);

    res.json({
      orders: processedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng: " + error.message });
  }
};


// Lấy chi tiết đơn hàng
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("items.productId", "name images status")
      .populate("statusHistory.updatedBy", "name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Xử lý hình ảnh cho order detail
    const processedOrder = {
      ...order.toObject(),
      items: order.items.map((item) => ({
        ...item,
        image: processImagePath(item.productId?.image || item.image),
      })),
    };

    res.json(processedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật trạng thái đơn hàng (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = [
      "finding_driver",
      "picking_up",
      "delivering",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Cập nhật trạng thái đơn hàng
    order.status = status;

    // Cập nhật trạng thái thanh toán dựa trên trạng thái đơn hàng
    if (status === "delivered") {
      order.paymentStatus = "paid";

      // Cập nhật thông tin thanh toán
      const payment = await Payment.findOne({ orderId: order._id });
      if (payment && payment.paymentMethod === "cod") {
        payment.status = "paid";
        payment.processedAt = new Date();
        await payment.save();
      }
    } else if (status === "cancelled") {
      // Cập nhật thông tin thanh toán
      const payment = await Payment.findOne({ orderId: order._id });
      if (payment && payment.status === "pending") {
        payment.status = "failed";
        payment.failureReason = "Order cancelled";
        await payment.save();
      }
    }

    await order.save();

    res.json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái đơn hàng",
      error: error.message,
    });
  }
};

// Cập nhật trạng thái thanh toán (Admin only)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, note = "" } = req.body;
    const orderId = req.params.id;

    if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.paymentStatus = paymentStatus;
    order.statusHistory.push({
      status: `payment_${paymentStatus}`,
      timestamp: new Date(),
      note: note || `Payment status changed to ${paymentStatus}`,
      updatedBy: req.userId,
    });

    await order.save();

    res.json({
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy đơn hàng của customer (User only) - Phiên bản đã cập nhật hoàn toàn
export const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.userId;
    const { page = 1, limit = 10, status = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter = { customerId };
    if (status && status !== "all") {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: "items.productId",
        select: "name images",
        match: { _id: { $exists: true } },
      })
      .lean();

    // Xử lý các mục không có productId hợp lệ và chuẩn hóa đường dẫn hình ảnh
    const sanitizedOrders = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => {
        // Xử lý hình ảnh từ nhiều nguồn với thứ tự ưu tiên
        let finalImage = "/placeholder-product.jpg";

        // Ưu tiên hình ảnh từ populate (productId) - nếu sản phẩm vẫn tồn tại
        if (item.productId?.image) {
          finalImage = processImagePath(item.productId.image);
        }
        // Sau đó từ item.image (được lưu khi tạo order)
        else if (item.image) {
          finalImage = processImagePath(item.image);
        }

        // Tên sản phẩm với thứ tự ưu tiên tương tự
        const name =
          item.productId?.name || item.name || "Sản phẩm không xác định";

        return {
          ...item,
          // Cập nhật image path đã xử lý
          image: finalImage,
          // Thông tin sản phẩm để tương thích với frontend
          product: {
            productName: name,
            image: finalImage,
          },
          // Đảm bảo có nameở level item
          productName: name,
        };
      }),
    }));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);

    // Log để debug
    console.log(
      `Returning ${sanitizedOrders.length} orders for customer ${customerId}`
    );
    if (sanitizedOrders.length > 0) {
      console.log(
        "Sample order item image paths:",
        sanitizedOrders[0].items.map((item) => ({
          productName: item.productName,
          image: item.image,
          hasProductId: !!item.productId,
        }))
      );
    }

    res.json({
      orders: sanitizedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Hủy đơn hàng (Customer only, chỉ khi pending)
export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const customerId = req.userId;
    const { reason = "" } = req.body;

    const order = await Order.findOne({ _id: orderId, customerId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "finding_driver") {
      return res
        .status(400)
        .json({ message: "Can only cancel pending orders" });
    }

    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      timestamp: new Date(),
      note: reason || "Cancelled by customer",
    });

    await order.save();

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order statistics (Admin only)
export const getOrderStats = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate },
    });
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]);

    res.json({
      period: `${period} days`,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusBreakdown: stats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
