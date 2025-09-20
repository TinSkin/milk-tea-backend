import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
    storeName: {
        type: String,
        required: true,
        trim: true
    },
    storeCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true // VD: "HN01", "HCM02"
    },
    address: {
        street: { type: String, required: true },
        district: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String }
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    
    // Store Management
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to User with role 'storeManager'
        required: true
    },
    
    staff: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // References to Users with role 'staff'
    }],
    
    // Store Products
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product' // References to Products available at this store
    }],
    
    // Store Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'under_construction', 'closed'],
        default: 'active'
    },
    
    // Operating Hours
    operatingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    
    // Business Metrics
    capacity: {
        type: Number,
        default: 50 // Number of customers store can serve
    },
    
    monthlyTarget: {
        type: Number,
        default: 0 // Monthly sales target
    }
}, {
    timestamps: true
});

// Indexes for better performance - storeCode already has unique index above
// storeSchema.index({ storeCode: 1 }); // Remove duplicate index

const Store = mongoose.model('Store', storeSchema);

export default Store;