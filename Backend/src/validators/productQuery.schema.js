const { z } = require('zod');

const createNumericPreprocessor = (fieldName, { min, max, isInteger = false } = {}) => {
  return z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = Number(val);
    return isNaN(num) ? '__INVALID_NUMBER__' : num;
  }, z.union([
    z.undefined(),
    (() => {
      let schema = z.number({ message: `${fieldName} must be a valid number` });
      if (isInteger) {
        schema = schema.int({ message: `${fieldName} must be an integer` });
      }
      if (min !== undefined) {
        schema = schema.min(min, { message: `${fieldName} must be greater than or equal to ${min}` });
      }
      if (max !== undefined) {
        schema = schema.max(max, { message: `${fieldName} must be less than or equal to ${max}` });
      }
      return schema;
    })()
  ]));
};

const stringListPreprocessor = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (Array.isArray(val)) {
    const list = val.flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  if (typeof val === 'string') {
    const list = val.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  return [String(val).trim()];
}, z.array(z.string().min(1)).optional());

const inStockPreprocessor = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return '__INVALID_BOOLEAN__';
}, z.union([
  z.undefined(),
  z.boolean({ message: 'inStock must be true or false' })
]));

const SORT_OPTIONS = ['price_asc', 'price_desc', 'rating_desc', 'newest', 'name_asc'];

const productQuerySchema = z.object({
  q: z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    return str.length > 0 ? str : undefined;
  }, z.string().max(100, { message: 'q cannot exceed 100 characters' }).optional()),

  category: stringListPreprocessor,

  brand: stringListPreprocessor,

  minPrice: createNumericPreprocessor('minPrice', { min: 0 }),

  maxPrice: createNumericPreprocessor('maxPrice', { min: 0 }),

  minRating: createNumericPreprocessor('minRating', { min: 0, max: 5 }),

  inStock: inStockPreprocessor,

  sort: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 'newest';
    return val;
  }, z.enum(SORT_OPTIONS, {
    message: `Invalid sort option. Allowed values: ${SORT_OPTIONS.join(', ')}`
  })).default('newest'),

  page: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 1;
    const num = Number(val);
    return isNaN(num) ? '__INVALID_NUMBER__' : num;
  }, z.number({ message: 'page must be an integer greater than or equal to 1' })
    .int({ message: 'page must be an integer greater than or equal to 1' })
    .min(1, { message: 'page must be an integer greater than or equal to 1' }))
    .default(1),

  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return 20;
    const num = Number(val);
    return isNaN(num) ? '__INVALID_NUMBER__' : num;
  }, z.number({ message: 'limit must be an integer between 1 and 100' })
    .int({ message: 'limit must be an integer between 1 and 100' })
    .min(1, { message: 'limit must be an integer between 1 and 100' })
    .max(100, { message: 'limit must be an integer between 1 and 100' }))
    .default(20),

  requestId: z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    return str.length > 0 ? str : undefined;
  }, z.string().max(100).optional())
}).strip().superRefine((data, ctx) => {
  if (data.minPrice !== undefined && data.maxPrice !== undefined) {
    if (data.minPrice > data.maxPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minPrice cannot be greater than maxPrice',
        path: ['minPrice']
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxPrice must be greater than or equal to minPrice',
        path: ['maxPrice']
      });
    }
  }
});

module.exports = {
  productQuerySchema,
  SORT_OPTIONS
};
