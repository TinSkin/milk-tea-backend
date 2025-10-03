// import mongoose, { Schema } from "mongoose";

// const orderSchema = new Schema(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     products: [
//       {
//         product: {
//           type: Schema.Types.ObjectId,
//           ref: "Product",
//           required: true,
//         },
//         name: String,
//         quantity: { type: Number, required: true },
//         price: { type: Number, required: true },
//         size: String,
//         toppings: [String],
//       },
//     ],
//     totalPrice: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ["pending", "confirmed", "delivered", "cancelled"],
//       default: "pending",
//     },
//     address: {
//       type: String,
//       required: true,
//     },
//     phone: {
//       type: String,
//       required: true,
//     },
//     note: String,
//     paymentMethod: {
//       type: String,
//       enum: ["cash", "momo", "banking"],
//       default: "cash",
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.model("Order", orderSchema);

import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  size: {
    type: String, // size tách riêng (ví dụ: S, M, L, XL)
    default: "",
  },
  toppings: [
    {
      toppingId: { type: mongoose.Schema.Types.ObjectId, ref: "Topping" },
      name: String,
      price: Number
    }
  ],  
  image: {
    type: String,
    default: "",
  },
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  district: {
    type: String,
    required: true,
    trim: true,
  },
  ward: {
    type: String,
    required: true,
    trim: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerInfo: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["finding_driver", "picking_up", "delivering", "delivered", "cancelled"],
      default: "finding_driver",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "momo"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    shippingAddress: shippingAddressSchema,
    notes: {
      type: String,
      trim: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          trim: true,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    estimatedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Các chỉ mục để cải thiện hiệu suất truy vấn
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "customerInfo.email": 1 });

// Tạo số đơn hàng
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Tính số tiền cuối cùng
orderSchema.pre("save", function (next) {
  this.finalAmount = this.totalAmount + this.shippingFee - this.discountAmount;
  next();
});

// Thêm trạng thái vào lịch sử khi trạng thái thay đổi
orderSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`,
    });
  }
  next();
});

// Nếu model Order đã tồn tại trong cache thì dùng lại, nếu chưa thì tạo mới
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
