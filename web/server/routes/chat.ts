import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { getIO } from '../socket';
import { sendPremiumChatPush } from '../services/chat-push-service';
import { requireAuth } from '../lib/middleware';
import {
  normalizeUserModuleOverrideSettings,
  USER_MODULE_OPTIONS_SETTING_PREFIX,
  type RoleOptionRole,
} from '@shared/roleOptions';
import { getRoleOptionRole, getStoredRoleOptionsConfig } from '../utils/roleOptionsConfig';

const router = Router();

type ChatUser = {
  id: string;
  displayUserId: number | null;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  imagePath: string | null;
  chatProfileAbout: string | null;
  chatLastSeenAt: string | null;
  chatOnline: boolean;
  chatPresenceHidden: boolean;
};

const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
const profileUploadDir = path.join(process.cwd(), 'uploads', 'profiles');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      callback(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedByExtension = new Set([
      '.aac',
      '.amr',
      '.avi',
      '.csv',
      '.doc',
      '.docx',
      '.gif',
      '.heic',
      '.heif',
      '.jpeg',
      '.jpg',
      '.m4a',
      '.m4v',
      '.mov',
      '.mp3',
      '.mp4',
      '.oga',
      '.ogg',
      '.pdf',
      '.png',
      '.txt',
      '.wav',
      '.webm',
      '.webp',
      '.xls',
      '.xlsx',
    ]).has(ext);

    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/') ||
      [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ].includes(file.mimetype) ||
      allowedByExtension
    ) {
      callback(null, true);
      return;
    }

    callback(new Error('Unsupported chat attachment type'));
  },
});

const chatProfileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, profileUploadDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      callback(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Profile image must be an image file'));
  },
});

let schemaPromise: Promise<void> | null = null;

function hasOwn(source: Record<string, boolean>, key: string) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

async function userHasChatModuleAccess(user: ChatUser) {
  const role = getRoleOptionRole(user.role);
  let enabled = true;

  if (role === 'user') {
    const config = await getStoredRoleOptionsConfig();
    const roleSettings = config.roles[role];
    enabled =
      roleSettings.modules.chat_module === true || roleSettings.mobileModules.chat_module === true;
  }

  const { rows } = await pool.query(`SELECT value FROM platform_settings WHERE key = $1 LIMIT 1`, [
    `${USER_MODULE_OPTIONS_SETTING_PREFIX}${user.id}`,
  ]);

  if (!rows[0]?.value) return enabled;

  try {
    const overrides = normalizeUserModuleOverrideSettings(
      role as RoleOptionRole,
      JSON.parse(rows[0].value),
    );
    if (
      hasOwn(overrides.modules, 'chat_module') ||
      hasOwn(overrides.mobileModules, 'chat_module')
    ) {
      enabled =
        overrides.modules.chat_module === true || overrides.mobileModules.chat_module === true;
    }
  } catch {
    return enabled;
  }

  return enabled;
}

function ensureChatSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          type text NOT NULL DEFAULT 'direct',
          title text,
          created_by varchar REFERENCES users(id) ON DELETE SET NULL,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role text NOT NULL DEFAULT 'member',
          muted boolean NOT NULL DEFAULT false,
          last_read_at timestamp,
          joined_at timestamp NOT NULL DEFAULT now(),
          PRIMARY KEY (conversation_id, user_id)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
          sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message_type text NOT NULL DEFAULT 'text',
          body text,
          attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
          location jsonb,
          emoji jsonb,
          call jsonb,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          edited_at timestamp,
          deleted_at timestamp
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_reactions (
          message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reaction text NOT NULL,
          created_at timestamp NOT NULL DEFAULT now(),
          PRIMARY KEY (message_id, user_id, reaction)
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS chat_participants_user_idx ON chat_participants(user_id)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx ON chat_messages(conversation_id, created_at)`,
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS chat_messages_sender_idx ON chat_messages(sender_id)`,
      );
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_last_seen_at timestamp`);
      await pool.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_presence_hidden boolean NOT NULL DEFAULT false`,
      );
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_profile_about text`);
    })();
  }

  return schemaPromise;
}

function normalizeMessageType(value: unknown) {
  const type = String(value || 'text')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const allowed = new Set([
    'text',
    'image',
    'video',
    'file',
    'audio',
    'location',
    'emoji',
    'voice_call',
    'video_call',
    'group_call',
    'broadcast',
  ]);

  return allowed.has(type) ? type : 'text';
}

function normalizeConversationType(value: unknown) {
  const type = String(value || 'direct')
    .trim()
    .toLowerCase();
  if (['direct', 'group', 'broadcast'].includes(type)) return type;
  return 'direct';
}

function splitEnvList(value?: string) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRtcConfig() {
  const turnUrls = splitEnvList(process.env.CHAT_TURN_URLS || process.env.TURN_URLS);
  const turnUsername = process.env.CHAT_TURN_USERNAME || process.env.TURN_USERNAME || '';
  const turnCredential = process.env.CHAT_TURN_CREDENTIAL || process.env.TURN_CREDENTIAL || '';

  const iceServers: Array<Record<string, unknown>> = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  if (turnUrls.length && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceTransportPolicy: process.env.CHAT_RTC_FORCE_RELAY === 'true' ? 'relay' : 'all',
    hasTurn: turnUrls.length > 0 && Boolean(turnUsername && turnCredential),
  };
}

function compactUser(row: any): ChatUser {
  return {
    id: String(row.id),
    displayUserId: row.displayUserId ?? row.display_user_id ?? null,
    email: String(row.email || ''),
    name: row.name || null,
    phone: row.phone || null,
    role: row.role || 'customer',
    imagePath: row.imagePath ?? row.image_path ?? null,
    chatProfileAbout: row.chatProfileAbout ?? row.chat_profile_about ?? null,
    chatLastSeenAt: row.chatLastSeenAt ?? row.chat_last_seen_at ?? null,
    chatOnline: Boolean(row.chatOnline ?? row.chat_online),
    chatPresenceHidden: Boolean(row.chatPresenceHidden ?? row.chat_presence_hidden),
  };
}

function resolveChatAttachmentPath(url: unknown) {
  const value = String(url || '').trim();
  if (!value.startsWith('/uploads/chat/') && !value.startsWith('uploads/chat/')) {
    return null;
  }

  const fullPath = path.resolve(process.cwd(), value.replace(/^[/\\]+/, ''));
  const safeRoot = path.resolve(uploadDir);
  return fullPath.startsWith(safeRoot) ? fullPath : null;
}

async function deleteUnreferencedChatFiles(attachments: unknown[]) {
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== 'object') continue;
    const url = (attachment as Record<string, unknown>).url;
    const filePath = resolveChatAttachmentPath(url);
    if (!filePath) continue;

    const { rows } = await pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM chat_messages m
        CROSS JOIN LATERAL jsonb_array_elements(m.attachments) file
        WHERE m.deleted_at IS NULL
          AND file->>'url' = $1
      `,
      [String(url)],
    );

    if (Number(rows[0]?.count || 0) === 0 && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function chatDisplayName(user: Partial<ChatUser> | null | undefined) {
  return String(user?.name || user?.email || 'G5eSIM user').trim();
}

async function getConversationPushTargets(conversationId: string, senderUserId: string) {
  const { rows } = await pool.query(
    `
      SELECT
        cp.user_id AS "userId"
      FROM chat_participants cp
      INNER JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = $1::uuid
        AND cp.user_id <> $2
        AND u.is_deleted = false
    `,
    [conversationId, senderUserId],
  );

  return rows.map((row) => String(row.userId)).filter(Boolean);
}

function chatMessagePushBody(messageType: string, body: string, attachments: unknown[]) {
  if (body) return body.slice(0, 140);
  if (messageType === 'image') return 'Sent an image';
  if (messageType === 'video') return 'Sent a video';
  if (messageType === 'audio') return 'Sent a voice message';
  if (messageType === 'location') return 'Shared a location';
  if (messageType.includes('call')) return 'Started a call';
  if (attachments.length) return 'Sent an attachment';
  return 'Sent a message';
}

async function getCurrentUser(req: Request) {
  await ensureChatSchema();
  const userId = req.userId || req.session?.userId;

  if (!userId) {
    return null;
  }

  const { rows } = await pool.query(
    `
      SELECT
        id,
        display_user_id AS "displayUserId",
        email,
        name,
        phone,
        role,
        image_path AS "imagePath",
        chat_profile_about AS "chatProfileAbout",
        chat_last_seen_at AS "chatLastSeenAt",
        COALESCE(chat_presence_hidden, false) AS "chatPresenceHidden",
        (
          COALESCE(chat_presence_hidden, false) = false
          AND chat_last_seen_at >= now() - interval '90 seconds'
        ) AS "chatOnline"
      FROM users
      WHERE id = $1 AND is_deleted = false
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] ? compactUser(rows[0]) : null;
}

async function requireChatUser(req: Request, res: Response) {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(403).json({ success: false, message: 'Chat is available for platform users only' });
    return null;
  }

  return user;
}

async function ensureParticipant(conversationId: string, userId: string) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM chat_participants WHERE conversation_id = $1::uuid AND user_id = $2 LIMIT 1`,
    [conversationId, userId],
  );

  return Number(rowCount || 0) > 0;
}

async function getConversations(userId: string) {
  const { rows: conversationRows } = await pool.query(
    `
      SELECT
        c.id,
        c.type,
        c.title,
        c.metadata,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        cp.last_read_at AS "lastReadAt"
      FROM chat_conversations c
      INNER JOIN chat_participants cp ON cp.conversation_id = c.id
      WHERE cp.user_id = $1
      ORDER BY c.updated_at DESC
    `,
    [userId],
  );

  if (!conversationRows.length) {
    return [];
  }

  const ids = conversationRows.map((row) => row.id);
  const { rows: participantRows } = await pool.query(
    `
      SELECT
        cp.conversation_id AS "conversationId",
        cp.role AS "participantRole",
        cp.muted,
        cp.joined_at AS "joinedAt",
        u.id,
        u.display_user_id AS "displayUserId",
        u.email,
        u.name,
        u.phone,
        u.role,
        u.image_path AS "imagePath",
        u.chat_profile_about AS "chatProfileAbout",
        u.chat_last_seen_at AS "chatLastSeenAt",
        COALESCE(u.chat_presence_hidden, false) AS "chatPresenceHidden",
        (
          COALESCE(u.chat_presence_hidden, false) = false
          AND u.chat_last_seen_at >= now() - interval '90 seconds'
        ) AS "chatOnline"
      FROM chat_participants cp
      INNER JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = ANY($1::uuid[])
      ORDER BY cp.joined_at ASC
    `,
    [ids],
  );

  const { rows: lastMessageRows } = await pool.query(
    `
      SELECT DISTINCT ON (m.conversation_id)
        m.conversation_id AS "conversationId",
        m.id,
        m.sender_id AS "senderId",
        m.message_type AS "messageType",
        m.body,
        m.attachments,
        m.location,
        m.emoji,
        m.call,
        m.metadata,
        m.created_at AS "createdAt",
        u.name AS "senderName",
        u.email AS "senderEmail"
      FROM chat_messages m
      INNER JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ANY($1::uuid[])
        AND m.deleted_at IS NULL
        AND (
          COALESCE((m.metadata->>'privateRecording')::boolean, false) = false
          OR m.sender_id = $2
          OR m.metadata->>'visibleOnlyToUserId' = $2
        )
      ORDER BY m.conversation_id, m.created_at DESC
    `,
    [ids, userId],
  );

  const { rows: unreadRows } = await pool.query(
    `
      SELECT
        c.id AS "conversationId",
        COUNT(m.id)::int AS "unreadCount"
      FROM chat_conversations c
      INNER JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
      LEFT JOIN chat_messages m
        ON m.conversation_id = c.id
        AND m.sender_id <> $1
        AND m.deleted_at IS NULL
        AND (
          COALESCE((m.metadata->>'privateRecording')::boolean, false) = false
          OR m.sender_id = $1
          OR m.metadata->>'visibleOnlyToUserId' = $1
        )
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      WHERE c.id = ANY($2::uuid[])
      GROUP BY c.id
    `,
    [userId, ids],
  );

  const participantsByConversation = new Map<string, any[]>();
  participantRows.forEach((row) => {
    const list = participantsByConversation.get(row.conversationId) || [];
    list.push({
      user: compactUser(row),
      role: row.participantRole,
      muted: Boolean(row.muted),
      joinedAt: row.joinedAt,
    });
    participantsByConversation.set(row.conversationId, list);
  });

  const lastMessageByConversation = new Map(
    lastMessageRows.map((row) => [row.conversationId, row]),
  );
  const unreadByConversation = new Map(
    unreadRows.map((row) => [row.conversationId, Number(row.unreadCount || 0)]),
  );

  return conversationRows.map((row) => ({
    ...row,
    participants: participantsByConversation.get(row.id) || [],
    lastMessage: lastMessageByConversation.get(row.id) || null,
    unreadCount: unreadByConversation.get(row.id) || 0,
  }));
}

router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    if (!(await userHasChatModuleAccess(user))) {
      res.status(403).json({
        success: false,
        message: 'Chat is not active for this account',
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify chat access',
    });
  }
});

