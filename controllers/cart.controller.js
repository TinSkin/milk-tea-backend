import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";
import Topping from "../models/Topping.model.js";

// ==========================================================
// 🔹 Hàm tính tổng tiền giỏ hàng
const calculateTotal = async (cart) => {
    let total = 0;
  
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
  
      const productPrice = Number(product.price) || 0;
      const quantity = Number(item.quantity) || 0;
  
      let itemTotal = productPrice * quantity;
  
      // Cộng topping
      if (item.toppings && item.toppings.length > 0) {
        for (const t of item.toppings) {
          const topping = await Topping.findById(t.toppingId);
          const toppingPrice = Number(topping?.price) || 0;
          itemTotal += toppingPrice * quantity;
        }
      }
  
      total += itemTotal;
    }
  
    return total;
  };
  

// So sánh 2 mảng topping, bỏ qua thứ tự, convert ObjectId thành string
const compareToppings = (a, b) => {
    if (!a) a = [];
    if (!b) b = [];
    if (a.length !== b.length) return false;
  
    const sortedA = a.map(t => t.toppingId?.toString() || '').sort();
    const sortedB = b.map(t => t.toppingId?.toString() || '').sort();
  
    return sortedA.join(',') === sortedB.join(',');
  };
  
// ==========================================================
//  Lấy giỏ hàng
// Lấy giỏ hàng theo cửa hàng
export const getCart = async (req, res) => {
    try {
      const userId = req.userId || req.user?.id;
      const { storeId } = req.query; // Nếu muốn lấy theo cửa hàng
  
      if (!storeId) return res.status(400).json({ success: false, message: "Thiếu storeId." });
  
      let cart = await Cart.findOne({ userId, storeId, status: "active" })
        .populate("items.productId", "name price image category")
        .populate("items.toppings.toppingId", "name price");
  
      if (!cart) {
        return res.status(200).json({ success: true, data: { items: [], totalAmount: 0 } });
      }
  
      res.status(200).json({ success: true, data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi lấy giỏ hàng: " + error.message });
    }
  };
  
  // ➕ Thêm sản phẩm vào giỏ theo cửa hàng
  export const addToCart = async (req, res) => {
    try {
      const userId = req.userId || req.user?.id;
      const { storeId, productId, quantity = 1, toppings = [], specialNotes = "" } = req.body;
  
      if (!storeId || !productId) {
        return res.status(400).json({ success: false, message: "Thiếu storeId hoặc productId." });
      }
  
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
  
      // 🔹 Tìm giỏ hàng hiện tại của user cho cửa hàng này
      let cart = await Cart.findOne({ userId, storeId, status: "active" });
  
      // Nếu chưa có cart cho cửa hàng này, tạo mới
      if (!cart) {
        cart = new Cart({
          userId,
          storeId,
          items: [],
          totalAmount: 0
        });
      }
  
      // 🔹 Kiểm tra xem sản phẩm đã có trong cart chưa
      const existingIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === productId &&
          compareToppings(item.toppings, toppings) &&
          item.specialNotes === specialNotes // nếu muốn trùng phải cùng ghi chú
      );
      
      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity, toppings, specialNotes });
      }
      
  
      // 🔹 Tính lại tổng tiền
      cart.totalAmount = await calculateTotal(cart);
      await cart.save();
  
      await cart.populate("items.productId", "name price images category");
      await cart.populate("items.toppings.toppingId", "name price");
  
      res.status(200).json({ success: true, message: "Đã thêm sản phẩm vào giỏ hàng.", data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi thêm vào giỏ hàng: " + error.message });
    }
  };
  

