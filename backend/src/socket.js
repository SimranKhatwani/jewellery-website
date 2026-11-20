import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { User } from './models/User.js';
import { Admin } from './models/Admin.js';
import { TenantMembership } from './models/TenantMembership.js';
import { MEMBERSHIP_STATUS, USER_STATUS } from './config/constants.js';
import { socketCorsOptions } from './config/cors.js';

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

  const io = new Server(httpServer, {
    cors: socketCorsOptions,
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
        return next(new Error('Authentication error: Authentication token required.'));
      }

      const token = String(rawToken).startsWith('Bearer ')
        ? String(rawToken).split(' ')[1]
        : String(rawToken);

      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret);
      } catch (jwtErr) {
        if (jwtErr.name === 'TokenExpiredError') {
          return next(new Error('Authentication error: Token has expired.'));
        }
        return next(new Error('Authentication error: Invalid token signature.'));
      }

      const userId = decoded.userId || decoded.id;
      const email = decoded.email ? String(decoded.email).toLowerCase().trim() : null;

      if (!userId && !email) {
        return next(new Error('Authentication error: Malformed token payload.'));
      }

      let user = null;
      if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
        user = await User.findById(userId);
      }

      let adminDoc = null;
      if (!user && email) {
        user = await User.findOne({ email });
      }

      if (email) {
        adminDoc = await Admin.findOne({ email });
      }

      // If user does not exist in User model but exists in Admin model, auto-bridge
      if (!user && adminDoc) {
        user = await User.create({
          name: adminDoc.name || 'Store Admin',
          email: adminDoc.email,
          passwordHash: adminDoc.passwordHash,
          isSuperAdmin: adminDoc.role === 'superadmin',
          status: USER_STATUS.ACTIVE,
          tokenVersion: adminDoc.tokenVersion || 0,
        });
      }

      if (!user) {
        return next(new Error('Authentication error: Associated user account no longer exists.'));
      }

      // Validate account status (e.g. active vs suspended)
      if (user.status && user.status !== USER_STATUS.ACTIVE) {
        return next(new Error(`Authentication error: Account is ${user.status}. Access denied.`));
      }

      // Validate token version revocation (logout / password change invalidation)
      const decodedVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 0;
      const currentVersion = user.tokenVersion !== undefined ? user.tokenVersion : (adminDoc?.tokenVersion || 0);

      if (decodedVersion < currentVersion) {
        return next(new Error('Authentication error: Token session has expired or was revoked.'));
      }

      // Attach resolved authenticated identity
      socket.user = user;
      socket.adminDoc = adminDoc;
      next();
    } catch (err) {
      console.warn('[Socket.io] Authentication failure:', err.message);
      return next(new Error('Authentication error: Authentication failed.'));
    }
  });

  // Connection Handler
  io.on('connection', async (socket) => {
    try {
      if (socket.user?._id) {
        // Join private customer room for personal notifications
        const userRoom = `user:${String(socket.user._id)}`;
        socket.join(userRoom);

        const isSuperAdmin = Boolean(socket.user?.isSuperAdmin || socket.adminDoc?.role === 'superadmin');

        // Platform Super Admin joins platform room
        if (isSuperAdmin) {
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

          const isSuperAdmin = Boolean(socket.user?.isSuperAdmin || socket.adminDoc?.role === 'superadmin');

          // Super Admin can subscribe to any store admin room
          if (isSuperAdmin) {
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