router.get('/realtime-token', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!secret) {
      res.status(500).json({ success: false, message: 'Realtime calls are not configured' });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        scope: 'chat-realtime',
      },
      secret,
      { expiresIn: '12h' },
    );

    res.json({ success: true, data: { token } });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to create realtime token' });
  }
});

router.get('/rtc-config', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    res.json({
      success: true,
      data: getRtcConfig(),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to load RTC configuration' });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load profile' });
  }
});

router.put('/profile', (req, res) => {
  chatProfileUpload.single('profileImage')(req, res, async (error: any) => {
    try {
      if (error) {
        const message =
          error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
            ? 'Profile image must be 15MB or smaller'
            : error.message || 'Failed to upload profile image';
        res.status(400).json({ success: false, message });
        return;
      }

      const user = await requireChatUser(req, res);
      if (!user) return;

      const hasName = Object.prototype.hasOwnProperty.call(req.body || {}, 'name');
      const hasAbout = Object.prototype.hasOwnProperty.call(req.body || {}, 'about');
      const name = String(req.body?.name || '').trim();
      const about = String(req.body?.about || '').trim();
      const uploaded = req.file;

      if (hasName && !name) {
        res.status(400).json({ success: false, message: 'Name is required' });
        return;
      }

      const updates: string[] = [];
      const params: unknown[] = [];
      let index = 1;

      if (hasName) {
        updates.push(`name = $${index++}`);
        params.push(name);
      }

      if (hasAbout) {
        updates.push(`chat_profile_about = $${index++}`);
        params.push(about || null);
      }

      if (uploaded) {
        updates.push(`image_path = $${index++}`);
        params.push(`uploads/profiles/${uploaded.filename}`);
      }

      if (updates.length) {
        params.push(user.id);
        await pool.query(
          `UPDATE users SET ${updates.join(', ')}, updated_at = now() WHERE id = $${index}`,
          params,
        );
      }

      const updated = await getCurrentUser(req);
      res.json({ success: true, data: updated });
    } catch (routeError: any) {
      res
        .status(500)
        .json({ success: false, message: routeError.message || 'Failed to update profile' });
    }
  });
});