// ==========================================================
// 🔢 Cập nhật số lượng (thủ công)
export const updateQuantity = async (req, res) => {
    try {
      const userId = req.userId || req.user?.id;
      const { storeId, itemId, quantity } = req.body;
  
      if (!storeId || !itemId || quantity === undefined) {
        return res.status(400).json({ success: false, message: "Thiếu storeId, itemId hoặc quantity." });
      }
  
      // 🔹 Tìm giỏ hàng chính xác theo user + store
      const cart = await Cart.findOne({ userId, storeId, status: "active" });
      if (!cart) return res.status(404).json({ success: false, message: "Không tìm thấy giỏ hàng." });
  
      const item = cart.items.id(itemId);
      if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong giỏ hàng." });
  
      item.quantity = quantity;
      cart.totalAmount = await calculateTotal(cart);
      await cart.save();
  
      res.status(200).json({ success: true, message: "Đã cập nhật số lượng sản phẩm.", data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật số lượng: " + error.message });
    }
  };
  
  
  // ==========================================================
  // ✏️ Cập nhật cấu hình sản phẩm
  export const updateCartItem = async (req, res) => {
    try {
      const userId = req.userId || req.user?.id;
      const { itemId, newConfig, storeId } = req.body;
  
      if (!storeId) return res.status(400).json({ success: false, message: "Thiếu storeId." });
  
      const cart = await Cart.findOne({ userId, storeId, status: "active" });
      if (!cart) return res.status(404).json({ success: false, message: "Không tìm thấy giỏ hàng." });
  
      const item = cart.items.id(itemId);
      if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong giỏ hàng." });
  
      if (newConfig.toppings) item.toppings = newConfig.toppings;
      if (newConfig.specialNotes) item.specialNotes = newConfig.specialNotes;
      if (newConfig.sizeOption) item.sizeOption = newConfig.sizeOption;
      if (newConfig.sugarLevel) item.sugarLevel = newConfig.sugarLevel;
      if (newConfig.iceOption) item.iceOption = newConfig.iceOption;
  
      cart.totalAmount = await calculateTotal(cart);
      await cart.save();
  
      res.status(200).json({ success: true, message: "Đã cập nhật cấu hình sản phẩm.", data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật sản phẩm: " + error.message });
    }
  };
  
  // ==========================================================
  // ♻️ Gom sản phẩm trùng
// ♻️ Gom sản phẩm trùng
export const mergeDuplicateItems = async (req, res) => {
    try {
      const userId = req.userId || req.user?.id;
      const { storeId } = req.body;
  
      if (!storeId)
        return res.status(400).json({ success: false, message: "Thiếu storeId." });
  
      const cart = await Cart.findOne({ userId, storeId, status: "active" });
      if (!cart)
        return res.status(404).json({ success: false, message: "Không tìm thấy giỏ hàng." });
  
      const merged = [];
      for (const item of cart.items) {
        const found = merged.find(
          (m) =>
            m.productId.toString() === item.productId.toString() &&
            compareToppings(m.toppings, item.toppings) &&
            m.specialNotes === item.specialNotes
        );
  
        if (found) found.quantity += item.quantity;
        else merged.push(item);
      }
  
      cart.items = merged;
      cart.totalAmount = await calculateTotal(cart);
      await cart.save();
  
      res.status(200).json({
        success: true,
        message: "Đã gộp các sản phẩm trùng.",
        data: cart,
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Lỗi khi gộp sản phẩm: " + error.message });
    }
  };
  

  // ==========================================================
  // ❌ Xóa 1 sản phẩm
  export const removeFromCart = async (req, res) => {
    try {
      const userId = req.userId || req.user?.id;
      const { itemId, storeId } = req.body;
  
      if (!storeId) return res.status(400).json({ success: false, message: "Thiếu storeId." });
  
      const cart = await Cart.findOne({ userId, storeId, status: "active" });
      if (!cart) return res.status(404).json({ success: false, message: "Không tìm thấy giỏ hàng." });
  
      cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
      cart.totalAmount = await calculateTotal(cart);
      await cart.save();
  
      res.status(200).json({ success: true, message: "Đã xóa sản phẩm khỏi giỏ hàng.", data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi xóa sản phẩm: " + error.message });
    }
  };
  
  // ==========================================================
  // ❌ Xóa toàn bộ giỏ hàng
  export const clearCart = async (req, res) => {
    try {
      const userId = req.userId || req.user?.id;
      const { storeId } = req.body;
  
      if (!storeId) return res.status(400).json({ success: false, message: "Thiếu storeId." });
  
      const cart = await Cart.findOne({ userId, storeId, status: "active" });
      if (!cart) return res.status(404).json({ success: false, message: "Không tìm thấy giỏ hàng." });
  
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
  
      res.status(200).json({ success: true, message: "Đã xóa toàn bộ giỏ hàng.", data: cart });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi xóa giỏ hàng: " + error.message });
    }
  };
