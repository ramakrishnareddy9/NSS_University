const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Global Mongoose plugin to exclude soft-deleted documents by default.
// To include deleted documents in a query, add `includeDeleted: true` to the query object.
// MUST be registered BEFORE any model imports to ensure all models get the plugin.
const softDeletePlugin = function (schema) {
  function addNotDeleted(next) {
    try {
      const q = this.getQuery ? this.getQuery() : {};
      if (q && Object.prototype.hasOwnProperty.call(q, 'includeDeleted')) {
        delete q.includeDeleted;
        return next();
      }
      if (!q || !Object.prototype.hasOwnProperty.call(q, 'isDeleted')) {
        this.where({ isDeleted: { $ne: true } });
      }
    } catch (e) {
      console.error('SoftDelete plugin error:', e);
    }
    return next();
  }

  schema.pre('find', addNotDeleted);
  schema.pre('findOne', addNotDeleted);
  schema.pre('countDocuments', addNotDeleted);
  schema.pre('count', addNotDeleted);
  schema.pre('findOneAndUpdate', addNotDeleted);
  schema.pre('updateMany', addNotDeleted);
};

try {
  mongoose.plugin(softDeletePlugin);
} catch (e) {
  console.error('Failed to apply mongoose softDeletePlugin:', e);
}

const validateEnv = () => {
  const requiredVariables = ['JWT_SECRET'];
  const missingVariables = requiredVariables.filter((variable) => {
    const value = process.env[variable];
    return !value || !value.trim();
  });

  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  }
};

// Fail fast if required environment variables are missing.
validateEnv();

// Log environment status (without sensitive data)
console.log('\n🔧 Environment Configuration:');
console.log(`   MongoDB URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'}`);
console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`   Brevo API Key: ${process.env.BREVO_API_KEY ? '✅ Set (***' + process.env.BREVO_API_KEY.slice(-4) + ')' : '⚠️ Not set (emails disabled)'}`);
console.log(`   Brevo Sender: ${process.env.BREVO_SENDER_EMAIL ? '✅ ' + process.env.BREVO_SENDER_EMAIL : '⚠️ Not set'}`);
console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
console.log('');

const app = express();
const server = http.createServer(app);
const logger = require('./utils/logger');

console.log = (...args) => logger.info(...args);
console.info = (...args) => logger.info(...args);
console.warn = (...args) => logger.warn(...args);
console.error = (...args) => logger.error(...args);
console.debug = (...args) => logger.debug(...args);

const allowedCorsOrigins = [
  process.env.FRONTEND_URL,
  'https://nss-latest.onrender.com'
].filter(Boolean);

// Required when running behind Render/Netlify proxies for correct client IP detection.
const trustProxySetting = process.env.TRUST_PROXY;
app.set('trust proxy', trustProxySetting !== undefined ? trustProxySetting : 1);
app.disable('x-powered-by');

// Initialize Socket.IO
const socketAuthMiddleware = require('./middleware/socketAuth');
const io = require('socket.io')(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "https://localhost:3000",
      "https://nss-latest.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// Make io accessible to routes
app.set('io', io);

// Middleware
// Explicit CORS allowlist for the Express REST API (prevents wildcard origin acceptance)
console.log('CORS allowed origins:', allowedCorsOrigins.length ? allowedCorsOrigins.join(', ') : 'NONE');
app.use(cors({
  origin: allowedCorsOrigins,
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(hpp());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({
  extended: true,
  limit: process.env.URLENCODED_BODY_LIMIT || '100kb',
  parameterLimit: Number(process.env.PARAMETER_LIMIT || 1000)
}));

// Basic proxy-chain sanity check to reduce header spoofing abuse.
app.use((req, res, next) => {
  const xForwardedFor = req.headers['x-forwarded-for'];

  if (!xForwardedFor || typeof xForwardedFor !== 'string') {
    return next();
  }

  const proxyChainLength = xForwardedFor.split(',').map(ip => ip.trim()).filter(Boolean).length;
  const maxProxyChain = Number(process.env.MAX_PROXY_CHAIN || 5);

  if (proxyChainLength > maxProxyChain) {
    return res.status(400).json({
      success: false,
      message: 'Invalid proxy chain.'
    });
  }

  return next();
});

// Rate limiting defaults tuned for moderate traffic spikes.
const apiRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again shortly.'
  }
});

// Stricter limits for authentication endpoints to reduce abuse.
const authRateLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts. Please wait a few minutes.'
  }
});

app.use('/api/v1', apiRateLimiter);

// Standardize JSON responses for all API routes
app.use(require('./utils/responseMiddleware'));

// Serve uploaded files statically (for local storage fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/v1/auth', authRateLimiter, require('./routes/auth'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/events', require('./routes/events'));
app.use('/api/v1/participations', require('./routes/participations'));
app.use('/api/v1/contributions', require('./routes/contributions'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/upload', require('./routes/upload'));
app.use('/api/v1/notification-scheduler', require('./routes/notifications-scheduler'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    socketio: 'running'
  });
});

app.use('/api/v1/notifications', require('./routes/notifications-api'));
app.use('/api/v1/certificates', require('./routes/certificates'));
app.use('/api/v1/ai-assistant', require('./routes/aiAssistant'));
app.use('/api/v1/stats', require('./routes/stats'));
app.use('/api/v1/problems', require('./routes/problemRoutes'));
app.use('/api/v1/period-config', require('./routes/periodConfig'));
app.use('/api/v1/academic-year-config', require('./routes/academicYearConfig'));
app.use('/api/v1/od-list', require('./routes/odList'));