router.get('/call-history', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const { rows } = await pool.query(
      `
        WITH call_messages AS (
          SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            m.message_type,
            m.body,
            m.call,
            m.metadata,
            m.created_at
          FROM chat_messages m
          INNER JOIN chat_participants cp
            ON cp.conversation_id = m.conversation_id
            AND cp.user_id = $1
          WHERE m.deleted_at IS NULL
            AND m.message_type IN ('voice_call', 'video_call', 'group_call')
            AND (
              COALESCE((m.metadata->>'privateRecording')::boolean, false) = false
              OR m.sender_id = $1
              OR m.metadata->>'visibleOnlyToUserId' = $1
            )
          ORDER BY m.created_at DESC
          LIMIT 150
        )
        SELECT
          cm.id,
          cm.conversation_id AS "conversationId",
          cm.sender_id AS "senderId",
          cm.message_type AS "messageType",
          cm.body,
          cm.call,
          cm.metadata,
          cm.created_at AS "createdAt",
          sender.display_user_id AS "senderDisplayUserId",
          sender.name AS "senderName",
          sender.email AS "senderEmail",
          sender.image_path AS "senderImagePath",
          CASE WHEN other_user.id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', other_user.id,
            'displayUserId', other_user.display_user_id,
            'email', other_user.email,
            'name', other_user.name,
            'phone', other_user.phone,
            'role', other_user.role,
            'imagePath', other_user.image_path,
            'chatProfileAbout', other_user.chat_profile_about,
            'chatLastSeenAt', other_user.chat_last_seen_at,
            'chatPresenceHidden', COALESCE(other_user.chat_presence_hidden, false),
            'chatOnline', (
              COALESCE(other_user.chat_presence_hidden, false) = false
              AND other_user.chat_last_seen_at >= now() - interval '90 seconds'
            )
          ) END AS "otherUser"
        FROM call_messages cm
        INNER JOIN users sender ON sender.id = cm.sender_id
        LEFT JOIN LATERAL (
          SELECT u.*
          FROM chat_participants cp
          INNER JOIN users u ON u.id = cp.user_id
          WHERE cp.conversation_id = cm.conversation_id
            AND cp.user_id <> $1
            AND u.is_deleted = false
          ORDER BY cp.joined_at ASC
          LIMIT 1
        ) other_user ON true
        ORDER BY cm.created_at DESC
      `,
      [user.id],
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to load call history' });
  }
});

