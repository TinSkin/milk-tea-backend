import mongoose from "mongoose";

const toppingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên topping là bắt buộc'],
        unique: true,
        trim: true,
        maxLength: [100, 'Tên topping không được quá 100 ký tự']
    },
    extraPrice: {
        type: Number,
        required: [true, 'Giá topping là bắt buộc'],
        min: [0, 'Giá topping không được âm']
    },
    description: {
        type: String,
        trim: true,
        maxLength: [200, 'Mô tả không được quá 200 ký tự']
    },
    status: {
        type: String,
        enum: ['available', 'unavailable'],
        default: 'available',
        required: true
    }
}, {
    timestamps: true
})

const Topping = mongoose.model('Topping', toppingSchema);

export default Topping;