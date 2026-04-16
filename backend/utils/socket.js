import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../config/redis.js';

let io;

// Hardened Production-Grade Socket.io Initialization
export const initSocket = async (server) => {
  const envOrigins = String(process.env.FRONTEND_URLS || "").split(",").map(v => v.trim()).filter(Boolean);
  const allowedOrigins = [
    ...envOrigins,
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
  ].filter(Boolean).map(url => url.replace(/\/$/, ""));

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) or matching allowed list
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
          callback(null, true);
        } else {
          console.warn(`[Blocked] Socket.io connection from unauthorised origin: ${origin}`);
          callback(new Error("CORS blocking WebSocket from origin: " + origin));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Production settings: Prevent ghost connections and optimize ping
    pingTimeout: 70000, // Slightly higher to account for network jitter
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });


  try {
    const pubClient = await getRedisClient();
    const subClient = pubClient.duplicate();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io: Redis Adapter initialized (Scalability enabled)');
  } catch (err) {
    console.error('❌ Socket.io: Failed to initialize Redis Adapter.', err.message);
  }

  // Security Middleware: Hardened Cookie-based JWT Validation
  io.use((socket, next) => {
    try {
      // 1. Parse cookies from the handshake request headers
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: No cookies found'));
      }

      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [key, ...v] = c.split('=');
          return [key, v.join('=')];
        })
      );
      let token = null;
      let secret = null;
      let roleType = null;

      if (cookies.bb_admin_at) {
        token = cookies.bb_admin_at;
        secret = process.env.ADMIN_ACCESS_TOKEN_SECRET;
        roleType = 'admin';
      } else if (cookies.bb_bank_at) {
        token = cookies.bb_bank_at;
        secret = process.env.BLOODBANK_ACCESS_TOKEN_SECRET;
        roleType = 'bloodbank';
      } else if (cookies.bb_user_at) {
        token = cookies.bb_user_at;
        secret = process.env.USER_ACCESS_TOKEN_SECRET;
        roleType = 'user';
      }

      if (!token || !secret) {
        console.warn(`[WS Auth] Unauthorized attempt: Access Token missing (Cookies present: ${Object.keys(cookies).join(', ')})`);
        return next(new Error('Authentication error: Access Token missing'));
      }

      // 4. Verify against the correct secret
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          console.warn(`[WS Auth] Unauthorized attempt (${roleType}): ${err.message}`);
          return next(new Error('Authentication error: Invalid session'));
        }
        
        socket.user = decoded;
        socket.roleType = roleType; // Track which auth method was used
        next();
      });
    } catch (error) {
      console.error('[WS Auth] Middleware error:', error.message);
      next(new Error('Internal Authentication error'));
    }
  });

  // Client Connection Logic
  io.on('connection', (socket) => {
    // Robust identifier extraction (Support for User, BloodBank, and Admin roles)
    const rawId = socket.user.userId || socket.user.bloodBankId || socket.user.adminEmail || socket.user._id || socket.user.id;
    
    if (!rawId) {
      console.error('[WS] Connection rejected: No unique identifier found in token payload', socket.user);
      return socket.disconnect();
    }

    const userId = rawId.toString();
    console.log(`[WS] Client connected: ${userId} (${socket.id}) [Role: ${socket.roleType || 'unknown'}]`);

    // Organize rooms for targeted broadcasts
    socket.join(`user:${userId}`);
    
    // Role-based rooms
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
    }

    // Blood Bank specific rooms
    if (socket.user.bloodBankId) {
      socket.join(`bloodbank:${socket.user.bloodBankId}`);
    }

    socket.on('error', (err) => {
      console.error(`[WS] Socket error for user ${userId}:`, err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Client disconnected: ${userId} Reason: ${reason}`);
    });
  });

  return io;
};

// Returns the singleton IO instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Targeted Emitters (Scalable via Redis Adapter)
export const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

export const emitToBloodBank = (bloodBankId, event, data) => {
  if (io) io.to(`bloodbank:${bloodBankId}`).emit(event, data);
};

export const emitToRole = (role, event, data) => {
  if (io) io.to(`role:${role}`).emit(event, data);
};

export const broadcastAll = (event, data) => {
  if (io) io.emit(event, data);
};