router.get('/bootstrap', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const conversations = await getConversations(user.id);

    res.json({
      success: true,
      data: {
        currentUser: user,
        conversations,
        features: {
          webChat: true,
          mobileChat: true,
          imageSharing: true,
          videoSharing: true,
          locationSharing: true,
          customEmojis: true,
          voiceCall: true,
          videoCall: true,
          groupCall: true,
          broadcast: true,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load chat' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const search = String(req.query.search || '').trim();
    const normalizedSearch = search.toLowerCase();
    const digits = search.replace(/\D/g, '');

    if (normalizedSearch.length < 3 && digits.length < 3) {
      res.json({ success: true, data: [] });
      return;
    }

    const searchLike = `%${normalizedSearch}%`;
    const phoneDigits = digits.length >= 3 ? digits : '';
    const digitLike = `%${phoneDigits}%`;
    const uidSearch = normalizedSearch
      .replace(/^uid/i, '')
      .replace(/\D/g, '')
      .replace(/^0+(?=\d)/, '');

    const { rows } = await pool.query(
      `
        SELECT
          u.id,
          u.display_user_id AS "displayUserId",
          u.email,
          u.name,
          u.phone,
          u.role,
          u.image_path AS "imagePath",
          u.chat_profile_about AS "chatProfileAbout",
          u.chat_last_seen_at AS "chatLastSeenAt",
          COALESCE(u.chat_presence_hidden, false) AS "chatPresenceHidden",
          (
            COALESCE(u.chat_presence_hidden, false) = false
            AND u.chat_last_seen_at >= now() - interval '90 seconds'
          ) AS "chatOnline"
        FROM users u
        WHERE u.id <> $1
          AND u.is_deleted = false
          AND (
            lower(u.email) LIKE $2
            OR lower(coalesce(u.name, '')) LIKE $2
            OR ($3 <> '' AND regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') LIKE $4)
            OR ($5 <> '' AND u.display_user_id::text LIKE $6)
          )
        ORDER BY COALESCE(NULLIF(u.name, ''), u.email) ASC
        LIMIT 20
      `,
      [user.id, searchLike, phoneDigits, digitLike, uidSearch, `%${uidSearch}%`],
    );

    res.json({ success: true, data: rows.map(compactUser) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to search users' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    res.json({ success: true, data: await getConversations(user.id) });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to load conversations' });
  }
});

router.post('/conversations', async (req, res) => {
  const client = await pool.connect();
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const type = normalizeConversationType(req.body?.type);
    const title = String(req.body?.title || '').trim() || null;
    const rawParticipantIds = Array.isArray(req.body?.participantIds)
      ? req.body.participantIds
      : [];
    const participantIds = Array.from(
      new Set(rawParticipantIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)),
    ).filter((id) => id !== user.id);

    if (!participantIds.length) {
      res.status(400).json({ success: false, message: 'Select at least one user' });
      return;
    }

    if (type === 'direct' && participantIds.length !== 1) {
      res.status(400).json({ success: false, message: 'Direct chat requires exactly one user' });
      return;
    }

    const { rows: validUsers } = await pool.query(
      `SELECT id FROM users WHERE id = ANY($1::varchar[]) AND is_deleted = false`,
      [participantIds],
    );
    const validParticipantIds = validUsers.map((row) => String(row.id));

    if (validParticipantIds.length !== participantIds.length) {
      res
        .status(400)
        .json({ success: false, message: 'One or more selected users are not available' });
      return;
    }

    if (type === 'direct') {
      const { rows: existingRows } = await pool.query(
        `
          SELECT c.id
          FROM chat_conversations c
          INNER JOIN chat_participants current_user_participant
            ON current_user_participant.conversation_id = c.id
            AND current_user_participant.user_id = $1
          INNER JOIN chat_participants other_user_participant
            ON other_user_participant.conversation_id = c.id
            AND other_user_participant.user_id = $2
          WHERE c.type = 'direct'
            AND (
              SELECT COUNT(*)
              FROM chat_participants cp
              WHERE cp.conversation_id = c.id
            ) = 2
          LIMIT 1
        `,
        [user.id, validParticipantIds[0]],
      );

      if (existingRows[0]) {
        res.status(200).json({
          success: true,
          data: {
            conversationId: existingRows[0].id,
            conversations: await getConversations(user.id),
          },
        });
        return;
      }
    }

    await client.query('BEGIN');
    const { rows: conversationRows } = await client.query(
      `
        INSERT INTO chat_conversations (type, title, created_by, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING id
      `,
      [
        type,
        title || (type === 'broadcast' ? 'Broadcast List' : type === 'group' ? 'New Group' : null),
        user.id,
        JSON.stringify({
          createdFrom: 'account-chat',
          webEnabled: true,
          mobileEnabled: true,
        }),
      ],
    );
    const conversationId = conversationRows[0].id;
    const allParticipants = [user.id, ...validParticipantIds];

    for (const participantId of allParticipants) {
      await client.query(
        `
          INSERT INTO chat_participants (conversation_id, user_id, role)
          VALUES ($1::uuid, $2, $3)
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [conversationId, participantId, participantId === user.id ? 'owner' : 'member'],
      );
    }

    await client.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1::uuid`, [
      conversationId,
    ]);
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        conversationId,
        conversations: await getConversations(user.id),
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    res.status(500).json({ success: false, message: error.message || 'Failed to create chat' });
  } finally {
    client.release();
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const conversationId = String(req.params.id || '').trim();
    if (!(await ensureParticipant(conversationId, user.id))) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const { rows } = await pool.query(
      `
        SELECT
          m.id,
          m.conversation_id AS "conversationId",
          m.sender_id AS "senderId",
          m.message_type AS "messageType",
          m.body,
          m.attachments,
          m.location,
          m.emoji,
          m.call,
          m.metadata,
          m.created_at AS "createdAt",
          m.edited_at AS "editedAt",
          u.display_user_id AS "senderDisplayUserId",
          u.name AS "senderName",
          u.email AS "senderEmail",
          u.image_path AS "senderImagePath",
          (
            SELECT jsonb_build_object(
              'recipientCount', COUNT(*) FILTER (WHERE cp.user_id <> m.sender_id),
              'deliveredCount', COUNT(*) FILTER (
                WHERE cp.user_id <> m.sender_id
                  AND (
                    cp.last_read_at >= m.created_at
                    OR recipient.chat_last_seen_at >= m.created_at
                  )
              ),
              'readCount', COUNT(*) FILTER (
                WHERE cp.user_id <> m.sender_id
                  AND cp.last_read_at >= m.created_at
              )
            )
            FROM chat_participants cp
            INNER JOIN users recipient ON recipient.id = cp.user_id
            WHERE cp.conversation_id = m.conversation_id
          ) AS receipts
        FROM chat_messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1::uuid AND m.deleted_at IS NULL
          AND (
            COALESCE((m.metadata->>'privateRecording')::boolean, false) = false
            OR m.sender_id = $2
            OR m.metadata->>'visibleOnlyToUserId' = $2
          )
        ORDER BY m.created_at ASC
        LIMIT 300
      `,
      [conversationId, user.id],
    );

    const { rowCount: readRowsChanged } = await pool.query(
      `
        UPDATE chat_participants
        SET last_read_at = now()
        WHERE conversation_id = $1::uuid AND user_id = $2
          AND EXISTS (
            SELECT 1
            FROM chat_messages m
            WHERE m.conversation_id = chat_participants.conversation_id
              AND m.sender_id <> $2
              AND m.deleted_at IS NULL
              AND m.created_at > COALESCE(chat_participants.last_read_at, 'epoch'::timestamp)
          )
      `,
      [conversationId, user.id],
    );

    if (readRowsChanged > 0) {
      try {
        const io = getIO();
        io.to(`chat:conversation:${conversationId}`).emit('chat:message:read', {
          conversationId,
          userId: user.id,
          readAt: new Date().toISOString(),
        });
      } catch {
        // Socket server is not available during isolated route tests.
      }
    }

    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load messages' });
  }
});

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const conversationId = String(req.params.id || '').trim();
    if (!(await ensureParticipant(conversationId, user.id))) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const messageType = normalizeMessageType(req.body?.messageType);
    const body = String(req.body?.body || '').trim();
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const location =
      req.body?.location && typeof req.body.location === 'object' ? req.body.location : null;
    const emoji = req.body?.emoji && typeof req.body.emoji === 'object' ? req.body.emoji : null;
    const call = req.body?.call && typeof req.body.call === 'object' ? req.body.call : null;
    const metadata =
      req.body?.metadata && typeof req.body.metadata === 'object' ? { ...req.body.metadata } : {};
    if (metadata.privateRecording || metadata.recordingVisibility === 'private') {
      metadata.privateRecording = true;
      metadata.recordingVisibility = 'private';
      metadata.visibleOnlyToUserId = user.id;
    }

    if (!body && attachments.length === 0 && !location && !emoji && !call) {
      res.status(400).json({ success: false, message: 'Message is empty' });
      return;
    }

    const { rows } = await pool.query(
      `
        INSERT INTO chat_messages (
          conversation_id,
          sender_id,
          message_type,
          body,
          attachments,
          location,
          emoji,
          call,
          metadata
        )
        VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
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
          created_at AS "createdAt"
      `,
      [
        conversationId,
        user.id,
        messageType,
        body || null,
        JSON.stringify(attachments),
        location ? JSON.stringify(location) : null,
        emoji ? JSON.stringify(emoji) : null,
        call ? JSON.stringify(call) : null,
        JSON.stringify(metadata),
      ],
    );

    await pool.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1::uuid`, [
      conversationId,
    ]);
    await pool.query(
      `UPDATE chat_participants SET last_read_at = now() WHERE conversation_id = $1::uuid AND user_id = $2`,
      [conversationId, user.id],
    );

    const targetUserIds = await getConversationPushTargets(conversationId, user.id);
    try {
      const io = getIO();
      io.to(`chat:conversation:${conversationId}`).emit('chat:message:new', rows[0]);
      for (const targetUserId of targetUserIds) {
        io.to(`chat:user:${targetUserId}`).emit('chat:conversation:updated', {
          conversationId,
          messageId: rows[0].id,
        });
      }
    } catch {
      // Socket server is not available during isolated route tests.
    }

    if (targetUserIds.length && !metadata.privateRecording) {
      void sendPremiumChatPush({
        targetUserIds,
        title: chatDisplayName(user),
        body: chatMessagePushBody(messageType, body, attachments),
        data: {
          type: 'premium_chat_message',
          conversationId,
          messageId: rows[0].id,
          fromUserId: user.id,
          fromName: chatDisplayName(user),
          fromEmail: user.email,
          messageType,
        },
      }).catch((error) => {
        console.warn(
          'Premium chat message push failed:',
          error instanceof Error ? error.message : error,
        );
      });
    }

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to send message' });
  }
});

router.post('/conversations/:id/call-request', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const conversationId = String(req.params.id || '').trim();
    if (!(await ensureParticipant(conversationId, user.id))) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const mode = ['video', 'group'].includes(String(req.body?.mode || ''))
      ? String(req.body.mode)
      : 'voice';
    const targetUserIds = await getConversationPushTargets(conversationId, user.id);
    const callId = String(req.body?.callId || randomUUID());

    const result = await sendPremiumChatPush({
      targetUserIds,
      title:
        mode === 'video'
          ? 'Incoming Premium Video Call'
          : mode === 'group'
            ? 'Incoming Premium Group Call'
            : 'Incoming Premium Voice Call',
      body: `${chatDisplayName(user)} is calling you in Premium Chat.`,
      androidChannelId: 'chat_call_channel',
      data: {
        type: 'premium_chat_call',
        callId,
        conversationId,
        mode,
        fromUserId: user.id,
        fromName: chatDisplayName(user),
        fromEmail: user.email,
      },
    });

    await pool.query(
      `
        INSERT INTO chat_messages (
          conversation_id,
          sender_id,
          message_type,
          body,
          call,
          metadata
        )
        VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb)
      `,
      [
        conversationId,
        user.id,
        mode === 'video' ? 'video_call' : mode === 'group' ? 'group_call' : 'voice_call',
        mode === 'video'
          ? 'Missed video call'
          : mode === 'group'
            ? 'Missed group call'
            : 'Missed voice call',
        JSON.stringify({
          callId,
          kind: mode,
          status: 'missed',
          platform: 'premium-chat',
          recordedAt: new Date().toISOString(),
        }),
        JSON.stringify({ chatCallEvent: true, callId, callStatus: 'missed' }),
      ],
    );
    await pool.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1::uuid`, [
      conversationId,
    ]);

    res.json({
      success: true,
      data: {
        callId,
        targetUserIds,
        pushAttempted: result.attempted,
        pushSent: result.sent,
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to send call notification' });
  }
});

