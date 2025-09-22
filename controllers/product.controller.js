import Product from "../models/Product.model.js";
import Category from "../models/Category.model.js";
import Topping from "../models/Topping.model.js";

//! Get all products with pagination
export const getAllProducts = async (req, res) => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Extract filter parameters
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const category = req.query.category || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Build filter object based on query paramenters
    let filter = {};

    // Search filter (name or description)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // Status filter
    if (status !== "all") {
      filter.status = status;
    }

    // Category filter
    if (category !== "all") {
      filter.category = category;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    // Get total count and products with populated fields
    const totalProducts = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('toppings', 'name extraPrice')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Calculate pagination info
    const totalPages = Math.ceil(totalProducts / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching products"
    });
  }
};

//! Create product
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      images,
      sizeOptions,
      status,
      price,
      toppings,
      metaTitle,
      metaDescription,
      discount
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !price) {
      return res.status(400).json({
        success: false,
        message: "Name, description, category and price are required"
      });
    }

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category not found"
      });
    }

    // Validate toppings exist (if provided)
    if (toppings && toppings.length > 0) {
      const toppingsExist = await Topping.find({ _id: { $in: toppings } });
      if (toppingsExist.length !== toppings.length) {
        return res.status(400).json({
          success: false,
          message: "One or more toppings not found"
        });
      }
    }

    // Check if product already exists and is available
    const existingAvailableProduct = await Product.findOne({
      name: name.trim(),
      status: 'available'
    });

    if (existingAvailableProduct) {
      return res.status(400).json({
        success: false,
        message: "An active product with this name already exists"
      });
    }

    // Create new product
    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      category,
      images: images || [],
      sizeOptions: sizeOptions || [],
      status: status || 'available',
      price: parseFloat(price),
      toppings: toppings || [],
      metaTitle: metaTitle?.trim() || "",
      metaDescription: metaDescription?.trim() || "",
      discount: discount || 0,
      updatedBy: req.userId // From auth middleware
    });

    await product.save();

    // Populate for response
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('toppings', 'name extraPrice');

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: populatedProduct
    });
  } catch (error) {
    console.error("Error in createProduct:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

//! Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      images,
      sizeOptions,
      status,
      price,
      toppings,
      metaTitle,
      metaDescription,
      discount
    } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Check if name already exists (exclude current product)
    if (name && name.trim() !== product.name) {
      const existingProduct = await Product.findOne({
        name: name.trim(),
        status: 'available',
        _id: { $ne: id }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this name already exists"
        });
      }
    }

    // Validate category exists (if provided)
    if (category && category !== product.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Category not found"
        });
      }
    }

    // Validate toppings exist (if provided)
    if (toppings && toppings.length > 0) {
      const toppingsExist = await Topping.find({ _id: { $in: toppings } });
      if (toppingsExist.length !== toppings.length) {
        return res.status(400).json({
          success: false,
          message: "One or more toppings not found"
        });
      }
    }

    // Update fields
    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (category !== undefined) product.category = category;
    if (images !== undefined) product.images = images;
    if (sizeOptions !== undefined) product.sizeOptions = sizeOptions;
    if (status !== undefined) product.status = status;
    if (price !== undefined) product.price = parseFloat(price);
    if (toppings !== undefined) product.toppings = toppings;
    if (metaTitle !== undefined) product.metaTitle = metaTitle.trim();
    if (metaDescription !== undefined) product.metaDescription = metaDescription.trim();
    if (discount !== undefined) product.discount = discount;

    product.updatedBy = req.userId;

    await product.save();

    // Populate for response
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('toppings', 'name extraPrice');

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: populatedProduct
    });
  } catch (error) {
    console.error("Error in updateProduct:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

//! Soft delete product 
export const softDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Toggle status
    product.status = product.status === 'available' ? 'unavailable' : 'available';
    product.updatedBy = req.userId;
    await product.save();

    // Populate for response
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('toppings', 'name extraPrice');

    res.status(200).json({
      success: true,
      message: `Product ${product.status === 'available' ? 'activated' : 'deactivated'} successfully`,
      product: populatedProduct
    });
  } catch (error) {
    console.error("Error in softDeleteProduct:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

//! Get categories and toppings for form dropdowns
export const getProductFormData = async (req, res) => {
  try {
    const [categories, toppings] = await Promise.all([
      Category.find({ status: 'available' }).select('name'),
      Topping.find({ status: 'available' }).select('name extraPrice')
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories,
        toppings
      }
    });
  } catch (error) {
    console.error("Error in getProductFormData:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// //! Get single product by ID
// export const getProductById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const product = await Product.findById(id).populate('category');

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found"
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: product
//     });

//   } catch (error) {
//     console.error("Error in getProductById:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

