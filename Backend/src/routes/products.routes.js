const express = require('express');
const { getProducts, getProductFilters, getProductById } = require('../controllers/products.controller');
const { validateQuery } = require('../middleware/validate');
const { productQuerySchema } = require('../validators/productQuery.schema');

const router = express.Router();

// GET /api/products/filters (Must precede /:id)
router.get('/filters', getProductFilters);

// GET /api/products
router.get('/', validateQuery(productQuerySchema), getProducts);

// GET /api/products/:id
router.get('/:id', getProductById);

module.exports = router;
