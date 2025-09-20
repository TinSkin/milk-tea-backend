import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.model.js';

dotenv.config();

//! Seed Users với store IDs thực tế và nhiều customers
const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        // Store IDs thực tế từ MongoDB
        const storeIds = {
            HN01: "68ce8bbba097920e323d271c",  // Hà Nội Central
            HCM01: "68ce8bbba097920e323d2720", // TP.HCM Nguyễn Văn Cừ  
            DN01: "68ce8bbba097920e323d2724"   // Đà Nẵng Beach
        };

        // Sample users với nhiều customers
        const sampleUsers = [
            // =========================
            // ADMIN
            // =========================
            {
                userName: 'Super Admin',
                email: 'admin@milktea.com',
                password: 'Admin123!',
                phoneNumber: '0123456789',
                role: 'admin',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },

            // =========================
            // STORE MANAGERS 
            // =========================
            {
                userName: 'Nguyễn Văn Manager HN',
                email: 'manager.hn@milktea.com', 
                password: 'Manager123!',
                phoneNumber: '0987654321',
                role: 'storeManager',
                provider: 'local',
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.HN01
            },
            {
                userName: 'Trần Thị Manager HCM',
                email: 'manager.hcm@milktea.com',
                password: 'Manager123!', 
                phoneNumber: '0987654322',
                role: 'storeManager',
                provider: 'local',
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.HCM01
            },
            {
                userName: 'Lê Văn Manager DN',
                email: 'manager.dn@milktea.com',
                password: 'Manager123!',
                phoneNumber: '0987654323', 
                role: 'storeManager',
                provider: 'local',
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.DN01
            },

            // =========================
            // STAFF
            // =========================
            {
                userName: 'Phạm Thị Staff HN1',
                email: 'staff.hn1@milktea.com',
                password: 'Staff123!',
                phoneNumber: '0912345671',
                role: 'staff',
                provider: 'local', 
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.HN01
            },
            {
                userName: 'Hoàng Văn Staff HN2',
                email: 'staff.hn2@milktea.com',
                password: 'Staff123!',
                phoneNumber: '0912345672',
                role: 'staff',
                provider: 'local',
                isVerified: true, 
                status: 'active',
                assignedStoreId: storeIds.HN01
            },
            {
                userName: 'Vũ Thị Staff HCM1',
                email: 'staff.hcm1@milktea.com',
                password: 'Staff123!',
                phoneNumber: '0912345673',
                role: 'staff',
                provider: 'local',
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.HCM01
            },
            {
                userName: 'Đỗ Văn Staff HCM2',
                email: 'staff.hcm2@milktea.com',
                password: 'Staff123!', 
                phoneNumber: '0912345674',
                role: 'staff',
                provider: 'local',
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.HCM01
            },

            // =========================
            // CUSTOMERS
            // =========================
            {
                userName: 'Nguyễn Minh Khang',
                email: 'khang.nguyen@gmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234567',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Trần Thúy Linh',
                email: 'linh.tran@gmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234568',
                role: 'customer', 
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Lê Đức Anh',
                email: 'anh.le@yahoo.com',
                password: 'Customer123!',
                phoneNumber: '0901234569',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Phạm Thu Hương',
                email: 'huong.pham@hotmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234570',
                role: 'customer',
                provider: 'local', 
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Vũ Quang Minh',
                email: 'minh.vu@outlook.com',
                password: 'Customer123!',
                phoneNumber: '0901234571',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Hoàng Thị Mai',
                email: 'mai.hoang@gmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234572',
                role: 'customer',
                provider: 'local',
                isVerified: true, 
                status: 'active'
            },
            {
                userName: 'Đặng Văn Tuấn',
                email: 'tuan.dang@gmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234573',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Bùi Thị Hoa',
                email: 'hoa.bui@yahoo.com',
                password: 'Customer123!',
                phoneNumber: '0901234574',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Ngô Đình Khôi',
                email: 'khoi.ngo@gmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234575',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Lý Thị Lan',
                email: 'lan.ly@hotmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234576',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Trịnh Văn Hải',
                email: 'hai.trinh@outlook.com',
                password: 'Customer123!',
                phoneNumber: '0901234577',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Võ Thị Nga',
                email: 'nga.vo@gmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234578',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Dương Quang Huy',
                email: 'huy.duong@yahoo.com',
                password: 'Customer123!',
                phoneNumber: '0901234579',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Cao Thị Thảo',
                email: 'thao.cao@gmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234580',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            },
            {
                userName: 'Phan Văn Long',
                email: 'long.phan@hotmail.com',
                password: 'Customer123!',
                phoneNumber: '0901234581',
                role: 'customer',
                provider: 'local',
                isVerified: true,
                status: 'active'
            }
        ];

        // Check if users already exist
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log(`Đã có ${userCount} users trong database. Xóa trước khi seed!`);
            return;
        }

        console.log('Bắt đầu seeding Users...');

        // Hash passwords và tạo users
        const usersToCreate = [];
        for (const userData of sampleUsers) {
            const hashedPassword = await bcryptjs.hash(userData.password, 12);
            usersToCreate.push({
                ...userData,
                password: hashedPassword,
                lastLogin: new Date()
            });
        }

        // Insert users vào database
        const createdUsers = await User.insertMany(usersToCreate);

        console.log('Seeding Users thành công!');
        console.log(`Tổng số users: ${createdUsers.length}`);
        
        // Log summary
        const summary = {};
        createdUsers.forEach(user => {
            summary[user.role] = (summary[user.role] || 0) + 1;
        });
        
        console.log('📈 Thống kê theo role:');
        Object.entries(summary).forEach(([role, count]) => {
            console.log(`${role}: ${count} users`);
        });

        console.log('\nLogin credentials:');
        console.log('Admin: admin@milktea.com / Admin123!');
        console.log('Manager HN: manager.hn@milktea.com / Manager123!');
        console.log('Manager HCM: manager.hcm@milktea.com / Manager123!');
        console.log('Manager DN: manager.dn@milktea.com / Manager123!');
        console.log('Staff: staff.hn1@milktea.com / Staff123!');
        console.log('Customer: khang.nguyen@gmail.com / Customer123!');

    } catch (error) {
        console.error('User seeding failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

seedUsers();