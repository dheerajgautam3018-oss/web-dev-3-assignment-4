const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{4,15}$/, 'SKU must be 4-15 alphanumeric characters or hyphens']
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: {
        values: ['Electronics', 'Apparel', 'Groceries', 'Furniture', 'Stationery', 'Other'],
        message: '{VALUE} is not a supported inventory category'
      }
    },
    price: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0.01, 'Price must be greater than zero']
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Initial stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock quantity must be a whole integer'
      }
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative']
    },
    supplier: {
      type: String,
      trim: true,
      default: 'General Supplier'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity <= this.reorderLevel;
});

module.exports = mongoose.model('Product', productSchema);
