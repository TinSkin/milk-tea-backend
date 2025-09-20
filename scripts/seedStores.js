import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store.model.js';

dotenv.config();

const seedStores = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        // Real User IDs from MongoDB (Updated after re-seeding)
        const userIds = {
            managerHN: "68ce9ab141a2c3f0ec862ab5",   // Nguyễn Văn Manager HN
            managerHCM: "68ce9ab241a2c3f0ec862ab8",  // Trần Thị Manager HCM
            managerDN: "68ce9ab241a2c3f0ec862abb",   // Lê Văn Manager DN
            staffHN1: "68ce9ab241a2c3f0ec862abe",    // Phạm Thị Staff HN1
            staffHN2: "68ce9ab341a2c3f0ec862ac1",    // Hoàng Văn Staff HN2
            staffHCM1: "68ce9ab341a2c3f0ec862ac4",   // Vũ Thị Staff HCM1
            staffHCM2: "68ce9ab441a2c3f0ec862ac7",   // Đỗ Văn Staff HCM2
            staffDN1: "68ce9ab441a2c3f0ec862aca",    // Đinh Thị Staff DN1
            staffDN2: "68ce9ab441a2c3f0ec862acd"     // Phan Văn Staff DN2
        };

        // Real Product IDs from MongoDB
        const productIds = [
            "68ce8e7ad1a75134a0bc221a",
            "68ce8e7ad1a75134a0bc221b",
            "68ce8e7ad1a75134a0bc221c",
            "68ce8e7ad1a75134a0bc221d",
            "68ce8e7ad1a75134a0bc221e",
            "68ce8e7ad1a75134a0bc2220",
            "68ce8e7ad1a75134a0bc2221",
            "68ce8e7ad1a75134a0bc2222",
            "68ce8e7ad1a75134a0bc2223",
            "68ce8e7ad1a75134a0bc2224"
        ];

        // Shuffle products
        const shuffled = [...productIds].sort(() => Math.random() - 0.5);
        const perStore = Math.ceil(shuffled.length / 3);

        const stores = [
            {
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
                products: shuffled.slice(0, perStore),
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
                products: shuffled.slice(perStore, perStore * 2),
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
                products: shuffled.slice(perStore * 2),
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

        console.log('Seeding stores...');
        
        for (const storeData of stores) {
            const existing = await Store.findOne({ storeCode: storeData.storeCode });
            
            if (!existing) {
                const store = await Store.create(storeData);
                console.log(`Created: ${store.storeName}`);
                console.log(`Manager: ${store.manager}`);
                console.log(`Staff: ${store.staff.length}`);
                console.log(`Products: ${store.products.length}`);
            } else {
                console.log(`Exists: ${existing.storeName}`);
            }
        }

        const total = await Store.countDocuments();
        console.log(`\nTotal stores: ${total}`);
        console.log('Seeding completed!');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

seedStores();