// Mount FCM route
app.use('/api/v1/fcm', require('./routes/fcm'));
// Establish MongoDB connection with retry/backoff
const connectWithRetry = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nss-portal';
  const maxRetries = Number(process.env.MONGO_RETRY_MAX || 5);
  const baseDelayMs = Number(process.env.MONGO_RETRY_BASE_MS || 1000);
  let attempt = 0;

  while (true) {
    try {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB Connected');
      return;
    } catch (err) {
      attempt++;
      console.error(`MongoDB connection attempt ${attempt} failed:`, err && err.message ? err.message : err);
      if (attempt > maxRetries) {
        console.error('Exceeded maximum MongoDB connection attempts. Exiting.');
        throw err;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), 30000);
      console.log(`Retrying MongoDB connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'NSS Activity Portal API is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New WebSocket connection established');
  console.log(`   Total connected clients: ${io.engine.clientsCount}`);

  // Join user's personal room based on userId (AUTHENTICATED ONLY)
  socket.on('join-user-room', (userId) => {
    // SEC-04: Validate that userId matches authenticated user
    if (!socket.isAuthenticated || socket.userId !== userId) {
      console.warn(`⚠️ Unauthorized room join attempt: socket tried to join user-${userId} but is authenticated as ${socket.userId}`);
      socket.emit('error', { message: 'Unauthorized: You can only join your own user room' });
      return;
    }
    
    const roomName = `user-${userId}`;
    socket.join(roomName);
    console.log(`👤 User ${userId} joined private room`);
    
    // Send confirmation
    socket.emit('room-joined', { room: roomName, userId });
  });

  // Allow admins to join an admin-only room for dashboards/notifications
  socket.on('join-admin-room', () => {
    if (!socket.isAuthenticated || socket.role !== 'admin') {
      console.warn('Unauthorized admin room join attempt');
      socket.emit('error', { message: 'Unauthorized: Admins only' });
      return;
    }
    socket.join('admin-notifications');
    socket.emit('room-joined', { room: 'admin-notifications' });
    console.debug('Admin socket joined admin-notifications room');
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 WebSocket disconnected: ${socket.id}`);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  // SEC-05: Guard debug logging - only in development
  if (process.env.NODE_ENV !== 'production') {
    socket.onAny((event, ...args) => {
      console.log(`📡 Socket event: ${event}`);
    });
  }
});

// Initialize certificate scheduler
const { initializeCertificateScheduler } = require('./utils/certificateScheduler');
initializeCertificateScheduler(io);

// Initialize event status auto-transition scheduler
const { initializeEventScheduler } = require('./utils/eventScheduler');
initializeEventScheduler(io);

// Initialize student year update scheduler
const { initializeStudentYearScheduler } = require('./utils/studentYearScheduler');
initializeStudentYearScheduler();

// Initialize notification cleanup scheduler
const Notification = require('./models/Notification');
const cron = require('node-cron');

// Run notification cleanup every hour
cron.schedule('0 * * * *', async () => {
  console.log('🧹 Running notification cleanup job...');
  await Notification.cleanupExpiredEventNotifications();
});

console.log('✅ Notification cleanup scheduler initialized (runs every hour)');

// Initialize nightly reconciliation scanner (BL-01)
const { scanEventsReconciliation } = require('./utils/reconciliation');
const AUTO_FIX = process.env.AUTO_FIX_RECONCILIATION === 'true';
// Run daily at 03:00 AM server time by default
cron.schedule(process.env.RECONCILE_CRON || '0 3 * * *', async () => {
  try {
    console.log('🛠️ Running nightly event reconciliation scan...');
    const results = await scanEventsReconciliation(AUTO_FIX);
    console.log(`🛠️ Reconciliation scan completed. Mismatches found: ${results.length}`);
  } catch (err) {
    console.error('Error during nightly reconciliation scan:', err);
  }
});

console.log('✅ Nightly reconciliation scheduler initialized');

const PORT = process.env.PORT || 5000;

// Expose Prometheus metrics if prom-client is installed
let promClientAvailable = false;
try {
  const promClient = require('prom-client');
  promClient.collectDefaultMetrics();
  promClientAvailable = true;
  app.get('/metrics', async (req, res) => {
    try {
      res.setHeader('Content-Type', promClient.register.contentType);
      res.send(await promClient.register.metrics());
    } catch (err) {
      res.status(500).send('Failed to collect metrics');
    }
  });
  console.log('Prometheus metrics endpoint enabled at /metrics');
} catch (e) {
  // prom-client not installed or failed to load; metrics endpoint disabled
}

// Timeout tuning helps reduce Slowloris-style resource exhaustion.
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS || 65000);
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 30000);
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 5000);

// Global error handler — ensure stack traces are never leaked to clients in production.
app.use((err, req, res, next) => {
  try {
    console.error('Unhandled error:', err && (err.stack || err));
  } catch (logErr) {
    console.error('Error while logging error:', logErr);
  }

  const status = (err && err.status) || 500;
  const payload = { message: (err && err.message) || 'Server error' };
  if (process.env.NODE_ENV !== 'production' && err && err.stack) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
});

// Start the server only after MongoDB connection is established
connectWithRetry()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server initialized`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB. Exiting.', err);
    process.exit(1);
  });

