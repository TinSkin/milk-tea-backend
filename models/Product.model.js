import mongoose, { Schema } from "mongoose";

const sizeOptionSchema = new Schema({
    size: {
        type: String,
        required: true,
        enum: ['S', 'M', 'L'],
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Giá không được âm']
    }
}, { _id: false });

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: [100, 'Tên sản phẩm không được quá 100 ký tự'] 
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: [500, 'Mô tả không được quá 500 ký tự']
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    images: [{
        type: String,
        trim: true
    }],
    sizeOptions: [sizeOptionSchema],
    status: {
        type: String,
        enum: ['available', 'unavailable', 'out_of_stock'],
        default: 'available',
    },
    currency: {
        type: String,
        default: 'VNĐ'
    },
    price: {
        type: Number,
        required: true
    },
    toppings: [{
        type: Schema.Types.ObjectId,
        ref: "Topping"
    }],

    //! SEO
    metaTitle: {
        type: String,
        maxLength: [60, 'Meta title không được quá 60 ký tự']
    },

    metaDescription: {
        type: String,
        maxLength: [160, 'Meta description không được quá 160 ký tự']
    },

    //! Statistics
    soldCount: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    }, // %

    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin' // Giả sử bạn có schema Admin/User
    }

}, {
    timestamps: true
})

const Product = mongoose.model('Product', productSchema);

export default Product;