import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

let io: SocketIOServer;

export function initSocketIO(socketServer: SocketIOServer) {
  io = socketServer;

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const payload = jwt.verify(token as string, process.env.JWT_SECRET!) as any;
        socket.data.userId = payload.sub;
        socket.data.role = payload.role;
      } catch {
        // Anonymous socket — still allowed for public rooms
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.data.userId || 'anon'})`);

    // Join personal room if authenticated
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    socket.on('join:contest', (contestId: string) => {
      socket.join(`contest:${contestId}`);
      logger.debug(`Socket ${socket.id} joined contest room: ${contestId}`);
    });

    socket.on('leave:contest', (contestId: string) => {
      socket.leave(`contest:${contestId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

// ── Emit helpers ──────────────────────────────────────────────────────────────
export function emitToUser(userId: string, event: string, data: any) {
  getIO().to(`user:${userId}`).emit(event, data);
}

export function emitToContest(contestId: string, event: string, data: any) {
  getIO().to(`contest:${contestId}`).emit(event, data);
}

export function emitSubmissionUpdate(userId: string, submissionId: string, data: any) {
  emitToUser(userId, 'submission:update', { submissionId, ...data });
}

export function emitScoreboardUpdate(contestId: string, data: any) {
  emitToContest(contestId, 'scoreboard:update', data);
}
