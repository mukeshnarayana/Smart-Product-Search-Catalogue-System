const ProductSearchService = require('../services/productSearch.service');

async function getProducts(req, res, next) {
  try {
    const result = await ProductSearchService.searchProducts(
      req.validatedQuery,
      req.hasExplicitSort
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getProductFilters(req, res, next) {
  try {
    const filters = await ProductSearchService.getFilterAggregations();
    return res.status(200).json({ data: filters });
  } catch (error) {
    return next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await ProductSearchService.getProductById(id);

    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with id '${id}' not found`
        }
      });
    }

    return res.status(200).json({ data: product });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProducts,
  getProductFilters,
  getProductById
};
