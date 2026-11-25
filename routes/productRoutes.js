const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  adjustStock,
  deleteProduct,
  getLowStockReport,
  getCategorySummary
} = require('../controllers/productController');
const { validateObjectId } = require('../middleware/errorHandler');

router.get('/reports/low-stock', getLowStockReport);
router.get('/reports/category-summary', getCategorySummary);

router.route('/')
  .post(createProduct)
  .get(getAllProducts);

router.route('/:id')
  .get(validateObjectId, getProductById)
  .put(validateObjectId, updateProduct)
  .delete(validateObjectId, deleteProduct);

router.patch('/:id/stock', validateObjectId, adjustStock);

module.exports = router;
