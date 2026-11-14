export const notFoundHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
};

