import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxLength: [50, 'Tên danh mục không được quá 50 ký tự']
    },
    description: {
        type: String,
        trim: true,
        maxLength: [200, 'Mô tả không được quá 200 ký tự']
    },
    status: {
        type: String,
        enum: ['available', 'paused', 'unavailable'],
        default: 'available',
        required: true
    }                                                             
}, {
    timestamps: true
})

const Category = mongoose.model('Category', categorySchema);

export default Category;