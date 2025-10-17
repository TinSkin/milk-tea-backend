import Order from "../../models/Order.model.js";
import Store from "../../models/Store.model.js";
import User from "../../models/User.model.js";

// Helper function để xử lý đường dẫn ảnh
function processImagePath(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${process.env.BASE_URL || 'http://localhost:5000'}/${imagePath}`;
}

//! Lấy đơn hàng của cửa hàng
export const getMyStoreOrders = async (req, res) => {
    try {
      // Chỉ cho manager
      if (req.user.role !== "storeManager") {
        return res.status(403).json({
          success: false,
          message: "Chỉ có manager mới được truy cập",
        });
      }
  
      const managerId = req.user.userId || req.user._id;
      const store = await Store.findOne({ manager: managerId }).lean();
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cửa hàng cho manager này",
        });
      }
  
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
  
      const filter = { storeId: store._id };
  
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
        .populate({
          path: "items.productId",
          select: "name images status price",
          options: { strictPopulate: false }
        })
        .populate("storeId", "storeName storeCode")
        .lean();
  
      // Xử lý image, topping và subtotal
      const processedOrders = orders.map((order) => {
        const items = order.items.map((item) => {
          // Sử dụng image từ item trực tiếp (đã được lưu khi tạo đơn hàng)
          const productImage = item.image || item.productId?.images?.[0];
          const productName = item.productName || item.productId?.name || "Sản phẩm không xác định";
          const price = item.price || item.productId?.price || 0;
          const quantity = item.quantity || 1;
          
          return {
            ...item,
            productName,
            price,
            quantity,
            image: processImagePath(productImage),
            subtotal: price * quantity,
            toppings: item.toppings || [],
          };
        });
  
        return {
          ...order,
          items,
          // Đảm bảo customerInfo có đầy đủ thông tin
          customerInfo: {
            name: order.customerInfo?.name || "Không xác định",
            email: order.customerInfo?.email || "",
            phone: order.shippingAddress?.phone || ""
          }
        };
      });
  
      const totalOrders = await Order.countDocuments(filter);
      const totalPages = Math.ceil(totalOrders / limitNum);
  
      res.status(200).json({
        success: true,
        message: "Lấy danh sách đơn hàng cửa hàng thành công",
        data: {
          storeInfo: {
            storeName: store.storeName,
            storeCode: store.storeCode,
          },
          orders: processedOrders,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalOrders,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
            limit: limitNum,
          },
        },
      });
    } catch (error) {
      console.error("Lỗi khi lấy đơn hàng cửa hàng:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy đơn hàng cửa hàng",
        error: error.message,
      });
    }
  };

//! Xem chi tiết đơn hàng
export const getOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const managerId = req.user.userId || req.user._id;

    console.log("🔍 Getting order detail for:", { orderId, managerId });

    // Tìm cửa hàng của manager
    const store = await Store.findOne({ manager: managerId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng cho manager này"
      });
    }

    // Tìm đơn hàng và kiểm tra xem có thuộc cửa hàng này không
    const order = await Order.findById(orderId)
      .populate({
        path: "items.productId",
        select: "name images status price description"
      })
      .populate("storeId", "storeName storeCode address phone")
      .populate("customerId", "name email phoneNumber")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra đơn hàng có thuộc cửa hàng của manager không
    if (order.storeId._id.toString() !== store._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn hàng này"
      });
    }

    // Xử lý hình ảnh và tính toán subtotal
    const processedOrder = {
      ...order,
      items: order.items.map(item => {
        const productImage = item.image || item.productId?.images?.[0];
        const productName = item.productName || item.productId?.name || "Sản phẩm không xác định";
        const price = item.price || item.productId?.price || 0;
        const quantity = item.quantity || 1;
        
        return {
          ...item,
          productName,
          price,
          quantity,
          image: productImage,
          subtotal: price * quantity,
          toppings: item.toppings || []
        };
      })
    };

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn hàng thành công",
      data: processedOrder
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết đơn hàng",
      error: error.message
    });
  }
};
//! Cập nhật trạng thái đơn hàng - FIXED HOÀN TOÀN
export const updateOrderStatus = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, note = "" } = req.body;
      const managerId = req.user.userId || req.user._id;
  
      console.log("🔄 Updating order status:", { orderId, status, managerId });
  
      // Validate status
      const validStatuses = ["finding_driver", "picking_up", "delivering", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ"
        });
      }
  
      // Tìm cửa hàng của manager
      const store = await Store.findOne({ manager: managerId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cửa hàng cho manager này"
        });
      }
  
      // Tìm đơn hàng
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn hàng"
        });
      }
  
      // Kiểm tra đơn hàng có thuộc cửa hàng của manager không
      if (order.storeId.toString() !== store._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền cập nhật đơn hàng này"
        });
      }
  
      // Kiểm tra nếu đang cố gắng hủy đơn hàng thì phải dùng hàm cancelOrder
      if (status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Vui lòng sử dụng API hủy đơn hàng để hủy đơn"
        });
      }
  
      // Lưu trạng thái cũ để kiểm tra
      const oldStatus = order.status;
  
      // ✅ TẠO NOTE THÔNG MINH - KHÔNG ĐỂ HỆ THỐNG TỰ TẠO BẢN GHI
      let finalNote = note;
      if (!finalNote) {
        // Sử dụng note tiếng Việt thay vì để hệ thống tạo note tiếng Anh
        const statusText = {
          'finding_driver': 'đang tìm tài xế',
          'picking_up': 'đang lấy hàng', 
          'delivering': 'đang giao hàng',
          'delivered': 'đã giao hàng'
        }[status] || status;
        
        finalNote = `Cập nhật trạng thái thành ${statusText}`;
      }
  
      const currentTimestamp = new Date();
      
      // Cập nhật trạng thái
      order.status = status;
      
      // Tự động cập nhật trạng thái thanh toán nếu đơn hàng đã giao
      let paymentStatusChanged = false;
      if (status === "delivered" && order.paymentMethod === "cod" && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        paymentStatusChanged = true;
        
        // Thêm thông tin thanh toán vào note hiện tại
        finalNote += " | Đã tự động xác nhận thanh toán COD";
      }
  
      // ✅ CHỈ PUSH 1 BẢN GHI DUY NHẤT - KHÔNG CÓ BẢN GHI TỰ ĐỘNG
      order.statusHistory.push({
        status: status,
        paymentStatus: order.paymentStatus,
        timestamp: currentTimestamp,
        note: finalNote,
        updatedBy: managerId
      });
  
      await order.save();
  
      res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái đơn hàng thành công",
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus: status,
          paymentStatus: order.paymentStatus,
          paymentStatusChanged
        }
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật trạng thái đơn hàng",
        error: error.message
      });
    }
  };

//! Cập nhật trạng thái thanh toán
export const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, note = "" } = req.body;
    const managerId = req.user.userId || req.user._id;


    console.log("💰 Updating payment status:", { orderId, paymentStatus, managerId });

    // Validate payment status
    const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái thanh toán không hợp lệ"
      });
    }

    // Tìm cửa hàng của manager
    const store = await Store.findOne({ manager: managerId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng cho manager này"
      });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra đơn hàng có thuộc cửa hàng của manager không
    if (order.storeId.toString() !== store._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật đơn hàng này"
      });
    }

    // Lưu trạng thái thanh toán cũ
    const oldPaymentStatus = order.paymentStatus;

    // Cập nhật trạng thái thanh toán
    order.paymentStatus = paymentStatus;

    // Thêm vào lịch sử
    order.statusHistory.push({
      status: order.status,
      paymentStatus: paymentStatus,
      timestamp: new Date(),
      note: note || `Trạng thái thanh toán thay đổi từ ${oldPaymentStatus} sang ${paymentStatus}`,
      updatedBy: managerId
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thanh toán thành công",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldPaymentStatus,
        newPaymentStatus: paymentStatus,
        orderStatus: order.status
      }
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái thanh toán:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật trạng thái thanh toán",
      error: error.message
    });
  }
};

//! Hủy đơn hàng
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const managerId = req.user.userId || req.user._id;


    console.log("❌ Canceling order:", { orderId, reason, managerId });

    // Validate reason
    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp lý do hủy đơn hàng"
      });
    }

    // Tìm cửa hàng của manager
    const store = await Store.findOne({ manager: managerId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng cho manager này"
      });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra đơn hàng có thuộc cửa hàng của manager không
    if (order.storeId.toString() !== store._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này"
      });
    }

    // Kiểm tra trạng thái hiện tại - chỉ được hủy khi đang ở trạng thái "finding_driver"
    if (order.status !== "finding_driver") {
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể hủy đơn hàng khi đang ở trạng thái "Đang tìm tài xế". Trạng thái hiện tại: ${order.status}`
      });
    }

    // Lưu trạng thái cũ
    const oldStatus = order.status;
    const oldPaymentStatus = order.paymentStatus;

    // Cập nhật trạng thái thành cancelled
    order.status = "cancelled";
    order.paymentStatus = "failed"; // Hoàn tiền nếu đã thanh toán

    // Thêm vào lịch sử với lý do hủy
    order.statusHistory.push({
      status: "cancelled",
      paymentStatus: "failed",
      timestamp: new Date(),
      note: `Đơn hàng bị hủy: ${reason}`,
      updatedBy: managerId
    });

    await order.save();

    // TODO: Gửi thông báo cho khách hàng về việc hủy đơn hàng

    res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldStatus,
        newStatus: "cancelled",
        oldPaymentStatus,
        newPaymentStatus: "failed",
        reason: reason,
        cancelledAt: new Date()
      }
    });
  } catch (error) {
    console.error("Lỗi khi hủy đơn hàng:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi hủy đơn hàng",
      error: error.message
    });
  }
};

