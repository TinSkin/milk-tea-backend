import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';

dotenv.config();

const clearUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        console.log('Bắt đầu xóa Users...');

        // Clear Users collection
        const result = await User.deleteMany({});
        console.log(`✅ Đã xóa ${result.deletedCount} Users`);

        console.log('🎉 Hoàn thành xóa Users!');
        
    } catch (error) {
        console.error('❌ Lỗi khi xóa Users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

clearUsers();