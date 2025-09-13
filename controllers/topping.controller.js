import Topping from '../models/Topping.model.js';

//! Get all toppings (Admin only)
export const getAllToppings = async (req, res) => {
    try {
        // Extract pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Extract filter parameters
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // Build filter object
        let filter = {};

        // Search filter (name)
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        // Status filter
        if (status !== "all") {
            filter.status = status;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder;

        // Get total count and toppings
        const totalToppings = await Topping.countDocuments(filter);
        const toppings = await Topping.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
        const totalPages = Math.ceil(totalToppings / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            success: true,
            toppings,
            pagination: {
                currentPage: page,
                totalPages,
                totalToppings,
                limit,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error("Error in getAllToppings:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Create topping
export const createTopping = async (req, res) => {
    try {
        const { name, extraPrice, description, status } = req.body;

        // Validate required fields
        if (!name || extraPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Name and extra price are required"
            });
        }

        // Check if topping already exists and is available
        const existingTopping = await Topping.findOne({
            name: name.trim(),
            status: 'available'
        });

        if (existingTopping) {
            return res.status(400).json({
                success: false,
                message: "Topping with this name already exists and is available"
            });
        }

        // Create new topping
        const topping = new Topping({
            name: name.trim(),
            extraPrice: parseFloat(extraPrice),
            description: description?.trim() || "",
            status: status || 'available'
        });

        await topping.save();

        res.status(201).json({
            success: true,
            message: "Topping created successfully",
            topping
        });
    } catch (error) {
        console.error("=== CREATE TOPPING ERROR ===");
        console.error("Error:", error);
        console.error("Stack:", error.stack);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Update topping
export const updateTopping = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, extraPrice, description, status } = req.body;

        const topping = await Topping.findById(id);

        if (!topping) {
            return res.status(404).json({
                success: false,
                message: "Topping not found"
            });
        }

        // Check if name already exists (exclude current topping)
        if (name && name.trim() !== topping.name) {
            const existingTopping = await Topping.findOne({
                name: name.trim(),
                status: 'available',
                _id: { $ne: id }
            });

            if (existingTopping) {
                return res.status(400).json({
                    success: false,
                    message: "Topping with this name already exists"
                });
            }
        }

        // Update fields
        if (name) topping.name = name.trim();
        if (extraPrice !== undefined) topping.extraPrice = parseFloat(extraPrice);
        if (description !== undefined) topping.description = description.trim();
        if (status) topping.status = status;

        await topping.save();

        res.status(200).json({
            success: true,
            message: "Topping updated successfully",
            topping
        });
    } catch (error) {
        console.error("Error in updateTopping:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

//! Soft delete topping (toggle status)
export const softDeleteTopping = async (req, res) => {
    try {
        const { id } = req.params;

        const topping = await Topping.findById(id);

        if (!topping) {
            return res.status(404).json({
                success: false,
                message: "Topping not found"
            });
        }

        // Toggle status
        topping.status = topping.status === 'available' ? 'unavailable' : 'available';
        await topping.save();

        res.status(200).json({
            success: true,
            message: `Topping ${topping.status === 'available' ? 'activated' : 'deactivated'} successfully`,
            topping
        });
    } catch (error) {
        console.error("Error in softDeleteTopping:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

