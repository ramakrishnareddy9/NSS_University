function sendSuccess(res, data = null, message = null, pagination = null) {
  const payload = { success: true, data };
  if (message) payload.message = message;
  if (pagination) payload.pagination = pagination;
  return res.json(payload);
}

function sendError(res, status = 500, message = 'Server error', details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

module.exports = { sendSuccess, sendError };
