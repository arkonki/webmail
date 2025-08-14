// --- IMPORTS ---
import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import * as mailService from './mailService';
import * as dbService from './databaseService';
import * as security from './security';
import { User, SystemLabel, SystemFolder, AppSettings } from '../src/types';
import * as wsManager from './wsManager';
import * as imapManager from './imapManager';
import rateLimit from 'express-rate-limit';
import { processScheduledEmails } from './scheduler';
import { logger } from './logger';
import WebSocket from 'ws';
import url from 'url';


declare global {
  namespace Express {
    interface Request {
      credentials?: { user: string; pass: string };
      userId?: string;
      user?: User;
      encryptedCredentials?: string;
    }
  }
}

const app = express();

// --- MIDDLEWARE SETUP ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Trust the first hop from the proxy. This is crucial for rate-limiting to work correctly behind a reverse proxy.
app.set('trust proxy', 1);

// Rate Limiter for Login
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false,
    message: { message: 'Too many login attempts, please try again after 15 minutes.' }
});

// --- SESSION MANAGEMENT ---
const SESSION_TTL = 3600 * 1000; // 1 hour
setInterval(() => { dbService.deleteExpiredSessions(); }, 10 * 60 * 1000);

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const session = await dbService.getSession(token);
        if (session && session.expiresAt.getTime() >= Date.now()) {
            await dbService.touchSession(token, SESSION_TTL);
            try {
                const decryptedPassword = security.decrypt(session.encryptedCredentials);
                req.credentials = { user: session.user.email, pass: decryptedPassword };
                req.encryptedCredentials = session.encryptedCredentials;
                req.userId = session.userId;
                req.user = session.user;
                return next();
            } catch (error) {
                 logger.error('Session decryption failed, deleting session.', { token, error });
                 await dbService.deleteSession(token);
                 return res.status(401).json({ message: "Invalid session credentials." });
            }
        }
        if (session) await dbService.deleteSession(token);
    }
    res.status(401).json({ message: "Not authenticated or session expired" });
};

// --- API ROUTES ---
app.post('/api/login', loginLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body;
    logger.info('Login attempt initiated', { email });
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        logger.warn('Login failed: missing email or password');
        return res.status(400).json({ message: "Email and password are required." });
    }
    try {
        // Step 1: Validate credentials against the IMAP server.
        await mailService.login(email, password);
        logger.info('IMAP validation successful', { email });

        // Step 2: Get the full user profile from our database. This is the source of truth for user info.
        const dbUser = await dbService.findOrCreateUser(email);
        
        // Step 3: Encrypt credentials and create a session token.
        const encryptedCredentials = security.encrypt(password);
        const token = crypto.randomBytes(32).toString('hex');
        
        // Step 4: Create the session using the correct user object from our DB.
        await dbService.createSession(token, dbUser.id, dbUser, encryptedCredentials, SESSION_TTL);
        logger.info('User session created in DB', { userId: dbUser.id });
        
        // Step 5: Sync mail server folders with our database.
        const folders = await dbService.reconcileFolders(dbUser.id, await mailService.getImapFolders({ user: email, pass: password }));
        
        // Step 6: Send the successful response to the client using the correct user object.
        logger.info('Login successful', { userId: dbUser.id });
        res.json({ user: dbUser, token, folders });
    } catch (error: any) {
        logger.error('An error occurred during login', { email, error: error.message });
        res.status(401).json({ message: 'Invalid email or password, or a server error occurred during login.' });
    }
});

app.use('/api', authenticate);

app.post('/api/logout', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const session = await dbService.getSession(token);
        if (session) {
            logger.info('Stopping IMAP manager for user on logout', { userId: session.userId });
            await imapManager.stop(session.userId!);
            await dbService.deleteSession(token);
        }
    }
    logger.info('Logout successful', { userId: req.userId });
    res.status(200).json({ message: "Logged out successfully."});
});

app.get('/api/session', (req: Request, res: Response) => {
    logger.info('Session check successful', { userId: req.userId });
    res.json({ user: req.user });
});

