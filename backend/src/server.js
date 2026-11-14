import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSocketServer } from './socket.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Attempt database connection
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn(
        '[Database] Warning: Could not connect to MongoDB on startup. Server running in disconnected mode. Please configure MONGODB_URI in backend/.env.'
      );
    }

    const app = createApp();
    const server = http.createServer(app);

    // Initialize real-time WebSocket server
    initSocketServer(server);

    server.listen(PORT, () => {
      console.log(`[AURELLE Backend] Server listening on http://localhost:${PORT}`);
      console.log(`[AURELLE Backend] API Health: http://localhost:${PORT}/api/health`);
      console.log(`[AURELLE Backend] Socket.io WebSocket active on port ${PORT}`);
    });
  } catch (error) {
    console.error('[AURELLE Backend] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();

