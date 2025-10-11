import mongoose, { Schema } from "mongoose";

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    storeId: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        toppings: [{
            toppingId: {
                type: Schema.Types.ObjectId,
                ref: 'Topping',
            }
        }],
        specialNotes: {
            type: String,
            maxLength: 200
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['active', 'ordered', 'abandoned'],
        default: 'active'
    },
    totalAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Tạo index để đảm bảo mỗi user chỉ có 1 giỏ hàng active trên 1 cửa hàng
cartSchema.index(
    { userId: 1, storeId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
  );
  

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
