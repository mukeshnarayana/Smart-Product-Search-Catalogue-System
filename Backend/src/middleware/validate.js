function validateQuery(schema) {
  return (req, res, next) => {
    const rawSort = req.query.sort;
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'query',
        message: issue.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters provided',
          details
        }
      });
    }

    req.validatedQuery = result.data;
    req.hasExplicitSort = rawSort !== undefined && rawSort !== null && String(rawSort).trim().length > 0;
    next();
  };
}

module.exports = {
  validateQuery
};
