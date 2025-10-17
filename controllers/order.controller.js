
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import Payment from "../models/Payment.model.js";
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
    const { storeId } = req.body;
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

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cửa hàng (storeId)",
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
      storeId: storeId,
      customerInfo: {
        name: req.user?.name || shippingAddress.fullName,
        email: req.user?.email || req.body.customerInfo?.email,
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
          paymentStatus: "pending",
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
// Lấy danh sách đơn hàng (Admin / Store Manager)
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

    // Manager chỉ xem đơn hàng của store mình
    // Nếu là manager (storeManager)
    if (req.user.role === "storeManager") {
      if (!req.user.assignedStoreId) {
        return res.status(400).json({
          success: false,
          message: "Tài khoản manager chưa gán assignedStoreId",
        });
      }
      filter.storeId = new mongoose.Types.ObjectId(req.user.assignedStoreId);
    }
    

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

    // Sort
    let sort = {};
    switch (sortBy) {
      case "oldest": sort.createdAt = 1; break;
      case "amount_asc": sort.finalAmount = 1; break;
      case "amount_desc": sort.finalAmount = -1; break;
      default: sort.createdAt = -1;
    }

    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate("customerId", "name email")
      .populate("items.productId", "name images status")
      .populate("storeId", "name address city")
      .lean();

    // Xử lý image path
    const processedOrders = orders.map((order) => ({
      ...order,
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

// Lấy chi tiết đơn hàng - PHIÊN BẢN ĐÃ CẢI THIỆN
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID đơn hàng không hợp lệ" });
    }

    // Lấy user từ database (vì token của bạn không chứa role)
    const user = await User.findById(req.userId).select("role storeId").lean();

    const order = await Order.findById(id)
      .populate({ path: "customerId", select: "name email" })
      .populate({ path: "items.productId", select: "name images status price" })
      .populate({ path: "storeId", select: "name address city" })
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    // Nếu user là manager, chỉ cho xem đơn hàng thuộc store của họ
    if (
      req.user.role === "storeManager" &&
      order.storeId &&
      String(order.storeId._id) !== String(req.user.assignedStoreId)
    ) {
      return res.status(403).json({ success: false, message: "Không có quyền truy cập đơn hàng này" });
    }
    
    

    // Đảm bảo các giá trị price và quantity có dạng số
    order.items = order.items.map((item) => ({
      ...item,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
    }));

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy thông tin đơn hàng" });
  }
};
// Cập nhật trạng thái đơn hàng (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userRole, storeId, userId } = req; // lấy từ middleware xác thực

    // Kiểm tra trạng thái hợp lệ
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

    //Tìm đơn hàng
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    //Nếu là manager → chỉ được cập nhật đơn hàng thuộc cửa hàng của họ
    if (userRole === "manager") {
      if (!storeId || order.storeId.toString() !== storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền cập nhật đơn hàng này",
        });
      }
    }

    // Cập nhật trạng thái đơn hàng
    order.status = status;
    order.updatedBy = userId;

    // Cập nhật thanh toán (nếu có)
    const payment = await Payment.findOne({ orderId: order._id });

    if (status === "delivered") {
      order.paymentStatus = "paid";

      if (payment && payment.paymentMethod === "cod") {
        payment.status = "paid";
        payment.processedAt = new Date();
        await payment.save();
      }
    } else if (status === "cancelled") {
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
    console.error(" Error updating order status:", error);
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
