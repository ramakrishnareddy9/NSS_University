// Middleware to standardize successful JSON responses to { success, data, message?, pagination? }
module.exports = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (payload) {
    try {
      // If response already indicates success/failed, leave it untouched
      if (res.statusCode >= 400) {
        return originalJson(payload);
      }

      if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
        return originalJson(payload);
      }

      return originalJson({ success: true, data: payload });
    } catch (e) {
      return originalJson(payload);
    }
  };

  next();
};
