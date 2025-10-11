import Store from "../../models/Store.model.js";

//! Lấy danh sách thành phố có cửa hàng hoạt động
export const getCities = async (req, res) => {
    try {
        // Lấy danh sách unique cities từ stores đang hoạt động
        const cities = await Store.distinct('address.city', { status: 'active' });

        // Lọc bỏ null/undefined và sort A-Z
        const filteredCities = cities.filter(city => city).sort();

        res.status(200).json({
            success: true,
            message: "Lấy danh sách thành phố thành công",
            data: filteredCities
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách thành phố:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách thành phố",
            error: error.message
        });
    }
};

//! Lấy danh sách cửa hàng theo thành phố (dành cho user)
export const getStoresByCity = async (req, res) => {
    try {
        const { city } = req.query;

        if (!city) {
            return res.status(400).json({
                success: false,
                message: "Tham số thành phố là bắt buộc"
            });
        }

        // Tìm stores theo thành phố, chỉ lấy thông tin cần thiết cho user
        const stores = await Store.find({
            'address.city': { $regex: city, $options: 'i' },
            status: 'active'
        })
            .select('storeName storeCode address phone openTime closeTime deliveryRadius status')
            .sort({ storeName: 1 });

        res.status(200).json({
            success: true,
            message: `Lấy danh sách cửa hàng tại ${city} thành công`,
            data: {
                city: city,
                stores: stores,
                total: stores.length
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách cửa hàng theo thành phố:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách cửa hàng",
            error: error.message
        });
    }
};

//! Lấy chi tiết thông tin cửa hàng (dành cho user)
export const getStoreDetail = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId)
      .select('storeName address openHours status coverImage')
      .populate('manager', 'userName') 
      .lean();
    if (!store) return res.status(404).json({ success:false, message:'Không tìm thấy cửa hàng' });
    res.json({ success:true, data: store });
  } catch (e) {
    res.status(500).json({ success:false, message:'Lỗi server', error:e.message });
  }
};