router.post('/conversations/:id/read', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const conversationId = String(req.params.id || '').trim();
    if (!(await ensureParticipant(conversationId, user.id))) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const { rowCount: readRowsChanged } = await pool.query(
      `
        UPDATE chat_participants
        SET last_read_at = now()
        WHERE conversation_id = $1::uuid AND user_id = $2
          AND EXISTS (
            SELECT 1
            FROM chat_messages m
            WHERE m.conversation_id = chat_participants.conversation_id
              AND m.sender_id <> $2
              AND m.deleted_at IS NULL
              AND m.created_at > COALESCE(chat_participants.last_read_at, 'epoch'::timestamp)
          )
      `,
      [conversationId, user.id],
    );

    if (readRowsChanged > 0) {
      try {
        getIO().to(`chat:conversation:${conversationId}`).emit('chat:message:read', {
          conversationId,
          userId: user.id,
          readAt: new Date().toISOString(),
        });
      } catch {
        // Socket server is not available during isolated route tests.
      }
    }

    res.json({ success: true, data: { conversationId } });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to mark chat as read' });
  }
});

router.get('/storage', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const { rows } = await pool.query(
      `
        SELECT
          m.id,
          m.conversation_id AS "conversationId",
          m.sender_id AS "senderId",
          m.message_type AS "messageType",
          m.body,
          m.attachments,
          m.metadata,
          m.created_at AS "createdAt",
          c.type AS "conversationType",
          c.title AS "conversationTitle",
          sender.name AS "senderName",
          sender.email AS "senderEmail"
        FROM chat_messages m
        INNER JOIN chat_participants cp
          ON cp.conversation_id = m.conversation_id
          AND cp.user_id = $1
        INNER JOIN chat_conversations c ON c.id = m.conversation_id
        INNER JOIN users sender ON sender.id = m.sender_id
        WHERE m.deleted_at IS NULL
          AND jsonb_array_length(m.attachments) > 0
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(m.attachments) file
            WHERE file->>'type' LIKE 'image/%'
              OR file->>'type' LIKE 'video/%'
          )
          AND (
            COALESCE((m.metadata->>'privateRecording')::boolean, false) = false
            OR m.sender_id = $1
            OR m.metadata->>'visibleOnlyToUserId' = $1
          )
        ORDER BY m.created_at DESC
        LIMIT 300
      `,
      [user.id],
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load storage' });
  }
});

