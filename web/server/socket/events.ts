import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { sendPremiumChatPush } from '../services/chat-push-service';

type ChatSocketData = {
  userId?: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    displayUserId: number | null;
  };
};

function chatUserRoom(userId: string) {
  return `chat:user:${userId}`;
}

function chatCallRoom(callId: string) {
  return `chat:call:${callId}`;
}

function safeId(value: unknown) {
  return String(value || '').trim();
}

type PendingChatCall = {
  callId: string;
  payload: Record<string, unknown>;
  fromUserId: string;
  fromUser: NonNullable<ChatSocketData['user']>;
  targetUserIds: string[];
  io: Server;
  expiresAt: number;
  timeout: NodeJS.Timeout;
};

const pendingChatCalls = new Map<string, PendingChatCall>();

function rememberPendingCall(call: Omit<PendingChatCall, 'timeout' | 'expiresAt'>) {
  const existing = pendingChatCalls.get(call.callId);
  if (existing) clearTimeout(existing.timeout);

  const timeout = setTimeout(() => {
    pendingChatCalls.delete(call.callId);
    void persistCallMessage(call.io, {
      callId: call.callId,
      conversationId: safeId(call.payload.conversationId),
      senderId: call.fromUserId,
      mode: safeId(call.payload.mode) || 'voice',
      status: 'missed',
      targetUserIds: call.targetUserIds,
      callerName: safeId(call.fromUser.name) || safeId(call.fromUser.email) || 'A G5eSIM user',
      body:
        safeId(call.payload.mode) === 'video'
          ? 'Missed video call'
          : safeId(call.payload.mode) === 'group'
            ? 'Missed group call'
            : 'Missed voice call',
    });
  }, 90_000);
  timeout.unref?.();

  pendingChatCalls.set(call.callId, {
    ...call,
    expiresAt: Date.now() + 90_000,
    timeout,
  });
}

