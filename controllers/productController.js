const Product = require('../models/Product');

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const queryObj = {};

    if (category) {
      queryObj.category = category;
    }

    if (search) {
      queryObj.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      queryObj.price = {};
      if (minPrice) queryObj.price.$gte = Number(minPrice);
      if (maxPrice) queryObj.price.$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      queryObj.stockQuantity = { $gt: 0 };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [products, totalItems] = await Promise.all([
      Product.find(queryObj)
        .sort(sort.split(',').join(' '))
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(queryObj)
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
        currentPage: pageNum,
        pageSize: products.length
      },
      data: products
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      return next(err);
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { operation, quantity } = req.body;

    if (!['restock', 'sale'].includes(operation)) {
      const err = new Error("Operation must be either 'restock' or 'sale'");
      err.statusCode = 400;
      return next(err);
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      const err = new Error('Quantity must be a positive whole integer');
      err.statusCode = 400;
      return next(err);
    }

    const delta = operation === 'restock' ? quantity : -quantity;

    const filter = { _id: req.params.id };
    if (operation === 'sale') {
      filter.stockQuantity = { $gte: quantity };
    }

    const updatedProduct = await Product.findOneAndUpdate(
      filter,
      { $inc: { stockQuantity: delta } },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      const exists = await Product.exists({ _id: req.params.id });
      const err = new Error(
        exists
          ? `Insufficient stock to complete sale of ${quantity} units`
          : 'Product not found'
      );
      err.statusCode = exists ? 400 : 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: `Stock ${operation} of ${quantity} units processed`,
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      return next(err);
    }
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

exports.getLowStockReport = async (req, res, next) => {
  try {
    const lowStockItems = await Product.aggregate([
      {
        $match: {
          $expr: { $lte: ['$stockQuantity', '$reorderLevel'] }
        }
      },
      {
        $project: {
          sku: 1,
          name: 1,
          category: 1,
          stockQuantity: 1,
          reorderLevel: 1,
          supplier: 1,
          deficit: { $subtract: ['$reorderLevel', '$stockQuantity'] }
        }
      },
      { $sort: { stockQuantity: 1 } }
    ]);

    res.status(200).json({
      success: true,
      alertCount: lowStockItems.length,
      data: lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalUnitsInStock: { $sum: '$stockQuantity' },
          totalInventoryValue: {
            $sum: { $multiply: ['$price', '$stockQuantity'] }
          },
          averageUnitPrice: { $avg: '$price' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$stockQuantity', '$reorderLevel'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalProducts: 1,
          totalUnitsInStock: 1,
          totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
          averageUnitPrice: { $round: ['$averageUnitPrice', 2] },
          lowStockCount: 1
        }
      },
      { $sort: { totalInventoryValue: -1 } }
    ]);

    res.status(200).json({
      success: true,
      categoriesCount: summary.length,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
