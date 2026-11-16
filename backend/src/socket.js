import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config/env.js';
import { User } from './models/User.js';
import { Admin } from './models/Admin.js';
import { TenantMembership } from './models/TenantMembership.js';
import { MEMBERSHIP_STATUS } from './config/constants.js';

let ioInstance = null;

/**
 * Configure and initialize Socket.io WebSocket server
 * @param {import('http').Server} httpServer
 * @param {Object} [options]
 */
export function initSocketServer(httpServer, options = {}) {
  if (ioInstance) {
    return ioInstance;
  }

  const extraOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://jewellery-website-eta-flax.vercel.app',
    'http://jewellery-website-eta-flax.vercel.app',
    ...extraOrigins,
    process.env.ADMIN_URL,
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isExactMatch = allowedOrigins.includes(origin);
        const isVercelPreview = /^https:\/\/jewellery-website-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
        if (isExactMatch || isVercelPreview) {
          callback(null, true);
        } else if (config.isProduction) {
          callback(new Error(`CORS blocked: Origin '${origin}' is not authorized.`));
        } else {
          callback(null, true); // Permissive in dev/preview to avoid websocket handshake blocks
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
    ...options,
  });

  // Socket Authentication & Identity Resolution Middleware
  io.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!rawToken) {
        socket.user = null;
        socket.isGuest = true;
        return next();
      }

      const token = String(rawToken).startsWith('Bearer ')
        ? String(rawToken).split(' ')[1]
        : String(rawToken);

      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret);
      } catch (jwtErr) {
        socket.user = null;
        socket.isGuest = true;
        return next();
      }

      let user = null;
      const userId = decoded.userId || decoded.id;
      if (userId) {
        user = await User.findById(userId);
      }

      if (!user && decoded.email) {
        const email = String(decoded.email).toLowerCase().trim();
        user = await User.findOne({ email });
        if (!user) {
          const adminDoc = await Admin.findOne({ email });
          if (adminDoc) {
            user = await User.create({
              name: adminDoc.name || 'Store Admin',
              email: adminDoc.email,
              passwordHash: adminDoc.passwordHash,
              isSuperAdmin: adminDoc.role === 'superadmin',
              status: 'active',
            });
          }
        }
      }

      socket.user = user;
      socket.isGuest = !user;
      next();
    } catch (err) {
      console.warn('[Socket.io] Authentication warning:', err.message);
      socket.user = null;
      socket.isGuest = true;
      next();
    }
  });

  // Connection Handler
  io.on('connection', async (socket) => {
    try {
      if (socket.user?._id) {
        // Join private customer room for personal notifications
        const userRoom = `user:${String(socket.user._id)}`;
        socket.join(userRoom);

        // Platform Super Admin joins platform room
        if (socket.user.isSuperAdmin) {
          socket.join('platform:superadmin');
        }

        // Auto-join tenant admin channels for all active store memberships
        const memberships = await TenantMembership.find({
          userId: socket.user._id,
          status: MEMBERSHIP_STATUS.ACTIVE,
        }).select('tenantId');

        for (const m of memberships) {
          socket.join(`tenant:${String(m.tenantId)}:admin`);
        }
      }

      // Explicit room subscription with authorization verification
      socket.on('tenant:join', async (data) => {
        try {
          const { tenantId } = data || {};
          if (!tenantId) return;

          // Super Admin can subscribe to any store admin room
          if (socket.user?.isSuperAdmin) {
            socket.join(`tenant:${String(tenantId)}:admin`);
            socket.emit('tenant:joined', { tenantId, role: 'superadmin' });
            return;
          }

          if (socket.user?._id) {
            const membership = await TenantMembership.findOne({
              tenantId,
              userId: socket.user._id,
              status: MEMBERSHIP_STATUS.ACTIVE,
            });

            if (membership) {
              socket.join(`tenant:${String(tenantId)}:admin`);
              socket.emit('tenant:joined', { tenantId, role: 'staff' });
            } else {
              socket.emit('tenant:error', { message: 'Unauthorized for store admin channel.' });
            }
          }
        } catch (joinErr) {
          console.warn('[Socket.io] tenant:join error:', joinErr.message);
        }
      });
    } catch (connErr) {
      console.warn('[Socket.io] Connection setup error:', connErr.message);
    }
  });

  ioInstance = io;
  return io;
}

/**
 * Retrieve active Socket.io instance (or null)
 */
export function getIO() {
  return ioInstance;
}

/**
 * Emit an event to all store staff/administrators of a specific tenant
 */
export function emitToTenantAdmins(tenantId, event, data) {
  if (!ioInstance || !tenantId) return;
  const tId = String(tenantId);
  ioInstance.to(`tenant:${tId}:admin`).to('platform:superadmin').emit(event, data);
}

/**
 * Emit an event to an individual customer by User ID
 */
export function emitToCustomer(userId, event, data) {
  if (!ioInstance || !userId) return;
  const uId = String(userId);
  ioInstance.to(`user:${uId}`).emit(event, data);
}

/**
 * Broadcast event platform-wide
 */
export function emitToAll(event, data) {
  if (!ioInstance) return;
  ioInstance.emit(event, data);
}