router.delete('/storage/messages/:messageId', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    const messageId = String(req.params.messageId || '').trim();
    const { rows } = await pool.query(
      `
        SELECT
          m.id,
          m.conversation_id AS "conversationId",
          m.sender_id AS "senderId",
          m.attachments
        FROM chat_messages m
        INNER JOIN chat_participants cp
          ON cp.conversation_id = m.conversation_id
          AND cp.user_id = $2
        WHERE m.id = $1::uuid
          AND m.deleted_at IS NULL
        LIMIT 1
      `,
      [messageId, user.id],
    );

    const message = rows[0];
    if (!message) {
      res.status(404).json({ success: false, message: 'Media message not found' });
      return;
    }

    if (message.senderId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'You can delete only media messages you sent',
      });
      return;
    }

    await pool.query(`UPDATE chat_messages SET deleted_at = now() WHERE id = $1::uuid`, [
      messageId,
    ]);
    await pool.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1::uuid`, [
      message.conversationId,
    ]);

    try {
      getIO().to(`chat:conversation:${message.conversationId}`).emit('chat:message:deleted', {
        conversationId: message.conversationId,
        messageId,
      });
    } catch {
      // Socket server is not available during isolated route tests.
    }

    await deleteUnreferencedChatFiles(Array.isArray(message.attachments) ? message.attachments : []);

    res.json({
      success: true,
      data: {
        messageId,
        conversationId: message.conversationId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete media' });
  }
});

router.post('/uploads', async (req, res) => {
  try {
    const user = await requireChatUser(req, res);
    if (!user) return;

    chatUpload.array('files', 8)(req, res, (error: any) => {
      if (error) {
        const message =
          error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
            ? 'Each chat file must be 500MB or smaller'
            : error.message || 'Failed to upload chat file';

        res.status(400).json({ success: false, message });
        return;
      }

      const files = ((req.files as Express.Multer.File[]) || []).map((file) => ({
        name: file.originalname,
        url: `/uploads/chat/${file.filename}`,
        type: file.mimetype,
        size: file.size,
      }));

      if (!files.length) {
        res.status(400).json({ success: false, message: 'No chat files uploaded' });
        return;
      }

      res.status(201).json({ success: true, data: { files } });
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || 'Failed to upload chat file' });
  }
});

export default router;
