import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import User from '../models/User.model.js';

dotenv.config();

const createSampleUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 MongoDB connected');

        // Clear existing users (except admin)
        await User.deleteMany({ email: { $ne: 'admin@admin.com' } });

        // Sample users data
        const sampleUsers = [
            {
                userName: 'John Doe',
                phoneNumber: '0912345678',
                email: 'john@example.com',
                password: 'User123!',
                role: 'user',
                status: 'active',
                isVerified: true
            },
            {
                userName: 'Jane Smith',
                phoneNumber: '0987654321',
                email: 'jane@example.com',
                password: 'User123!',
                role: 'user',
                status: 'active',
                isVerified: true
            },
            {
                userName: 'Bob Manager',
                phoneNumber: '0923456789',
                email: 'bob@example.com',
                password: 'Manager123!',
                role: 'manager',
                status: 'active',
                isVerified: true
            },
            {
                userName: 'Alice User',
                phoneNumber: '0934567890',
                email: 'alice@example.com',
                password: 'User123!',
                role: 'user',
                status: 'inactive',
                isVerified: false
            },
            {
                userName: 'Charlie Test',
                phoneNumber: '0945678901',
                email: 'charlie@example.com',
                password: 'User123!',
                role: 'user',
                status: 'active',
                isVerified: true
            }
        ];

        // Create users
        for (const userData of sampleUsers) {
            const hashedPassword = await bcryptjs.hash(userData.password, 12);

            const user = new User({
                ...userData,
                password: hashedPassword,
                lastLogin: new Date()
            });

            await user.save();
            console.log(`✅ Created user: ${userData.email}`);
        }

        console.log('🎉 Sample users created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating sample users:', error);
        process.exit(1);
    }
};

createSampleUsers();