import Cart from "../models/Cart.model.js";
import Product from "../models/Product.model.js";
import Topping from "../models/Topping.model.js";

// ==========================================================
//  Hàm tính tổng tiền giỏ hàng (chuẩn, hỗ trợ size + topping)
const calculateTotal = async (cart) => {
  let total = 0;

  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    //  Lấy giá theo sizeOption
    const sizeOptionObj = product.sizeOptions?.find(
      (s) => s.size === (item.sizeOption || "M")
    );
    const sizePrice = sizeOptionObj?.price ?? product.price ?? 0;

    //  Tính tổng topping
    let toppingTotal = 0;
    if (item.toppings && item.toppings.length > 0) {
      for (const t of item.toppings) {
        const topping = await Topping.findById(t.toppingId || t);
        if (topping) toppingTotal += Number(topping.extraPrice) || 0;
      }
    }

    const quantity = Number(item.quantity) || 1;
    const itemTotal = (sizePrice + toppingTotal) * quantity;
    total += itemTotal;
  }

  return total;
};

// ==========================================================
//  Hàm so sánh toppings (bỏ qua thứ tự)

const compareToppings = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  const idsA = a.map((t) => String(t.toppingId || t._id || t)).sort();
  const idsB = b.map((t) => String(t.toppingId || t._id || t)).sort();
  return idsA.join(",") === idsB.join(",");
};

// ==========================================================
//  Lấy giỏ hàng
export const getCart = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { storeId } = req.query;

    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu storeId." });

    let cart = await Cart.findOne({ userId, storeId, status: "active" })
      .populate("items.productId", "name images sizeOptions price category")
      .populate("items.toppings.toppingId", "name extraPrice status");

    if (!cart) {
      return res
        .status(200)
        .json({ success: true, data: { items: [], totalAmount: 0 } });
    }

    //  Cập nhật lại tổng tiền (nếu chưa có hoặc sai)
    cart.totalAmount = await calculateTotal(cart);
    await cart.save();

    //  Lấy toàn bộ danh sách topping đang hoạt động
    const allToppings = await Topping.find({ status: "active" }).select(
      "name extraPrice"
    );

    //  Thêm availableToppings vào từng item
    const cartData = cart.toObject();
    cartData.items = cartData.items.map((item) => ({
      ...item,
      availableToppings: allToppings,
    }));

    res.status(200).json({ success: true, data: cartData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy giỏ hàng: " + error.message,
    });
  }
};

// ==========================================================
//  Thêm sản phẩm vào giỏ
export const addToCart = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const {
      storeId,
      productId,
      quantity = 1,
      toppings = [],
      specialNotes = "",
      sizeOption = "M",
      sugarLevel = "100%",
      iceOption = "Chung",
    } = req.body;

    if (!storeId || !productId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu storeId hoặc productId." });

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm." });

    //  Tính giá sizeOption
    const sizeOptionObj = product.sizeOptions?.find(
      (s) => s.size === (sizeOption || "M")
    );
    const sizeOptionPrice = sizeOptionObj?.price ?? product.price ?? 0;

    //  Lấy danh sách topping từ DB dựa trên ID
    let toppingList = [];
    let toppingTotal = 0;

    if (toppings && toppings.length > 0) {
      const toppingIds = toppings.map((t) =>
        typeof t === "object" ? t.toppingId : t
      );

      const toppingDocs = await Topping.find({ _id: { $in: toppingIds } });

      if (toppingDocs.length !== toppingIds.length) {
        return res.status(400).json({
          success: false,
          message: "Một hoặc nhiều topping không tồn tại.",
        });
      }

      // Lưu toppingId vào cart, không lưu giá
      toppingList = toppingDocs.map((t) => ({
        toppingId: t._id,
        name: t.name,
        extraPrice: t.extraPrice,
      }));

      // Tính tổng tiền topping
      toppingTotal = toppingDocs.reduce(
        (sum, t) => sum + (t.extraPrice || 0),
        0
      );
    }

    //  Tổng giá 1 item
    const totalItemPrice = (sizeOptionPrice + toppingTotal) * quantity;

    //  Lấy giỏ hàng của user
    let cart = await Cart.findOne({ userId, storeId, status: "active" });
    if (!cart) {
      cart = new Cart({ userId, storeId, items: [], totalAmount: 0 });
    }

    //  Kiểm tra item trùng
    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.sizeOption === sizeOption &&
        item.sugarLevel === sugarLevel &&
        item.iceOption === iceOption &&
        compareToppings(item.toppings, toppingList) &&
        item.specialNotes === specialNotes
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        toppings: toppingList,
        specialNotes,
        sizeOption,
        sugarLevel,
        iceOption,
        sizeOptionPrice,
        price: totalItemPrice,
      });
    }

    //  Cập nhật tổng tiền giỏ hàng
    cart.totalAmount = await calculateTotal(cart);
    await cart.save();

    await cart.populate("items.productId", "name images sizeOptions price");
    await cart.populate("items.toppings.toppingId", "name extraPrice status");

    res.status(200).json({
      success: true,
      message: "Đã thêm sản phẩm vào giỏ hàng.",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm sản phẩm vào giỏ hàng: " + error.message,
    });
  }
};

// ==========================================================
//  Cập nhật số lượng
export const updateQuantity = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { storeId, itemId, quantity } = req.body;

    if (!storeId || !itemId || quantity === undefined)
      return res
        .status(400)
        .json({
          success: false,
          message: "Thiếu storeId, itemId hoặc quantity.",
        });

    const cart = await Cart.findOne({ userId, storeId, status: "active" });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giỏ hàng." });

    const item = cart.items.id(itemId);
    if (!item)
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy sản phẩm trong giỏ hàng.",
        });

    item.quantity = quantity;
    cart.totalAmount = await calculateTotal(cart);
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Đã cập nhật số lượng sản phẩm.",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật số lượng: " + error.message,
    });
  }
};

