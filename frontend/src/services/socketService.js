import { io } from 'socket.io-client';

let socketInstance = null;
let currentToken = null;

function getSocketServerUrl() {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL || '';
  if (envApiUrl && envApiUrl.startsWith('http')) {
    // Strip trailing /api or /v1
    return envApiUrl.replace(/\/api.*$/, '').replace(/\/+$/, '');
  }
  // In development with Vite proxy, connect to current origin (which proxies /socket.io to backend)
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.port === '3000') {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
}

/**
 * Initialize or reuse an authenticated Socket.io connection
 * @param {string} [token] Bearer auth token for customer or admin session
 * @returns {import('socket.io-client').Socket}
 */
export function initSocket(token = null) {
  // If already connected with same token, return existing instance
  if (socketInstance && currentToken === token && socketInstance.connected) {
    return socketInstance;
  }

  // Disconnect any stale instance
  if (socketInstance) {
    try {
      socketInstance.disconnect();
    } catch {
      // Ignore cleanup error
    }
    socketInstance = null;
  }

  currentToken = token;
  const serverUrl = getSocketServerUrl();

  socketInstance = io(serverUrl, {
    auth: {
      token: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : undefined,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socketInstance.on('connect', () => {
    // Connected to real-time notification socket
  });

  socketInstance.on('connect_error', (err) => {
    // Fall back to REST polling gracefully
    console.warn('[Socket.io] Connection notice:', err.message);
  });

  return socketInstance;
}

/**
 * Disconnect socket gracefully
 */
export function disconnectSocket() {
  if (socketInstance) {
    try {
      socketInstance.disconnect();
    } catch {
      // Ignore cleanup error
    }
    socketInstance = null;
    currentToken = null;
  }
}

/**
 * Get active socket instance
 */
export function getSocket() {
  return socketInstance;
}

/**
 * Join store admin channel for explicit tenant updates
 */
export function joinTenantAdminRoom(tenantId) {
  if (socketInstance && tenantId) {
    socketInstance.emit('tenant:join', { tenantId });
  }
}