app.get('/api/initial-data', async (req: Request, res: Response) => {
    try {
        logger.info('Fetching initial data for user', { userId: req.userId });
        const { credentials, userId } = req;
        const [emails, labels, userFolders, contacts, contactGroups, appSettings] = await Promise.all([
            mailService.getEmailsForUser(credentials!, userId!),
            dbService.getLabels(userId!),
            dbService.getUserFolders(userId!),
            dbService.getContacts(userId!),
            dbService.getContactGroups(userId!),
            dbService.getAppSettings(userId!)
        ]);
        logger.info('Successfully fetched initial data', { userId: req.userId, emailCount: emails.length });
        res.json({ emails, labels, userFolders, contacts, contactGroups, appSettings });
    } catch (error) {
        logger.error('Failed to fetch initial data', { userId: req.userId, error });
        res.status(500).json({ message: "Failed to fetch initial data. Please check server logs for details."});
    }
});

// Mail Actions
app.post('/api/conversations/move', async (req: Request, res: Response) => {
    const { conversationIds, targetFolderId } = req.body;
    logger.info('Request to move conversations', { userId: req.userId, count: conversationIds?.length, targetFolderId });
    if (!Array.isArray(conversationIds) || typeof targetFolderId !== 'string') {
        return res.status(400).json({ message: "Invalid input." });
    }
    const { credentials, userId } = req;
    const emails = await mailService.moveConversations(credentials!, conversationIds, targetFolderId, userId!);
    res.json({ emails });
});

app.post('/api/conversations/delete-permanently', async (req: Request, res: Response) => {
    const { conversationIds } = req.body;
    logger.info('Request to delete conversations permanently', { userId: req.userId, count: conversationIds?.length });
    if (!Array.isArray(conversationIds)) return res.status(400).json({ message: "Invalid input." });
    const { credentials, userId } = req;
    const emails = await mailService.deleteConversationsPermanently(credentials!, conversationIds, userId!);
    res.json({ emails });
});

app.post('/api/conversations/set-label-state', async (req: Request, res: Response) => {
    const { messageIds, labelId, state } = req.body;
    logger.info('Request to set label state', { userId: req.userId, labelId, state, messageCount: messageIds?.length });
    if (!Array.isArray(messageIds) || typeof labelId !== 'string' || typeof state !== 'boolean') {
        return res.status(400).json({ message: "Invalid input." });
    }
    const { credentials, userId } = req;

    let labelName: string;
    if (labelId === SystemLabel.STARRED) {
        labelName = SystemLabel.STARRED;
    } else {
        const label = await dbService.getLabelById(labelId, userId!);
        if (!label) return res.status(404).json({ message: "Label not found" });
        labelName = label.name;
    }

    const emails = await mailService.setLabelOnMessages(credentials!, messageIds, labelName, state, userId!);
    res.json({ emails });
});

app.post('/api/conversations/mark-read', async (req: Request, res: Response) => {
    const { conversationIds, isRead } = req.body;
    logger.info('Request to mark conversations as read/unread', { userId: req.userId, isRead, count: conversationIds?.length });
    if (!Array.isArray(conversationIds) || typeof isRead !== 'boolean') return res.status(400).json({ message: "Invalid input." });
    const { credentials, userId } = req;
    const emails = await mailService.markConversationsAsRead(credentials!, conversationIds, isRead, userId!);
    res.json({ emails });
});

app.post('/api/emails/send', async (req: Request, res: Response) => {
    const { data, conversationId, draftId } = req.body;
    logger.info('Request to send email', { userId: req.userId, to: data?.to, subject: data?.subject, scheduled: !!data?.scheduleDate });
    const { credentials, encryptedCredentials, user } = req;

    if (!data || !user || !credentials || !encryptedCredentials) {
        return res.status(400).json({ message: "Invalid email data or authentication." });
    }

    const emails = await mailService.sendEmail({ data, user, credentials, encryptedCredentials, conversationId, draftId });
    res.json({ emails });
});

