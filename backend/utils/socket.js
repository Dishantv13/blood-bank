import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { getRedisClient } from "../config/redis.js";
import { isSessionValid } from "../services/sessionService.js";

let io;

// Hardened Production-Grade Socket.io Initialization
export const initSocket = async (server) => {
  const envOrigins = String(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const allowedOrigins = [
    ...envOrigins,
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ]
    .filter(Boolean)
    .map((url) => url.replace(/\/$/, ""));

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) or matching allowed list
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
          callback(null, true);
        } else {
          callback(new Error("CORS blocking WebSocket from origin: " + origin));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 70000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  try {
    const pubClient = await getRedisClient();
    const subClient = pubClient.duplicate();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log(
      "✅ Socket.io: Redis Adapter initialized (Scalability enabled)",
    );
  } catch (err) {
    console.error(
      "❌ Socket.io: Failed to initialize Redis Adapter.",
      err.message,
    );
  }

  // Security Middleware: Hardened Cookie-based JWT Validation
  io.use((socket, next) => {
    try {
      // 1. Parse cookies from the handshake request headers
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("Authentication error: No cookies found"));
      }

      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        }),
      );
      let token = null;
      let secret = null;
      let roleType = null;

      if (cookies.bb_admin_at) {
        token = cookies.bb_admin_at;
        secret = process.env.ADMIN_ACCESS_TOKEN_SECRET;
        roleType = "admin";
      } else if (cookies.bb_bank_at) {
        token = cookies.bb_bank_at;
        secret = process.env.BLOODBANK_ACCESS_TOKEN_SECRET;
        roleType = "bloodbank";
      } else if (cookies.bb_user_at) {
        token = cookies.bb_user_at;
        secret = process.env.USER_ACCESS_TOKEN_SECRET;
        roleType = "user";
      }

      if (!token || !secret) {
        return next(new Error("Authentication error: Access Token missing"));
      }

      // 4. Verify against the correct secret
      jwt.verify(token, secret, async (err, decoded) => {
        if (err) {
          return next(new Error("Authentication error: Invalid session"));
        }

        // SESSION ENFORCEMENT: Check if session is revoked in DB/Redis
        if (!(await isSessionValid(roleType, decoded.sid))) {
          return next(new Error("Authentication error: Session revoked"));
        }

        socket.user = decoded;
        socket.roleType = roleType; // Track which auth method was used
        next();
      });
    } catch (error) {
      next(new Error("Internal Authentication error"));
    }
  });

  // Client Connection Logic
  io.on("connection", (socket) => {
    const rawId =
      socket.user.userId ||
      socket.user.bloodBankId ||
      socket.user.adminEmail ||
      socket.user._id ||
      socket.user.id;

    if (!rawId) {
      console.error(
        "[WS] Connection rejected: No unique identifier found in token payload",
        socket.user,
      );
      return socket.disconnect();
    }

    const userId = rawId.toString();
    console.log(
      `[WS] Client connected: ${userId} (${socket.id}) [Role: ${socket.roleType || "unknown"}]`,
    );

    socket.join(`user:${userId}`);

    // Role-based rooms
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
    }

    if (socket.roleType === "admin") {
      socket.join("role:admin");
    }

    // Blood Bank specific rooms
    if (socket.user.bloodBankId) {
      socket.join(`bloodbank:${socket.user.bloodBankId}`);
      socket.join("role:bloodbank"); // Global room for all blood banks
    }

    socket.on("error", (err) => {
      console.error(`[WS] Socket error for user ${userId}:`, err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[WS] Client disconnected: ${userId} Reason: ${reason}`);
    });

    // CHAT EVENTS

    // Join a specific chat room for a Blood Request
    socket.on("chat:join", ({ requestId }) => {
      if (requestId) {
        socket.join(`chat:${requestId}`);
        console.log(`[WS] User ${userId} joined chat room: ${requestId}`);
      }
    });

    // Leave a chat room
    socket.on("chat:leave", ({ requestId }) => {
      if (requestId) {
        socket.leave(`chat:${requestId}`);
        console.log(`[WS] User ${userId} left chat room: ${requestId}`);
      }
    });

    // Handle incoming chat message
    socket.on("chat:message", async (payload) => {
      try {
        const { requestId, recipientId, recipientModel, message } = payload;

        if (!requestId || !recipientId || !message) return;

        const { saveMessage } = await import("../services/chatService.js");

        // 1. Persist to DB
        const savedMessage = await saveMessage({
          requestId,
          senderId: userId,
          senderModel: socket.roleType === "bloodbank" ? "BloodBank" : "User",
          recipientId,
          recipientModel: recipientModel || "User",
          message,
        });

        // 2. Broadcast to the room (sender and recipient if they are in the room)
        io.to(`chat:${requestId}`).emit("chat:receive", savedMessage);

        // 3. Also notify the recipient if they are not currently in the chat room
        // (This triggers the global notification system)
        io.to(`user:${recipientId}`).emit("notification", {
          type: "chat",
          title: "New Message",
          message: `You received a new message: "${message.substring(0, 30)}${message.length > 30 ? "..." : ""}"`,
          actionUrl: `/requests/${requestId}/chat`,
        });
      } catch (err) {
        console.error("[WS] Chat Message Error:", err.message);
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicator
    socket.on("chat:typing", ({ requestId, isTyping }) => {
      if (!requestId) return;
      // Broadcast to everyone in the room EXCEPT the sender
      socket.to(`chat:${requestId}`).emit("chat:typing", {
        userId,
        isTyping,
      });
    });

    // Handle message read status
    socket.on("chat:read", async ({ requestId }) => {
      try {
        if (!requestId) return;

        const { markAsRead } = await import("../services/chatService.js");
        await markAsRead(requestId, userId);

        // Notify the sender that their messages were read
        socket.to(`chat:${requestId}`).emit("chat:read", {
          requestId,
          readBy: userId,
          readAt: new Date(),
        });
      } catch (err) {
        console.error("[WS] Chat Read Error:", err.message);
      }
    });
  });

  return io;
};

// Returns the singleton IO instance
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
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
