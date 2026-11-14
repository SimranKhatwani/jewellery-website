/**
 * Standardized API Response Helpers
 */

export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (res, message = 'An error occurred', statusCode = 500, code = 'ERROR', details = null) => {
  const payload = {
    success: false,
    message,
    code,
    ...(details !== null && { details }),
  };
  return res.status(statusCode).json(payload);
};

export const sendPaginated = (res, items = [], total = 0, page = 1, limit = 20, message = 'Success') => {
  return sendSuccess(
    res,
    items,
    message,
    200,
    {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    }
  );
};

