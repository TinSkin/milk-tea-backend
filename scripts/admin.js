import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 MongoDB connected');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@milktea.com' });

        if (existingAdmin) {
            console.log('⚠️ Admin already exists');
            process.exit(0);
        }

        // Hash password manually (vì User model có thể chưa có pre-save hook)
        const hashedPassword = await bcrypt.hash('Admin123!', 12);

        // Create admin user
        const adminUser = new User({
            userName: 'Administrator',
            phoneNumber: '0123456789',
            email: 'admin@admin.com',
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
            lastLogin: new Date(),
            status: 'active',
        });

        await adminUser.save();
        console.log('Admin user created successfully');
        console.log('Email: admin@admin.com');
        console.log('Password: Admin123!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();