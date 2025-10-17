// controllers/store/dashboard.controller.js
import Order from "../../models/Order.model.js";
import Store from "../../models/Store.model.js";
import Product from "../../models/Product.model.js";
import ExcelJS from 'exceljs';

//! Lấy thống kê dashboard cho store manager
export const getStoreDashboard = async (req, res) => {
  try {
    console.log("✅ Dashboard API called successfully");
    
    const managerId = req.user.userId || req.user._id;
    console.log("🔄 Dashboard request from manager:", managerId);

    // Tìm cửa hàng của manager
    const store = await Store.findOne({ manager: managerId });
    console.log("🏪 Found store:", store?._id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng cho manager này"
      });
    }

    const { period = "30d" } = req.query;
    const startDate = calculateStartDate(period);
    console.log("📅 Period:", period, "Start date:", startDate);

    // Lấy tất cả dữ liệu
    const orderStats = await getOrderStats(store._id, startDate);
    const revenueStats = await getRevenueStats(store._id, startDate);
    const customerStats = await getCustomerStats(store._id, startDate);
    const productStats = await getProductStats(store._id, startDate);
    const recentOrders = await getRecentOrders(store._id);

    console.log("📊 Final stats:", {
      orderStats,
      revenueStats, 
      customerStats,
      productStats
    });

    const dashboardData = {
      metrics: {
        // Order metrics
        totalOrders: orderStats.total,
        completedOrders: orderStats.completed,
        cancelledOrders: orderStats.cancelled,
        orderGrowth: 12.5, // Tạm thời fix cứng
        
        // Revenue metrics
        totalRevenue: revenueStats.total,
        averageOrderValue: orderStats.total > 0 ? revenueStats.total / orderStats.total : 0,
        revenueGrowth: 15.2, // Tạm thời fix cứng
        
        // Customer metrics
        newCustomers: customerStats.newCustomers,
        returningCustomers: customerStats.returningCustomers,
        customerGrowth: 8.3, // Tạm thời fix cứng
        
        // Product metrics
        productsSold: productStats.totalSold,
        topProducts: productStats.topProducts,
        productGrowth: 5.7 // Tạm thời fix cứng
      },
      charts: {
        dailyRevenue: revenueStats.daily,
        orderStatusBreakdown: orderStats.byStatus,
        paymentMethodBreakdown: revenueStats.byPaymentMethod
      },
      recentActivities: recentOrders,
      storeInfo: {
        storeName: store.storeName,
        storeCode: store.storeCode,
        totalProducts: await Product.countDocuments({ store: store._id, status: 'active' }) || 0
      }
    };

    res.status(200).json({
      success: true,
      message: "Lấy dữ liệu dashboard thành công",
      data: dashboardData
    });

  } catch (error) {
    console.error("❌ Error in dashboard API:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy dữ liệu dashboard",
      error: error.message
    });
  }
};

//! Hàm lấy thống kê đơn hàng
async function getOrderStats(storeId, startDate, endDate = new Date()) {
  try {
    console.log("📈 Getting order stats for store:", storeId);
    
    const matchStage = {
      storeId: storeId,
      createdAt: { $gte: startDate, $lte: endDate }
    };

    // Đếm tổng đơn hàng
    const totalOrders = await Order.countDocuments(matchStage);
    
    // Đếm đơn hoàn thành
    const completedOrders = await Order.countDocuments({
      ...matchStage,
      status: "delivered"
    });
    
    // Đếm đơn đã hủy
    const cancelledOrders = await Order.countDocuments({
      ...matchStage,
      status: "cancelled"
    });

    // Tính tổng doanh thu từ các đơn đã giao
    const revenueResult = await Order.aggregate([
      { 
        $match: { 
          storeId: storeId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: "delivered" 
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalAmount" }
        }
      }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Thống kê theo status
    const statusStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [
                { $eq: ["$status", "delivered"] }, 
                "$finalAmount", 
                0 
              ] 
            } 
          }
        }
      }
    ]);

    const result = {
      total: totalOrders,
      completed: completedOrders,
      cancelled: cancelledOrders,
      totalRevenue: totalRevenue,
      byStatus: statusStats
    };

    console.log("📈 Order stats result:", result);
    return result;

  } catch (error) {
    console.error("❌ Error in getOrderStats:", error);
    return {
      total: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
      byStatus: []
    };
  }
}

