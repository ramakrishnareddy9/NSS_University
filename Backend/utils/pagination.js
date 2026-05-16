function getPagination(req, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const requestedLimit = parseInt(req.query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

function buildPagedResponse(data, total, page, limit) {
  return {
    data,
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1)
  };
}

module.exports = {
  getPagination,
  buildPagedResponse
};
