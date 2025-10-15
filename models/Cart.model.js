import mongoose, { Schema } from "mongoose";

const cartItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  sizeOption: {
    type: String,
    enum: ["S", "M", "L"],
    default: "M",
  },
  sizeOptionPrice: {
    type: Number,
    default: 0,
  },
  sugarLevel: {
    type: String,
    enum: ["25%", "50%", "75%", "100%"],
    default: "100%",
  },
  iceOption: {
    type: String,
    enum: ["Chung", "Riêng"],
    default: "Chung",
  },
  toppings: [
    {
      toppingId: {
        type: Schema.Types.ObjectId,
        ref: "Topping",
        required: true,
      },
    },
  ],  
    
  specialNotes: {
    type: String,
    trim: true,
    maxLength: 200,
  },
  price: {
    type: Number,
    default: 0,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "ordered", "abandoned"],
      default: "active",
    },
  },
  { timestamps: true }
);

// ✅ Tính tổng tiền trước khi lưu
cartSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce((total, item) => {
    const toppingTotal = (item.toppings || []).reduce(
      (s, t) => s + (t.extraPrice || 0),
      0
    );
    const subtotal =
      (item.price + item.sizeOptionPrice + toppingTotal) * item.quantity;
    return total + subtotal;
  }, 0);
  next();
});

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;
