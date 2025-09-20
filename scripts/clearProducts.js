import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.model.js';
import Topping from '../models/Topping.model.js';
import Product from '../models/Product.model.js';

dotenv.config();

const clearProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        console.log('Bắt đầu xóa data...');

        // Clear collections
        await Product.deleteMany({});
        console.log('Đã xóa tất cả Products');

        await Category.deleteMany({});
        console.log('Đã xóa tất cả Categories');

        await Topping.deleteMany({});
        console.log('Đã xóa tất cả Toppings');

        console.log('Hoàn thành xóa data!');
        
    } catch (error) {
        console.error('Lỗi khi xóa data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

clearProducts();