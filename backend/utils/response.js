const successResponse = (res, data = null, statusCode, message) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, error, statusCode) => {
  res.status(statusCode).json({
    success: false,
    error,
  });
};

export { successResponse, errorResponse };