//! Lấy lịch sử trạng thái đơn hàng - FIXED với deduplication mạnh
export const getOrderStatusHistory = async (req, res) => {
    try {
      const { orderId } = req.params;
      const managerId = req.user.userId || req.user._id;
  
      // Tìm cửa hàng của manager
      const store = await Store.findOne({ manager: managerId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cửa hàng cho manager này"
        });
      }
  
      // Tìm đơn hàng
      const order = await Order.findById(orderId)
        .select("orderNumber status paymentStatus statusHistory storeId")
        .populate("statusHistory.updatedBy", "name email")
        .lean();
  
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn hàng"
        });
      }
  
      // Kiểm tra đơn hàng có thuộc cửa hàng của manager không
      if (order.storeId.toString() !== store._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem lịch sử đơn hàng này"
        });
      }
  
      // ✅ DEDUPLICATION MẠNH - LOẠI BỎ CÁC BẢN GHI HỆ THỐNG TỰ ĐỘNG
      const uniqueHistoryMap = new Map();
      
      order.statusHistory.forEach(history => {
        // Làm tròn timestamp đến 10 giây để nhóm các bản ghi gần nhau
        const roundedTimestamp = new Date(history.timestamp);
        roundedTimestamp.setSeconds(Math.floor(roundedTimestamp.getSeconds() / 10) * 10);
        roundedTimestamp.setMilliseconds(0);
        
        const timestampKey = roundedTimestamp.getTime();
        const key = `${timestampKey}-${history.status}-${history.paymentStatus}`;
        
        if (!uniqueHistoryMap.has(key)) {
          uniqueHistoryMap.set(key, history);
        } else {
          // Nếu đã tồn tại, ưu tiên theo thứ tự:
          const existing = uniqueHistoryMap.get(key);
          
          // 1. Ưu tiên bản ghi có updatedBy (manager thực hiện)
          if (!existing.updatedBy && history.updatedBy) {
            uniqueHistoryMap.set(key, history);
          } 
          // 2. Ưu tiên bản ghi không phải là "Status changed to..." (hệ thống tự động)
          else if (existing.note?.includes("Status changed to") && !history.note?.includes("Status changed to")) {
            uniqueHistoryMap.set(key, history);
          }
          // 3. Ưu tiên bản ghi có note dài hơn (thường chứa nhiều thông tin hơn)
          else if (history.note?.length > existing.note?.length) {
            uniqueHistoryMap.set(key, history);
          }
        }
      });
  
      // Chuyển Map thành array và sắp xếp theo thời gian
      const uniqueHistory = Array.from(uniqueHistoryMap.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
      console.log(`📊 Order ${orderId}: ${order.statusHistory.length} -> ${uniqueHistory.length} records after deduplication`);
  
      res.status(200).json({
        success: true,
        message: "Lấy lịch sử trạng thái đơn hàng thành công",
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          currentStatus: order.status,
          currentPaymentStatus: order.paymentStatus,
          history: uniqueHistory,
          originalCount: order.statusHistory.length,
          uniqueCount: uniqueHistory.length
        }
      });
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử trạng thái đơn hàng:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy lịch sử trạng thái đơn hàng",
        error: error.message
      });
    }
  };

  //! Cleanup lịch sử - XÓA CÁC BẢN GHI HỆ THỐNG TỰ ĐỘNG