app.post('/api/emails/draft', async (req: Request, res: Response) => {
    const { data, user, conversationId, draftId } = req.body;
    logger.info('Request to save draft', { userId: req.userId, subject: data?.subject });
    if (!data || !user) return res.status(400).json({ message: "Invalid draft data." });
    const { credentials } = req;
    const { emails, newDraftId } = await mailService.saveDraft({ data, user, credentials: credentials!, conversationId, draftId });
    res.json({ emails, newDraftId });
});

app.delete('/api/emails/draft', async (req: Request, res: Response) => {
    const { draftId } = req.body;
    logger.info('Request to delete draft', { userId: req.userId, draftId });
    if (typeof draftId !== 'string') return res.status(400).json({ message: "Invalid draft ID." });
    const { credentials, userId } = req;
    const emails = await mailService.deleteDraft(credentials!, draftId, userId!);
    res.json({ emails });
});

app.post('/api/onboarding', async (req: Request, res: Response) => {
    logger.info('Completing onboarding for user', { userId: req.userId });
    if (!req.userId) return res.status(401).json({ message: "Not authenticated" });
    
    try {
        const data: Partial<AppSettings> = req.body;
        const { settings, contacts } = await dbService.completeOnboarding(req.userId, data);
        res.json({ settings, contacts });
    } catch (error) {
        logger.error('Failed to complete onboarding', { userId: req.userId, error });
        res.status(500).json({ message: "Failed to save onboarding data." });
    }
});

// Other routes (Labels, Folders, etc.) would be similarly instrumented with logging...

// --- FRONTEND SERVING ---
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const buildPath = path.resolve(__dirname, '..');
app.use(express.static(buildPath));
app.get('*', (req: Request, res: Response) => res.sendFile(path.join(buildPath, 'index.html')));


// --- SERVER STARTUP ---
const startServer = async () => {
    await dbService.initDb();
    setInterval(processScheduledEmails, 30 * 1000);

    const SOCKET_PATH = process.env.SOCKET_PATH;
    let server;
    if (SOCKET_PATH) {
        if (fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
        }
        server = app.listen(SOCKET_PATH, () => {
            fs.chmodSync(SOCKET_PATH, '660');
            logger.info(`Backend server is running and listening on socket: ${SOCKET_PATH}`);
        });
    } else {
        const PORT = process.env.PORT || 3001;
        server = app.listen(Number(PORT), () => {
            // Bind to 0.0.0.0 to be compatible with containerized environments like Render
            logger.info(`Backend server is running and listening on port ${PORT}`);
        });
    }

    // --- WebSocket Server Setup ---
    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', async (request, socket, head) => {
        const { query } = url.parse(request.url || '', true);
        const token = query.token as string;
        
        if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        try {
            const session = await dbService.getSession(token);
            if (!session) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                (ws as WebSocket & { userId: string }).userId = session.userId; // Attach userId to the ws instance
                wss.emit('connection', ws, request);
            });
        } catch (error) {
            logger.error('Error during WebSocket upgrade authentication', { error });
            socket.destroy();
        }
    });

    wss.on('connection', async (ws: WebSocket & { userId: string }, req) => {
        const { userId } = ws;
        logger.info('WebSocket client connected', { userId });
        wsManager.add(userId, ws);

        const session = await dbService.getSession(url.parse(req.url!, true).query.token as string);
        if (session) {
            try {
                const decryptedPassword = security.decrypt(session.encryptedCredentials);
                const credentials = { user: session.user.email, pass: decryptedPassword };
                imapManager.start(userId, credentials);
            } catch (e) {
                logger.error('Failed to start IMAP manager on WS connection', { userId, error: e });
            }
        }
        
        ws.on('close', () => {
            logger.info('WebSocket client disconnected', { userId });
            wsManager.remove(userId, ws);
            if (wsManager.getConnectionCount(userId) === 0) {
                logger.info('All WS clients disconnected, stopping IMAP manager.', { userId });
                imapManager.stop(userId);
            }
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error', { userId, error });
        });
    });
};

startServer();

export {};