import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store.model.js';
import User from '../models/User.model.js';

dotenv.config();

const updateStoreManagers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        // Find real managers
        const managers = await User.find({ role: 'storeManager' });
        console.log(`Found ${managers.length} store managers`);

        // Update stores with real managers
        const updates = [
            { storeCode: 'HN01', managerEmail: 'manager.hn@milktea.com' },
            { storeCode: 'HCM01', managerEmail: 'manager.hcm@milktea.com' },
            { storeCode: 'DN01', managerEmail: 'manager.dn@milktea.com' }
        ];

        for (const update of updates) {
            const manager = await User.findOne({ email: update.managerEmail });
            if (manager) {
                await Store.updateOne(
                    { storeCode: update.storeCode },
                    { manager: manager._id }
                );
                console.log(`Updated ${update.storeCode} with manager ${manager.userName}`);
            } else {
                console.log(`Manager not found for ${update.storeCode}: ${update.managerEmail}`);
            }
        }

        // Remove dummy manager if exists
        const dummyManager = await User.findOne({ email: 'manager@milktea.com' });
        if (dummyManager) {
            await User.deleteOne({ email: 'manager@milktea.com' });
            console.log('Removed dummy manager');
        }

        console.log('Store managers updated successfully!');
        
    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await mongoose.connection.close();
    }
};

updateStoreManagers();