async function persistCallMessage(
  io: Server | null,
  {
    callId,
    conversationId,
    senderId,
    mode,
    status,
    body,
    targetUserIds,
    callerName,
  }: {
    callId: string;
    conversationId: string;
    senderId: string;
    mode: string;
    status: string;
    body: string;
    targetUserIds?: string[];
    callerName?: string;
  },
) {
  if (!conversationId || !senderId) return;

  const messageType =
    mode === 'video' ? 'video_call' : mode === 'group' ? 'group_call' : 'voice_call';

  try {
    const { rows } = await pool.query(
      `
        WITH inserted AS (
          INSERT INTO chat_messages (
            conversation_id,
            sender_id,
            message_type,
            body,
            call,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3,
            $4,
            $5::jsonb,
            $6::jsonb
          )
          RETURNING
            id,
            conversation_id AS "conversationId",
            sender_id AS "senderId",
            message_type AS "messageType",
            body,
            attachments,
            location,
            emoji,
            call,
            metadata,
            created_at AS "createdAt",
            edited_at AS "editedAt"
        )
        SELECT
          inserted.*,
          u.display_user_id AS "senderDisplayUserId",
          u.name AS "senderName",
          u.email AS "senderEmail",
          u.image_path AS "senderImagePath"
        FROM inserted
        INNER JOIN users u ON u.id = inserted."senderId"
      `,
      [
        conversationId,
        senderId,
        messageType,
        body,
        JSON.stringify({
          callId,
          kind: mode || 'voice',
          status,
          platform: 'premium-chat',
          recordedAt: new Date().toISOString(),
        }),
        JSON.stringify({ chatCallEvent: true, callId, callStatus: status }),
      ],
    );

    await pool.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1::uuid`, [
      conversationId,
    ]);

    const message = rows[0];
    const cleanTargetIds = Array.from(new Set((targetUserIds || []).map(safeId).filter(Boolean)));
    if (message && cleanTargetIds.length) {
      void sendPremiumChatPush({
        targetUserIds: cleanTargetIds,
        title:
          mode === 'video'
            ? 'Missed Premium Video Call'
            : mode === 'group'
              ? 'Missed Premium Group Call'
              : 'Missed Premium Voice Call',
        body: `${callerName || 'A G5eSIM user'} tried to call you in Premium Chat.`,
        androidChannelId: 'chat_call_channel',
        data: {
          type: 'premium_chat_message',
          conversationId,
          messageId: message.id,
          callId,
          messageType,
          fromUserId: senderId,
          fromName: callerName || '',
        },
      }).catch((error) => {
        console.warn(
          'Premium chat missed-call push failed:',
          error instanceof Error ? error.message : error,
        );
      });
    }

    if (!message || !io) return;

    io.to(`chat:conversation:${conversationId}`).emit('chat:message:new', message);

    const { rows: participants } = await pool.query(
      `SELECT user_id AS "userId" FROM chat_participants WHERE conversation_id = $1::uuid`,
      [conversationId],
    );
    participants.forEach((participant) => {
      const userId = safeId(participant.userId);
      if (userId) {
        io.to(chatUserRoom(userId)).emit('chat:conversation:updated', {
          conversationId,
          messageId: message.id,
        });
      }
    });
  } catch (error) {
    console.warn(
      'Failed to persist chat call event:',
      error instanceof Error ? error.message : error,
    );
  }
}

function clearPendingCall(callId: string) {
  const pending = pendingChatCalls.get(callId);
  if (pending) clearTimeout(pending.timeout);
  pendingChatCalls.delete(callId);
}

async function touchChatPresence(userId: string) {
  await pool
    .query(
      `
        UPDATE users
        SET chat_last_seen_at = now()
        WHERE id = $1
      `,
      [userId],
    )
    .catch(() => undefined);
}

async function loadChatSocketUser(userId: string) {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        display_user_id AS "displayUserId"
      FROM users
      WHERE id = $1 AND is_deleted = false
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] || null;
}

async function authenticateChatSocket(socket: Socket) {
  const existing = socket.data as ChatSocketData;
  if (existing.userId && existing.user) return existing;

  const token = socket.handshake.auth?.token;
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;

  if (!token || !secret) return existing;

  try {
    const decoded = jwt.verify(String(token), secret) as any;
    const userId = safeId(decoded.userId || decoded.id);
    if (!userId) return existing;

    const user = await loadChatSocketUser(userId);
    if (!user) return existing;

    socket.data.userId = user.id;
    socket.data.user = user;
    socket.join(chatUserRoom(user.id));
    await touchChatPresence(user.id);
    console.log(`Chat realtime ready for user ${user.id}`);
  } catch (error) {
    console.warn('Chat realtime token rejected:', error instanceof Error ? error.message : error);
  }

  return socket.data as ChatSocketData;
}

async function emitToTargets(
  io: Server,
  socket: Socket,
  eventName: string,
  payload: Record<string, unknown>,
  targetUserIds: string[],
) {
  const data = await authenticateChatSocket(socket);
  if (!data.userId || !data.user) {
    socket.emit('chat:call:error', { message: 'Realtime chat authentication required' });
    return;
  }

  const cleanTargetIds = Array.from(new Set(targetUserIds.map(safeId).filter(Boolean))).filter(
    (targetId) => targetId !== data.userId,
  );

  if (!cleanTargetIds.length) {
    socket.emit('chat:call:error', {
      callId: payload.callId || null,
      message: 'No online receiver selected',
    });
    return;
  }

  const onlineTargetIds: string[] = [];
  for (const targetId of cleanTargetIds) {
    const sockets = await io.in(chatUserRoom(targetId)).fetchSockets();
    if (sockets.length > 0) {
      onlineTargetIds.push(targetId);
    }
  }

  const offlineTargetIds = cleanTargetIds.filter((targetId) => !onlineTargetIds.includes(targetId));
  if (eventName === 'chat:call:incoming' && offlineTargetIds.length) {
    const mode = safeId(payload.mode) || 'voice';
    const callerName = safeId(data.user.name) || safeId(data.user.email) || 'A G5eSIM user';

    await sendPremiumChatPush({
      targetUserIds: offlineTargetIds,
      title:
        mode === 'video'
          ? 'Incoming Premium Video Call'
          : mode === 'group'
            ? 'Incoming Premium Group Call'
            : 'Incoming Premium Voice Call',
      body: `${callerName} is calling you in Premium Chat.`,
      androidChannelId: 'chat_call_channel',
      data: {
        type: 'premium_chat_call',
        callId: payload.callId || '',
        conversationId: payload.conversationId || '',
        mode,
        fromUserId: data.userId,
        fromName: callerName,
        fromEmail: data.user.email,
      },
    }).catch((error) => {
      console.warn(
        'Premium chat call push failed:',
        error instanceof Error ? error.message : error,
      );
    });
  }

  if (!onlineTargetIds.length) {
    socket.emit('chat:call:mobile-notified', {
      callId: payload.callId || null,
      message:
        'The receiver is not online in realtime chat yet. A mobile call notification was sent.',
    });
    return;
  }

  onlineTargetIds.forEach((targetId) => {
    io.to(chatUserRoom(targetId)).emit(eventName, {
      ...payload,
      fromUserId: data.userId,
      fromUser: data.user,
      toUserId: targetId,
    });
  });
}

export function registerSocketEvents(io: Server, socket: Socket) {
  void authenticateChatSocket(socket);

  socket.on('disconnect', () => {
    const userId = safeId((socket.data as ChatSocketData).userId);
    if (userId) void touchChatPresence(userId);
  });

  socket.on('join_ticket', ({ ticketId }) => {
    socket.join(`ticket:${ticketId}`);
    console.log(`📥 ${socket.id} joined ticket:${ticketId}`);
  });

  socket.on('leave_ticket', ({ ticketId }) => {
    socket.leave(`ticket:${ticketId}`);
    console.log(`📤 ${socket.id} left ticket:${ticketId}`);
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('chat:ready', async () => {
    const data = await authenticateChatSocket(socket);
    if (data.userId) await touchChatPresence(data.userId);
    socket.emit('chat:ready:ack', {
      userId: data.userId || null,
      authenticated: Boolean(data.userId),
    });
  });

  socket.on('chat:presence:ping', async () => {
    const data = await authenticateChatSocket(socket);
    if (data.userId) await touchChatPresence(data.userId);
  });

  socket.on('chat:conversation:join', async ({ conversationId }) => {
    const data = await authenticateChatSocket(socket);
    const safeConversationId = safeId(conversationId);
    if (!data.userId || !safeConversationId) return;

    const { rowCount } = await pool.query(
      `SELECT 1 FROM chat_participants WHERE conversation_id = $1::uuid AND user_id = $2 LIMIT 1`,
      [safeConversationId, data.userId],
    );

    if (Number(rowCount || 0) > 0) {
      socket.join(`chat:conversation:${safeConversationId}`);
    }
  });

  socket.on('chat:call:invite', async (payload = {}) => {
    const data = await authenticateChatSocket(socket);
    const callId = safeId((payload as any).callId);
    if (!data.userId || !data.user || !callId) return;

    socket.join(chatCallRoom(callId));
    const targetUserIds = Array.isArray((payload as any).targetUserIds)
      ? (payload as any).targetUserIds
      : [];
    const incomingPayload = {
      callId,
      conversationId: safeId((payload as any).conversationId),
      mode: safeId((payload as any).mode) || 'voice',
      targetUserIds,
      createdAt: new Date().toISOString(),
    };

    rememberPendingCall({
      callId,
      payload: incomingPayload,
      fromUserId: data.userId,
      fromUser: data.user,
      targetUserIds: targetUserIds.map(safeId).filter(Boolean),
      io,
    });

    await emitToTargets(io, socket, 'chat:call:incoming', incomingPayload, targetUserIds);
  });

  socket.on('chat:call:resume', async (payload = {}) => {
    const data = await authenticateChatSocket(socket);
    const callId = safeId((payload as any).callId);
    const pending = callId ? pendingChatCalls.get(callId) : null;
    if (!data.userId || !pending || pending.expiresAt < Date.now()) {
      if (callId) clearPendingCall(callId);
      socket.emit('chat:call:error', {
        callId: callId || null,
        message: 'This chat call is no longer available.',
      });
      return;
    }

    if (!pending.targetUserIds.includes(data.userId)) return;

    socket.join(chatCallRoom(callId));
    socket.emit('chat:call:incoming', {
      ...pending.payload,
      fromUserId: pending.fromUserId,
      fromUser: pending.fromUser,
      toUserId: data.userId,
      resumed: true,
    });
    io.to(chatUserRoom(pending.fromUserId)).emit('chat:call:mobile-opened', {
      callId,
      conversationId: pending.payload.conversationId || '',
      toUserId: data.userId,
    });
  });

  socket.on('chat:call:accept', async (payload = {}) => {
    const data = await authenticateChatSocket(socket);
    const callId = safeId((payload as any).callId);
    const toUserId = safeId((payload as any).toUserId);
    if (!data.userId || !data.user || !callId || !toUserId) return;

    socket.join(chatCallRoom(callId));
    clearPendingCall(callId);
    io.to(chatUserRoom(toUserId)).emit('chat:call:accepted', {
      callId,
      conversationId: safeId((payload as any).conversationId),
      fromUserId: data.userId,
      fromUser: data.user,
    });
  });

  socket.on('chat:call:reject', async (payload = {}) => {
    clearPendingCall(safeId((payload as any).callId));
    await emitToTargets(
      io,
      socket,
      'chat:call:rejected',
      {
        callId: safeId((payload as any).callId),
        conversationId: safeId((payload as any).conversationId),
        reason: safeId((payload as any).reason) || 'rejected',
      },
      [safeId((payload as any).toUserId)],
    );
  });

  socket.on('chat:call:end', async (payload = {}) => {
    clearPendingCall(safeId((payload as any).callId));
    const targetIds = Array.isArray((payload as any).targetUserIds)
      ? (payload as any).targetUserIds
      : [safeId((payload as any).toUserId)];
    await emitToTargets(
      io,
      socket,
      'chat:call:ended',
      {
        callId: safeId((payload as any).callId),
        conversationId: safeId((payload as any).conversationId),
      },
      targetIds,
    );
  });

  socket.on('chat:call:offer', async (payload = {}) => {
    await emitToTargets(
      io,
      socket,
      'chat:call:offer',
      {
        callId: safeId((payload as any).callId),
        conversationId: safeId((payload as any).conversationId),
        description: (payload as any).description || null,
      },
      [safeId((payload as any).toUserId)],
    );
  });

  socket.on('chat:call:answer', async (payload = {}) => {
    await emitToTargets(
      io,
      socket,
      'chat:call:answer',
      {
        callId: safeId((payload as any).callId),
        conversationId: safeId((payload as any).conversationId),
        description: (payload as any).description || null,
      },
      [safeId((payload as any).toUserId)],
    );
  });

  socket.on('chat:call:ice-candidate', async (payload = {}) => {
    await emitToTargets(
      io,
      socket,
      'chat:call:ice-candidate',
      {
        callId: safeId((payload as any).callId),
        conversationId: safeId((payload as any).conversationId),
        candidate: (payload as any).candidate || null,
      },
      [safeId((payload as any).toUserId)],
    );
  });

  socket.on('chat:call:recording-state', async (payload = {}) => {
    const targetIds = Array.isArray((payload as any).targetUserIds)
      ? (payload as any).targetUserIds
      : [safeId((payload as any).toUserId)];

    await emitToTargets(
      io,
      socket,
      'chat:call:recording-state',
      {
        callId: safeId((payload as any).callId),
        conversationId: safeId((payload as any).conversationId),
        isRecording: Boolean((payload as any).isRecording),
      },
      targetIds,
    );
  });
}
