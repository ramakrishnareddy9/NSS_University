const jwt = require('jsonwebtoken');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET;

/**
 * Socket.IO middleware to authenticate users via JWT
 * Verifies JWT token from handshake auth and attaches userId and role to socket
 */
async function socketAuthMiddleware(socket, next) {
  try {
    // Extract token from handshake auth or authorization header
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      // Allow unauthenticated connections for public events,
      // but they won't be able to join private user rooms
      socket.userId = null;
      socket.role = null;
      socket.isAuthenticated = false;
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret);
    socket.userId = decoded.id;
    socket.isAuthenticated = true;

    // Try to fetch minimal user info (role) for room authorization
    try {
      const user = await User.findById(decoded.id).select('role');
      socket.role = user ? user.role : null;
    } catch (e) {
      socket.role = null;
    }

    console.debug('Socket authenticated (user id hidden)');
    return next();
  } catch (error) {
    // Log security event without exposing token/ids
    console.warn('Socket authentication failed:', error.message);
    // Allow connection but mark as unauthenticated
    socket.userId = null;
    socket.role = null;
    socket.isAuthenticated = false;
    return next();
  }
}

module.exports = socketAuthMiddleware;
