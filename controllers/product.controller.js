import Product from "../models/Product.model.js";
import Category from "../models/Category.model.js";
import Topping from "../models/Topping.model.js";

//! Lấy tất cả sản phẩm kèm phân trang
export const getAllProducts = async (req, res) => {
  try {
    // Lấy tham số phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Lấy tham số lọc và sắp xếp
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const category = req.query.category || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Tạo đối tượng filter dựa trên query parameters
    let filter = {};

    // Lọc theo tìm kiếm (tên hoặc mô tả)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // Lọc theo trạng thái
    if (status !== "all") {
      filter.status = status;
    }

    // Lọc theo danh mục
    if (category !== "all") {
      filter.category = category;
    }

    // Tạo đối tượng sắp xếp
    const sort = {};
    sort[sortBy] = sortOrder;

    // Lấy tổng số và danh sách sản phẩm (kèm populate)
    const totalProducts = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('toppings', 'name extraPrice')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Tính toán thông tin phân trang
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
      message: "Internal server error fetching products",
      error: error.message
    });
  }
};

//! Tạo sản phẩm
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

    // Kiểm tra các trường bắt buộc
    if (!name || !description || !category || !price) {
      return res.status(400).json({
        success: false,
        message: "Name, description, category and price are required"
      });
    }

    // Kiểm tra danh mục tồn tại
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category not found"
      });
    }

    // Kiểm tra topping tồn tại (nếu có)
    if (toppings && toppings.length > 0) {
      const toppingsExist = await Topping.find({ _id: { $in: toppings } });
      if (toppingsExist.length !== toppings.length) {
        return res.status(400).json({
          success: false,
          message: "One or more toppings not found"
        });
      }
    }

    // Kiểm tra sản phẩm cùng tên và đang khả dụng đã tồn tại hay chưa
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

    // Tạo sản phẩm mới
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
      updatedBy: req.userId // Lấy từ middleware xác thực
    });

    await product.save();

    // Populate dữ liệu để trả về
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

//! Cập nhật sản phẩm
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

    // Kiểm tra tên đã tồn tại (loại trừ chính sản phẩm hiện tại)
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

    // Kiểm tra danh mục tồn tại (nếu có truyền vào)
    if (category && category !== product.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Category not found"
        });
      }
    }

    // Kiểm tra topping tồn tại (nếu có)
    if (toppings && toppings.length > 0) {
      const toppingsExist = await Topping.find({ _id: { $in: toppings } });
      if (toppingsExist.length !== toppings.length) {
        return res.status(400).json({
          success: false,
          message: "One or more toppings not found"
        });
      }
    }

    // Cập nhật các trường
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

    // Populate dữ liệu để trả về
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

//! Xóa mềm sản phẩm
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

    // Chuyển đổi trạng thái
    product.status = product.status === 'available' ? 'unavailable' : 'available';
    product.updatedBy = req.userId;
    await product.save();

    // Populate dữ liệu để trả về
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

//! Lấy danh mục và topping cho dropdown của form
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

//! Lấy chi tiết một sản phẩm theo ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category', 'name')
      .populate('toppings', 'name extraPrice');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product
    });

  } catch (error) {
    console.error("Error in getProductById:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
