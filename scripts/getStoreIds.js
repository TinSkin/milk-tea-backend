import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store.model.js';

dotenv.config();

const getStoreIds = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        const stores = await Store.find({}, 'storeName storeCode _id').sort({ storeCode: 1 });
        
        console.log('=== STORE IDS ===');
        stores.forEach(store => {
            console.log(`${store.storeName} (${store.storeCode}): ${store._id}`);
        });
        
        console.log('\n=== COPY THESE IDS FOR SEED SCRIPT ===');
        console.log('const storeIds = {');
        stores.forEach(store => {
            console.log(`  ${store.storeCode}: "${store._id}",`);
        });
        console.log('};');
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

getStoreIds();