export const cleanupOrderHistory = async (req, res) => {
    try {
      const managerId = req.user.userId || req.user._id;
  
      const store = await Store.findOne({ manager: managerId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cửa hàng cho manager này"
        });
      }
  
      const orders = await Order.find({ storeId: store._id });
      let totalCleaned = 0;
      let processedOrders = 0;
  
      for (const order of orders) {
        const originalCount = order.statusHistory.length;
        
        if (originalCount === 0) {
          processedOrders++;
          continue;
        }
  
        // ✅ LOẠI BỎ BẢN GHI HỆ THỐNG TỰ ĐỘNG
        const cleanedHistory = [];
        const seenKeys = new Set();
        
        order.statusHistory.forEach(history => {
          const roundedTimestamp = new Date(history.timestamp);
          roundedTimestamp.setSeconds(Math.floor(roundedTimestamp.getSeconds() / 10) * 10);
          roundedTimestamp.setMilliseconds(0);
          
          const key = `${roundedTimestamp.getTime()}-${history.status}-${history.paymentStatus}`;
          
          // Bỏ qua bản ghi hệ thống tự động nếu đã có bản ghi manager
          if (history.note?.includes("Status changed to") && seenKeys.has(key)) {
            return; // Bỏ qua bản ghi hệ thống tự động
          }
          
          if (!seenKeys.has(key)) {
            cleanedHistory.push(history);
            seenKeys.add(key);
          }
        });
  
        // Sắp xếp
        const sortedHistory = cleanedHistory.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
  
        // Cập nhật nếu có thay đổi
        if (sortedHistory.length !== originalCount) {
          order.statusHistory = sortedHistory;
          await order.save();
          totalCleaned += (originalCount - sortedHistory.length);
          console.log(`🧹 Order ${order.orderNumber}: ${originalCount} -> ${sortedHistory.length} records`);
        }
        
        processedOrders++;
      }
  
      res.status(200).json({
        success: true,
        message: `Cleanup thành công. Đã xử lý ${processedOrders} đơn hàng, xóa ${totalCleaned} bản ghi hệ thống tự động.`,
        data: {
          storeId: store._id,
          totalOrders: orders.length,
          processedOrders,
          totalCleanedRecords: totalCleaned
        }
      });
    } catch (error) {
      console.error("Lỗi khi cleanup lịch sử đơn hàng:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cleanup lịch sử đơn hàng",
        error: error.message
      });
    }
  };