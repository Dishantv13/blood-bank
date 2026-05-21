import { HTTPS_CODE } from "../utils/httpsCode.js";

const globalErrorHandler = (err, req, res, _next) => {
  if (err.name === 'ValidationError') {
    return res.status(HTTPS_CODE.BAD_REQUEST).json({ success: false, message: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(HTTPS_CODE.BAD_REQUEST).json({
      success: false,
      message: `Invalid value for field: ${err.path}`,
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(HTTPS_CODE.CONFLICT).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  console.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  const statusCode = err.statusCode || HTTPS_CODE.INTERNAL_SERVER_ERROR;

  // In production, hide detailed error messages to prevent information disclosure
  const message =
    process.env.NODE_ENV === 'production' && statusCode === HTTPS_CODE.INTERNAL_SERVER_ERROR
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  const response = {
    success: false,
    message,
  };

  if (err?.data && typeof err.data === 'object') {
    response.data = err.data;
  }

  if (err?.errors && Array.isArray(err.errors)) {
    response.errors = err.errors;
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export { globalErrorHandler };