//! Hàm lấy thống kê doanh thu
async function getRevenueStats(storeId, startDate, endDate = new Date()) {
  try {
    console.log("💰 Getting revenue stats for store:", storeId);
    
    const matchStage = {
      storeId: storeId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: "delivered"
    };

    // Tổng doanh thu
    const totalStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: "$finalAmount" },
          orders: { $sum: 1 }
        }
      }
    ]);

    // Doanh thu theo ngày
    const dailyRevenue = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          revenue: { $sum: "$finalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    // Doanh thu theo payment method
    const byPaymentMethod = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$paymentMethod",
          revenue: { $sum: "$finalAmount" },
          orders: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: totalStats.length > 0 ? totalStats[0].total : 0,
      daily: dailyRevenue,
      byPaymentMethod: byPaymentMethod
    };

    console.log("💰 Revenue result:", result);
    return result;

  } catch (error) {
    console.error("❌ Error in getRevenueStats:", error);
    return {
      total: 0,
      daily: [],
      byPaymentMethod: []
    };
  }
}

//! Hàm lấy thống kê khách hàng
async function getCustomerStats(storeId, startDate, endDate = new Date()) {
  try {
    console.log("👥 Getting customer stats for store:", storeId);
    
    // Khách hàng mới trong kỳ
    const newCustomers = await Order.distinct("customerId", {
      storeId: storeId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    console.log("👥 New customers count:", newCustomers.length);

    // Nếu không có khách hàng mới, trả về 0
    if (newCustomers.length === 0) {
      return {
        newCustomers: 0,
        returningCustomers: 0
      };
    }

    // Khách hàng cũ (đã mua trước khoảng thời gian này)
    const previousCustomers = await Order.distinct("customerId", {
      storeId: storeId,
      createdAt: { $lt: startDate }
    });

    const returningCustomers = newCustomers.filter(customerId => 
      previousCustomers.some(prevId => prevId.toString() === customerId.toString())
    ).length;

    return {
      newCustomers: newCustomers.length,
      returningCustomers: returningCustomers
    };

  } catch (error) {
    console.error("❌ Error in getCustomerStats:", error);
    return {
      newCustomers: 0,
      returningCustomers: 0
    };
  }
}

//! Hàm lấy thống kê sản phẩm
async function getProductStats(storeId, startDate, endDate = new Date()) {
  try {
    console.log("📦 Getting product stats for store:", storeId);
    
    const productStats = await Order.aggregate([
      {
        $match: {
          storeId: storeId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: "delivered"
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    console.log("📦 Raw product stats:", productStats);

    // Populate product info
    const topProducts = await Promise.all(
      productStats.map(async (stat) => {
        try {
          const product = await Product.findById(stat._id).select("name images price category");
          return {
            _id: stat._id,
            name: product?.name || "Sản phẩm không xác định",
            image: product?.images?.[0] || null,
            price: product?.price || 0,
            category: product?.category || "Khác",
            quantity: stat.totalSold,
            revenue: stat.totalRevenue
          };
        } catch (error) {
          console.error("❌ Error populating product:", stat._id, error);
          return {
            _id: stat._id,
            name: "Sản phẩm không xác định",
            image: null,
            price: 0,
            category: "Khác",
            quantity: stat.totalSold,
            revenue: stat.totalRevenue
          };
        }
      })
    );

    const totalSold = productStats.reduce((sum, stat) => sum + stat.totalSold, 0);

    const result = {
      totalSold,
      topProducts
    };

    console.log("📦 Final product stats:", result);
    return result;

  } catch (error) {
    console.error("❌ Error in getProductStats:", error);
    return {
      totalSold: 0,
      topProducts: []
    };
  }
}

//! Hàm lấy đơn hàng gần đây
async function getRecentOrders(storeId, limit = 10) {
  try {
    const orders = await Order.find({
      storeId: storeId
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("customerId", "name email")
    .select("orderNumber status paymentStatus finalAmount createdAt customerInfo");

    return orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      amount: order.finalAmount,
      customerName: order.customerInfo?.name || order.customerId?.name || "Khách hàng",
      createdAt: order.createdAt,
      type: "order"
    }));
  } catch (error) {
    console.error("❌ Error in getRecentOrders:", error);
    return [];
  }
}

//! Utility functions
function calculateStartDate(period, isPrevious = false) {
  const now = new Date();
  let days = 30;

  switch (period) {
    case "7d": days = 7; break;
    case "30d": days = 30; break;
    case "90d": days = 90; break;
    case "1y": days = 365; break;
  }

  if (isPrevious) {
    return new Date(now.setDate(now.getDate() - days * 2));
  }

  return new Date(now.setDate(now.getDate() - days));
}

//! Xuất báo cáo dashboard ra Excel
export const exportDashboardReport = async (req, res) => {
    try {
      const managerId = req.user.userId || req.user._id;
      const { period = "30d", reportType = "overview" } = req.query;
  
      console.log("📊 Exporting dashboard report for manager:", managerId);
  
      // Tìm cửa hàng của manager
      const store = await Store.findOne({ manager: managerId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cửa hàng cho manager này"
        });
      }
  
      const startDate = calculateStartDate(period);
  
      // Lấy dữ liệu cho báo cáo
      const [orderStats, revenueStats, productStats, recentOrders] = await Promise.all([
        getOrderStats(store._id, startDate),
        getRevenueStats(store._id, startDate),
        getProductStats(store._id, startDate),
        getRecentOrders(store._id, 50) // Lấy nhiều hơn để export
      ]);
  
      // Tạo workbook Excel
      const workbook = new ExcelJS.Workbook();
      
      // Tạo các sheet khác nhau tùy theo reportType
      if (reportType === "overview" || reportType === "all") {
        await createOverviewSheet(workbook, store, orderStats, revenueStats, productStats, period);
      }
      
      if (reportType === "orders" || reportType === "all") {
        await createOrdersSheet(workbook, store, recentOrders, period);
      }
      
      if (reportType === "products" || reportType === "all") {
        await createProductsSheet(workbook, store, productStats, period);
      }
  
      // Thiết lập headers cho response
      const fileName = `bao_cao_${store.storeCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  
      // Ghi file Excel và gửi về client
      await workbook.xlsx.write(res);
      res.end();
  
    } catch (error) {
      console.error("❌ Error exporting dashboard report:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi xuất báo cáo",
        error: error.message
      });
    }
  };
  
  //! Tạo sheet tổng quan
  async function createOverviewSheet(workbook, store, orderStats, revenueStats, productStats, period) {
    const worksheet = workbook.addWorksheet('Tổng Quan');
  
    // Tiêu đề báo cáo
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = `BÁO CÁO DASHBOARD - ${store.storeName}`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
  
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `Kỳ báo cáo: ${getPeriodLabel(period)} - Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
  
    // Thống kê chính
    worksheet.mergeCells('A4:F4');
    worksheet.getCell('A4').value = 'CHỈ SỐ KINH DOANH CHÍNH';
    worksheet.getCell('A4').font = { size: 14, bold: true };
    worksheet.getCell('A4').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  
    // Header cho bảng thống kê
    worksheet.addRow(['Chỉ số', 'Giá trị', 'Đơn vị', 'Tăng trưởng']);
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' }
    };
  
    // Dữ liệu thống kê
    const statsData = [
      ['Tổng doanh thu', orderStats.totalRevenue, 'VND', '12.5%'],
      ['Tổng đơn hàng', orderStats.total, 'đơn', '8.3%'],
      ['Đơn hoàn thành', orderStats.completed, 'đơn', '10.2%'],
      ['Đơn đã hủy', orderStats.cancelled, 'đơn', '-2.1%'],
      ['Khách hàng mới', productStats.topProducts.length, 'khách', '15.7%'],
      ['Sản phẩm bán ra', productStats.totalSold, 'sản phẩm', '5.4%'],
      ['Giá trị đơn trung bình', orderStats.total > 0 ? orderStats.totalRevenue / orderStats.total : 0, 'VND', '3.2%']
    ];
  
    statsData.forEach(([label, value, unit, growth]) => {
      const row = worksheet.addRow([
        label,
        typeof value === 'number' ? (unit === 'VND' ? formatExcelCurrency(value) : value) : value,
        unit,
        growth
      ]);
      
      // Định dạng số
      if (typeof value === 'number') {
        row.getCell(2).numFmt = unit === 'VND' ? '#,##0' : '0';
      }
    });
  
    // Phân bổ trạng thái đơn hàng
    worksheet.addRow([]);
    worksheet.mergeCells('A13:F13');
    worksheet.getCell('A13').value = 'PHÂN BỔ TRẠNG THÁI ĐƠN HÀNG';
    worksheet.getCell('A13').font = { size: 14, bold: true };
    worksheet.getCell('A13').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  
    worksheet.addRow(['Trạng thái', 'Số lượng', 'Tỷ lệ', 'Doanh thu']);
    const statusHeaderRow = worksheet.getRow(14);
    statusHeaderRow.font = { bold: true };
    statusHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' }
    };
  
    orderStats.byStatus.forEach(status => {
      const percentage = orderStats.total > 0 ? (status.count / orderStats.total * 100).toFixed(1) : 0;
      worksheet.addRow([
        getStatusLabel(status._id),
        status.count,
        `${percentage}%`,
        formatExcelCurrency(status.revenue || 0)
      ]);
    });
  
    // Điều chỉnh độ rộng cột
    worksheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 10 },
      { width: 12 },
      { width: 15 },
      { width: 15 }
    ];
  }
  
  //! Tạo sheet đơn hàng
  async function createOrdersSheet(workbook, store, orders, period) {
    const worksheet = workbook.addWorksheet('Đơn Hàng');
  
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `DANH SÁCH ĐƠN HÀNG - ${store.storeName}`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
  
    // Header
    const headers = ['Mã đơn', 'Khách hàng', 'Trạng thái', 'Thanh toán', 'Số tiền', 'Ngày tạo', 'Số SP', 'Ghi chú'];
    worksheet.addRow(headers);
    
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  
    // Dữ liệu đơn hàng
    orders.forEach(order => {
      worksheet.addRow([
        order.orderNumber,
        order.customerName,
        getStatusLabel(order.status),
        getPaymentStatusLabel(order.paymentStatus),
        order.amount,
        new Date(order.createdAt).toLocaleDateString('vi-VN'),
        '', // Số sản phẩm - có thể tính từ items nếu có
        '' // Ghi chú
      ]);
    });
  
    // Định dạng cột số tiền
    const amountCol = worksheet.getColumn(5);
    amountCol.numFmt = '#,##0';
  
    // Điều chỉnh độ rộng cột
    worksheet.columns = [
      { width: 15 },
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 10 },
      { width: 20 }
    ];
  }
  
  //! Tạo sheet sản phẩm
  async function createProductsSheet(workbook, store, productStats, period) {
    const worksheet = workbook.addWorksheet('Sản Phẩm');
  
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = `TOP SẢN PHẨM BÁN CHẠY - ${store.storeName}`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
  
    // Header
    const headers = ['STT', 'Tên sản phẩm', 'Số lượng bán', 'Doanh thu', 'Giá trung bình'];
    worksheet.addRow(headers);
    
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  
    // Dữ liệu sản phẩm
    productStats.topProducts.forEach((product, index) => {
      const avgPrice = product.quantity > 0 ? product.revenue / product.quantity : 0;
      worksheet.addRow([
        index + 1,
        product.name,
        product.quantity,
        product.revenue,
        avgPrice
      ]);
    });
  
    // Tổng kết
    worksheet.addRow([]);
    worksheet.addRow(['TỔNG CỘNG', '', productStats.totalSold, productStats.topProducts.reduce((sum, p) => sum + p.revenue, 0), '']);
  
    const totalRow = worksheet.getRow(worksheet.rowCount);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
  
    // Định dạng cột số
    worksheet.getColumn(3).numFmt = '#,##0';
    worksheet.getColumn(4).numFmt = '#,##0';
    worksheet.getColumn(5).numFmt = '#,##0';
  
    // Điều chỉnh độ rộng cột
    worksheet.columns = [
      { width: 8 },
      { width: 35 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];
  }
  
  //! Utility functions cho export
  function formatExcelCurrency(amount) {
    return Math.round(amount);
  }
  
  function getPeriodLabel(period) {
    const labels = {
      '7d': '7 ngày qua',
      '30d': '30 ngày qua', 
      '90d': '90 ngày qua',
      '1y': '1 năm qua'
    };
    return labels[period] || '30 ngày qua';
  }
  
  function getStatusLabel(status) {
    const labels = {
      'finding_driver': 'Đang tìm tài xế',
      'picking_up': 'Đang lấy hàng',
      'delivering': 'Đang giao hàng',
      'delivered': 'Đã giao hàng',
      'cancelled': 'Đã hủy'
    };
    return labels[status] || status;
  }
  
  function getPaymentStatusLabel(paymentStatus) {
    const labels = {
      'pending': 'Chờ thanh toán',
      'paid': 'Đã thanh toán',
      'failed': 'Thất bại',
      'refunded': 'Đã hoàn tiền'
    };
    return labels[paymentStatus] || paymentStatus;
  }