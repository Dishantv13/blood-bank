const globalErrorHandler = (err, req, res, next) => {
  // Log error details internally (consider using a proper logging library like Winston)
  console.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || 500;
  
  // In production, hide detailed error messages to prevent information disclosure
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error' 
    : err.message || 'Internal Server Error';

  const response = {
    success: false,
    message,
  };

  if (err?.data && typeof err.data === 'object') {
    response.data = err.data;
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export { globalErrorHandler };
