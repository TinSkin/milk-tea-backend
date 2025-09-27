import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store.model.js';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js'; // ✅ Thêm import này!

dotenv.config();

const seedStores = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        // ✅ Force register models - ensure Mongoose knows about them
        console.log('📝 Registering models...');
        console.log(`- Product model: ${Product.modelName}`);
        console.log(`- Category model: ${Category.modelName}`); 
        console.log(`- Store model: ${Store.modelName}`);

        // Kiểm tra dữ liệu categories và products có tồn tại không
        const productCount = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();
        console.log(`📊 Products in DB: ${productCount}`);
        console.log(`📊 Categories in DB: ${categoryCount}`);

        if (productCount === 0) {
            console.log('❌ Không có products trong database! Hãy seed products trước.');
            return;
        }

        if (categoryCount === 0) {
            console.log('❌ Không có categories trong database! Hãy seed categories trước.');
            return;
        }

        console.log('✅ Dữ liệu sẵn sàng, bắt đầu seed stores...');

        // ID người dùng thật từ MongoDB (Cập nhật sau khi re-seed)
        const userIds = {
            managerHN: "68ce9ab141a2c3f0ec862ab5",   // Nguyễn Văn Quản lý HN
            managerHCM: "68ce9ab241a2c3f0ec862ab8",  // Trần Thị Quản lý HCM
            managerDN: "68ce9ab241a2c3f0ec862abb",   // Lê Văn Quản lý ĐN
            staffHN1: "68ce9ab241a2c3f0ec862abe",    // Phạm Thị Nhân viên HN1
            staffHN2: "68ce9ab341a2c3f0ec862ac1",    // Hoàng Văn Nhân viên HN2
            staffHCM1: "68ce9ab341a2c3f0ec862ac4",   // Vũ Thị Nhân viên HCM1
            staffHCM2: "68ce9ab441a2c3f0ec862ac7",   // Đỗ Văn Nhân viên HCM2
            staffDN1: "68ce9ab441a2c3f0ec862aca",    // Đinh Thị Nhân viên ĐN1
            staffDN2: "68ce9ab441a2c3f0ec862acd"     // Phan Văn Nhân viên ĐN2
        };

        // ID sản phẩm thật từ MongoDB
        const productIds = [
            "68ce8e7ad1a75134a0bc221a",
            "68ce8e7ad1a75134a0bc221b",
            "68ce8e7ad1a75134a0bc221d",
            "68ce8e7ad1a75134a0bc221e",
            "68ce8e7ad1a75134a0bc2220",
            "68ce8e7ad1a75134a0bc2221",
            "68ce8e7ad1a75134a0bc2222",
            "68ce8e7ad1a75134a0bc2223",
            "68ce8e7ad1a75134a0bc2224"
        ];

        // Trộn ngẫu nhiên sản phẩm
        const shuffled = [...productIds].sort(() => Math.random() - 0.5);
        const perStore = Math.ceil(shuffled.length / 3);

        const stores = [
            {
                _id: "68ce9b7d4b02c0d532670d20",
                storeName: 'Milk Tea Hà Nội Central',
                storeCode: 'HN01',
                address: {
                    street: '123 Nguyễn Huệ',
                    district: 'Hoàn Kiếm',
                    city: 'Hà Nội',
                    zipCode: '10000'
                },
                phone: '024-123-4567',
                email: 'hanoi@milktea.com',
                manager: userIds.managerHN,
                staff: [userIds.staffHN1, userIds.staffHN2],
                products: shuffled.slice(0, perStore * 3),
                operatingHours: {
                    monday: { open: '08:00', close: '22:00' },
                    tuesday: { open: '08:00', close: '22:00' },
                    wednesday: { open: '08:00', close: '22:00' },
                    thursday: { open: '08:00', close: '22:00' },
                    friday: { open: '08:00', close: '23:00' },
                    saturday: { open: '08:00', close: '23:00' },
                    sunday: { open: '09:00', close: '22:00' }
                },
                capacity: 60,
                monthlyTarget: 50000000
            },
            {
                _id: "68ce9b7d4b02c0d532670d21", 
                storeName: 'Milk Tea TP.HCM Nguyễn Văn Cừ',
                storeCode: 'HCM01',
                address: {
                    street: '456 Nguyễn Văn Cừ',
                    district: 'Quận 1',
                    city: 'TP.Hồ Chí Minh',
                    zipCode: '70000'
                },
                phone: '028-987-6543',
                email: 'hcm@milktea.com',
                manager: userIds.managerHCM,
                staff: [userIds.staffHCM1, userIds.staffHCM2],
                products: shuffled.slice(perStore, perStore * 3),
                operatingHours: {
                    monday: { open: '08:00', close: '22:00' },
                    tuesday: { open: '08:00', close: '22:00' },
                    wednesday: { open: '08:00', close: '22:00' },
                    thursday: { open: '08:00', close: '22:00' },
                    friday: { open: '08:00', close: '23:00' },
                    saturday: { open: '08:00', close: '23:00' },
                    sunday: { open: '09:00', close: '22:00' }
                },
                capacity: 80,
                monthlyTarget: 60000000
            },
            {
                _id: "68ce9b7d4b02c0d532670d22", 
                storeName: 'Milk Tea Đà Nẵng Beach',
                storeCode: 'DN01',
                address: {
                    street: '789 Võ Văn Kiệt',
                    district: 'Hải Châu',
                    city: 'Đà Nẵng',
                    zipCode: '55000'
                },
                phone: '0236-555-7890',
                email: 'danang@milktea.com',
                manager: userIds.managerDN,
                staff: [userIds.staffDN1, userIds.staffDN2],
                products: shuffled.slice(perStore, perStore * 3),
                operatingHours: {
                    monday: { open: '08:00', close: '22:00' },
                    tuesday: { open: '08:00', close: '22:00' },
                    wednesday: { open: '08:00', close: '22:00' },
                    thursday: { open: '08:00', close: '22:00' },
                    friday: { open: '08:00', close: '23:00' },
                    saturday: { open: '08:00', close: '23:00' },
                    sunday: { open: '09:00', close: '22:00' }
                },
                capacity: 50,
                monthlyTarget: 40000000
            }
        ];

        console.log('Đang seed dữ liệu cho cửa hàng...');
        
        for (const storeData of stores) {
            const existing = await Store.findOne({ storeCode: storeData.storeCode });
            
            if (!existing) {
                // ✅ Safer approach: Get products first, then get categories separately  
                const storeProducts = await Product.find({
                    _id: { $in: storeData.products }
                }).select('name category');
                
                if (storeProducts.length === 0) {
                    console.log(`⚠️  Không tìm thấy products cho store: ${storeData.storeName}`);
                    continue;
                }

                // Get unique category IDs from products
                const categoryIds = [...new Set(
                    storeProducts
                        .filter(product => product.category) 
                        .map(product => product.category.toString())
                )];

                // Get category names for logging
                const categoryNames = [];
                if (categoryIds.length > 0) {
                    const categories = await Category.find({
                        _id: { $in: categoryIds }
                    }).select('name');
                    categoryNames.push(...categories.map(cat => cat.name));
                }
                
                console.log(`\n📦 Cửa hàng: ${storeData.storeName}`);
                console.log(`🛍️  Sản phẩm: ${storeData.products.length} sản phẩm`);
                console.log(`📂 Danh mục: ${categoryIds.length} loại`);
                console.log(`📋 Tên danh mục: ${categoryNames.join(', ')}`);
                
                // Thêm danh mục vào storeData
                const finalStoreData = {
                    ...storeData,
                    categories: categoryIds
                };
                
                const store = await Store.create(finalStoreData);
                console.log(`✅ Đã tạo: ${store.storeName}`);
                console.log(`👤 Quản lý: ${store.manager}`);
                console.log(`👥 Nhân viên: ${store.staff.length}`);
                console.log(`🛍️  Sản phẩm: ${store.products.length}`);
                console.log(`📂 Danh mục: ${store.categories.length}`);
            } else {
                console.log(`⚠️  Đã tồn tại: ${existing.storeName}`);
                
                // Cập nhật danh mục cho cửa hàng đã tồn tại nếu chưa có
                if (!existing.categories || existing.categories.length === 0) {
                    console.log(`🔄 Đang cập nhật danh mục cho cửa hàng đã có...`);
                    
                    // ✅ Safe approach without populate
                    const storeProducts = await Product.find({
                        _id: { $in: existing.products }
                    }).select('category');
                    
                    const categoryIds = [...new Set(
                        storeProducts
                            .filter(product => product.category)
                            .map(product => product.category.toString())
                    )];
                    
                    await Store.findByIdAndUpdate(existing._id, {
                        categories: categoryIds
                    });
                    
                    console.log(`✅ Đã cập nhật ${existing.storeName} với ${categoryIds.length} danh mục`);
                }
            }
        }

        const total = await Store.countDocuments();
        console.log(`\nTổng số cửa hàng: ${total}`);
        console.log('Hoàn tất seed dữ liệu!');
        
    } catch (error) {
        console.error('Lỗi:', error);
    } finally {
        await mongoose.connection.close();
    }
};

seedStores();
