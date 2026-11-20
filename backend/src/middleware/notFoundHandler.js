/**
 * @file notFoundHandler.js
 * @description Catch-all 404 middleware for unmapped REST API routes and endpoints.
 */

/**
 * Handles 404 Not Found errors for unmatched routes.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} _next - Express next middleware callback
 */
export const notFoundHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
};

