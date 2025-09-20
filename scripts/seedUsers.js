import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.model.js';

dotenv.config();

//! Seed Users với store IDs thực tế
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
            // DUMMY MANAGER (for Store references)
            // =========================
            {
                userName: 'Store Manager',
                email: 'manager@milktea.com',
                password: 'Manager123!',
                phoneNumber: '0999999999',
                role: 'admin', // admin role to avoid assignedStoreId requirement
                provider: 'local',
                isVerified: true,
                status: 'active'
            },

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
            {
                userName: 'Đinh Thị Staff DN1',
                email: 'staff.dn1@milktea.com',
                password: 'Staff123!',
                phoneNumber: '0912345675',
                role: 'staff',
                provider: 'local',
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.DN01
            },
            {
                userName: 'Phan Văn Staff DN2',
                email: 'staff.dn2@milktea.com',
                password: 'Staff123!',
                phoneNumber: '0912345676',
                role: 'staff',
                provider: 'local',
                isVerified: true,
                status: 'active',
                assignedStoreId: storeIds.DN01
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

        console.log('Bắt đầu seeding Users...');

        // Kiểm tra và tạo từng user
        for (const userData of sampleUsers) {
            const existingUser = await User.findOne({ email: userData.email });
            
            if (existingUser) {
                console.log(`User ${userData.role} (${userData.email}) đã tồn tại - bỏ qua`);
                continue;
            }

            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcryptjs.hash(userData.password, saltRounds);
            
            // Create user
            const newUser = await User.create({
                ...userData,
                password: hashedPassword
            });

            console.log(`Đã tạo ${userData.role}: ${userData.userName} (${userData.email})`);
        }

        // Statistics
        const totalUsers = await User.countDocuments();
        const roleStats = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        console.log('\nUser:');
        console.log(`Total Users: ${totalUsers}`);
        roleStats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} users`);
        });

        console.log('\n User seeding completed successfully!');
        console.log('\n Default Passwords:');
        console.log('Admin: Admin123!');
        console.log('Manager: Manager123!');
        console.log('Staff: Staff123!');
        console.log('Customer: Customer123!');

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Đã đóng kết nối MongoDB');
        process.exit(0);
    }
};

// Run seeding
seedUsers();

export default seedUsers;