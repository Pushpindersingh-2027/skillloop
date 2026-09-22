// Real-time layer (UC9-72)
// Attaches Socket.IO to the HTTP server and places each authenticated
// user in a private room keyed by their user ID, so events can be sent
// to one person rather than broadcast to everyone (SRS 4.1.9, 4.1.10).
//
// Only runs where a persistent server exists (server.js). On Vercel the
// API runs as serverless functions, getIO() returns null, and clients
// keep using the existing polling endpoint (SRS 4.1.9 Alt Flow A).

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function userRoom(userId) {
  return 'user:' + userId;
}

// Parse a raw Cookie header ("a=1; token=xyz") into an object
function parseCookies(header) {
  const out = {};
  if (!header) return out;

  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return;

    const key = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();
    if (!key) return;

    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  });

  return out;
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_IO_CORS || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authenticate the handshake with the same JWT cookie the REST API uses
  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.token;

      if (!token) {
        console.log('Socket auth failed: no token cookie. Cookies seen:', Object.keys(cookies));
        return next(new Error('Not authenticated'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded.userId || decoded._id;

      if (!userId) {
        console.log('Socket auth failed: token has no user id. Payload keys:', Object.keys(decoded));
        return next(new Error('Invalid token'));
      }

      socket.userId = String(userId);
      return next();
    } catch (err) {
      console.log('Socket auth failed:', err.message);
      return next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.userId));
    console.log(`Socket connected: user ${socket.userId} (${socket.id})`);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: user ${socket.userId} (${reason})`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO, userRoom };