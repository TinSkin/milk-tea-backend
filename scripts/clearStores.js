import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store.model.js';

dotenv.config();

const clearStores = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔗 Đã kết nối MongoDB');

        // Đếm stores trước khi xóa
        const countBefore = await Store.countDocuments();
        console.log(`📊 Hiện tại có: ${countBefore} stores trong database`);

        if (countBefore === 0) {
            console.log(' Collection Store đã trống rồi!');
            return;
        }

        // List all stores trước khi xóa
        const stores = await Store.find({})
            .select('storeName storeCode address.city')
            .sort({ storeCode: 1 });
        
        console.log('\n🏪 Stores sẽ bị xóa:');
        stores.forEach(store => {
            console.log(`- ${store.storeName} (${store.storeCode}) - ${store.address.city}`);
        });

        // Xác nhận xóa
        console.log('\n⚠️  CẢNH BÁO: Sắp xóa tất cả stores!');
        
        // Xóa tất cả stores
        const deleteResult = await Store.deleteMany({});
        console.log(`🗑️  Đã xóa: ${deleteResult.deletedCount} stores`);

        // Verify deletion
        const countAfter = await Store.countDocuments();
        console.log(`📊 Còn lại: ${countAfter} stores`);

        if (countAfter === 0) {
            console.log(' Collection Store đã được clear hoàn toàn!');
        } else {
            console.log('⚠️  Vẫn còn stores chưa được xóa!');
        }

    } catch (error) {
        console.error(' Lỗi khi clear stores:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Đã đóng kết nối MongoDB');
    }
};

clearStores();