// ==========================================================
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { itemId, newConfig, storeId } = req.body;

    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu storeId." });

    const cart = await Cart.findOne({ userId, storeId, status: "active" });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giỏ hàng." });

    const itemToUpdate = cart.items.id(itemId);
    if (!itemToUpdate)
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy sản phẩm trong giỏ hàng.",
        });

    const product = await Product.findById(itemToUpdate.productId);
    if (!product)
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy thông tin sản phẩm.",
        });

    // Cấu hình mới
    const newSize = newConfig.sizeOption || itemToUpdate.sizeOption;
    const newSugar = newConfig.sugarLevel || itemToUpdate.sugarLevel;
    const newIce = newConfig.iceOption || itemToUpdate.iceOption;
    const newNote = newConfig.specialNotes || itemToUpdate.specialNotes;
    const newQuantity = newConfig.quantity ?? itemToUpdate.quantity;

    // Lấy topping mới (nếu có)
    let newToppings = itemToUpdate.toppings;
    if (newConfig.toppings && Array.isArray(newConfig.toppings)) {
      const toppingIds = newConfig.toppings
        .map((t) => (typeof t === "object" ? t.toppingId || t._id : t))
        .filter(Boolean);

      const toppingDocs = await Topping.find({ _id: { $in: toppingIds } });
      newToppings = toppingDocs.map((t) => ({
        toppingId: t._id,
        name: t.name,
        extraPrice: t.extraPrice || 0,
      }));
    }

    // Tính giá mới
    const sizeOptionObj = product.sizeOptions?.find((s) => s.size === newSize);
    const sizePrice = sizeOptionObj?.price ?? product.price ?? 0;
    const toppingTotal = newToppings.reduce(
      (sum, t) => sum + (t.extraPrice || 0),
      0
    );
    const unitPrice = sizePrice + toppingTotal;

    // Hàm so sánh topping (fix)
    const compareToppings = (a = [], b = []) => {
      if (a.length !== b.length) return false;
      const idsA = a.map((t) => String(t.toppingId || t._id || t)).sort();
      const idsB = b.map((t) => String(t.toppingId || t._id || t)).sort();
      return idsA.join(",") === idsB.join(",");
    };

    // Tìm item khác có cùng cấu hình mới
    const existingIndex = cart.items.findIndex(
      (item) =>
        item._id.toString() !== itemId &&
        item.productId.toString() === itemToUpdate.productId.toString() &&
        item.sizeOption === newSize &&
        item.sugarLevel === newSugar &&
        item.iceOption === newIce &&
        compareToppings(item.toppings, newToppings) &&
        item.specialNotes === newNote
    );

    if (existingIndex > -1) {
      // GỘP: Cộng số lượng + cập nhật giá
      const targetItem = cart.items[existingIndex];
      targetItem.quantity += newQuantity;
      targetItem.sizeOptionPrice = sizePrice;
      targetItem.price = unitPrice * targetItem.quantity;

      // XÓA item cũ
      cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
    } else {
      // CẬP NHẬT item hiện tại
      itemToUpdate.sizeOption = newSize;
      itemToUpdate.sugarLevel = newSugar;
      itemToUpdate.iceOption = newIce;
      itemToUpdate.specialNotes = newNote;
      itemToUpdate.toppings = newToppings;
      itemToUpdate.quantity = newQuantity;
      itemToUpdate.sizeOptionPrice = sizePrice;
      itemToUpdate.price = unitPrice * newQuantity;
    }

    // Cập nhật tổng tiền giỏ hàng
    cart.totalAmount = await calculateTotal(cart);
    await cart.save();

    // Populate dữ liệu
    await cart.populate("items.productId", "name images sizeOptions price");
    await cart.populate("items.toppings.toppingId", "name extraPrice status");

    res.status(200).json({
      success: true,
      message: "Đã cập nhật cấu hình sản phẩm.",
      data: cart,
    });
  } catch (error) {
    console.error("Lỗi updateCartItem:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật cấu hình sản phẩm: " + error.message,
    });
  }
};

// ==========================================================
// Gom sản phẩm trùng
export const mergeDuplicateItems = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { storeId } = req.body;

    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu storeId." });

    const cart = await Cart.findOne({ userId, storeId, status: "active" });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giỏ hàng." });

    const merged = [];
    for (const item of cart.items) {
      const found = merged.find(
        (m) =>
          m.productId.toString() === item.productId.toString() &&
          m.sizeOption === item.sizeOption &&
          m.sugarLevel === item.sugarLevel &&
          m.iceOption === item.iceOption &&
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
    res.status(500).json({
      success: false,
      message: "Lỗi khi gộp sản phẩm: " + error.message,
    });
  }
};

// ==========================================================
//  Xóa 1 sản phẩm
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { itemId, storeId } = req.body;

    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu storeId." });

    const cart = await Cart.findOne({ userId, storeId, status: "active" });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giỏ hàng." });

    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
    cart.totalAmount = await calculateTotal(cart);
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng.",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa sản phẩm: " + error.message,
    });
  }
};

// ==========================================================
//  Xóa toàn bộ giỏ hàng
export const clearCart = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { storeId } = req.body;

    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu storeId." });

    const cart = await Cart.findOne({ userId, storeId, status: "active" });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giỏ hàng." });

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Đã xóa toàn bộ giỏ hàng.",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa giỏ hàng: " + error.message,
    });
  }
};
