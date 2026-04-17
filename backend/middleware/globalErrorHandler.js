const globalErrorHandler = (err, req, res, _next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field: ${err.path}`,
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
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
