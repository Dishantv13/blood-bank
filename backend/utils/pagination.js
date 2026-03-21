/**
 * Pagination Helper
 * Converts query params to skip/limit and returns pagination metadata
 */

export const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

// Build pagination response metadata
export const getPaginationMetadata = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

// Pagination wrapper function
export const buildPaginatedResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: getPaginationMetadata(page, limit, total)
  };
};
