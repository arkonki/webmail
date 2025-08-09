// --- IMPORTS ---
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { WebSocketServer } from 'ws';
import url from 'url';
import crypto from 'crypto';
import * as mailService from './mailService.js';
import * as dbService from './databaseService.js';
import * as security from './security.js';
import { User } from '../src/types.js';
import * as wsManager from './wsManager.js';
import * as imapManager from './imapManager.js';

const app = express();

// --- TYPE AUGMENTATION for Express Request Object ---
declare global {
  namespace Express {
    interface Request {
      credentials?: { user: string; pass: string };
      userId?: string;
      user?: User;
    }
  }
}

// --- MIDDLEWARE SETUP ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

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
                req.userId = session.userId;
                req.user = session.user;
                return next();
            } catch (error) {
                 await dbService.deleteSession(token);
                 return res.status(401).json({ message: "Invalid session credentials." });
            }
        }
        if (session) await dbService.deleteSession(token);
    }
    res.status(401).json({ message: "Not authenticated or session expired" });
};

// --- API ROUTES ---
app.post('/api/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const user = await mailService.login(email, password);
        const dbUser = await dbService.findOrCreateUser(user.email);
        const encryptedCredentials = security.encrypt(password);
        const token = crypto.randomBytes(32).toString('hex');
        await dbService.createSession(token, dbUser.id, user, encryptedCredentials, SESSION_TTL);
        res.json({ user, token });
    } catch (error: any) {
        res.status(401).json({ message: 'Invalid email or password' });
    }
});

app.use('/api', authenticate);

app.post('/api/logout', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const session = await dbService.getSession(token);
        if (session) imapManager.stop(session.userId);
        await dbService.deleteSession(token);
    }
    res.status(200).json({ message: "Logged out successfully."});
});

app.get('/api/session', (req: Request, res: Response) => {
    res.json({ user: req.user });
});

app.get('/api/initial-data', async (req: Request, res: Response) => {
    try {
        const { credentials, userId } = req;
        const [emails, labels, userFolders, contacts, contactGroups, appSettings] = await Promise.all([
            mailService.getEmailsForUser(credentials!),
            dbService.getLabels(userId!),
            dbService.getUserFolders(userId!),
            dbService.getContacts(userId!),
            dbService.getContactGroups(userId!),
            dbService.getAppSettings(userId!)
        ]);
        res.json({ emails, labels, userFolders, contacts, contactGroups, appSettings });
    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        res.status(500).json({ message: "Failed to fetch initial data."});
    }
});

// Mail Actions
app.post('/api/conversations/move', async (req: Request, res: Response) => {
    const { conversationIds, targetFolderId } = req.body;
    const { credentials } = req;
    const emails = await mailService.moveConversations(credentials!, conversationIds, targetFolderId);
    res.json({ emails });
});

app.post('/api/conversations/delete-permanently', async (req: Request, res: Response) => {
    const { conversationIds } = req.body;
    const { credentials } = req;
    const emails = await mailService.deleteConversationsPermanently(credentials!, conversationIds);
    res.json({ emails });
});

app.post('/api/conversations/toggle-label', async (req: Request, res: Response) => {
    const { conversationIds, labelId } = req.body;
    const { credentials, userId } = req;
    const label = await dbService.getLabelById(labelId, userId!);
    if (!label) return res.status(404).json({message: "Label not found"});
    const emails = await mailService.toggleLabelOnConversations(credentials!, conversationIds, label.name);
    res.json({ emails });
});

app.post('/api/conversations/mark-read', async (req: Request, res: Response) => {
    const { conversationIds, isRead } = req.body;
    const { credentials } = req;
    const emails = await mailService.markConversationsAsRead(credentials!, conversationIds, isRead);
    res.json({ emails });
});

app.post('/api/emails/send', async (req: Request, res: Response) => {
    const { data, user, conversationId, draftId } = req.body;
    const { credentials } = req;
    const emails = await mailService.sendEmail({ data, user, credentials: credentials!, conversationId, draftId });
    res.json({ emails });
});

app.post('/api/emails/draft', async (req: Request, res: Response) => {
    const { data, user, conversationId, draftId } = req.body;
    const { credentials } = req;
    const { emails, newDraftId } = await mailService.saveDraft({ data, user, credentials: credentials!, conversationId, draftId });
    res.json({ emails, newDraftId });
});

app.delete('/api/emails/draft', async (req: Request, res: Response) => {
    const { draftId } = req.body;
    const { credentials } = req;
    const emails = await mailService.deleteDraft(credentials!, draftId);
    res.json({ emails });
});

// Labels
app.post('/api/labels', async (req: Request, res: Response) => {
    const { name, color } = req.body;
    const { userId } = req;
    const labels = await dbService.createLabel(name, color, userId!);
    res.json({ labels });
});

app.patch('/api/labels/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const { userId } = req;
    const labels = await dbService.updateLabel(id, updates, userId!);
    res.json({ labels });
});

app.delete('/api/labels/:id', async (req: Request, res: Response) => {
    const { id: labelId } = req.params;
    const { credentials, userId } = req;
    const labelToDelete = await dbService.getLabelById(labelId, userId!);
    if (!labelToDelete) return res.status(404).json({ message: "Label not found." });
    const labels = await dbService.deleteLabel(labelId, userId!);
    const emails = await mailService.removeLabelFromAllEmails(credentials!, labelToDelete.name);
    res.json({ labels, emails });
});

// Folders
app.post('/api/folders', async (req: Request, res: Response) => {
    const { name } = req.body;
    const { userId } = req;
    const folders = await dbService.createFolder(name, userId!);
    res.json({ folders });
});

app.patch('/api/folders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newName } = req.body;
    const { userId } = req;
    const folders = await dbService.updateFolder(id, newName, userId!);
    res.json({ folders });
});

app.delete('/api/folders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { credentials, userId } = req;
    const folderToDelete = await dbService.getFolderById(id, userId!);
    if (!folderToDelete) return res.status(404).json({ message: "Folder not found." });
    const folders = await dbService.deleteFolder(id, userId!);
    const emails = await mailService.moveEmailsFromFolder(credentials!, folderToDelete.name, 'Archive');
    res.json({ folders, emails });
});

app.post('/api/folders/sync', async (req: Request, res: Response) => {
    try {
        const { credentials, userId } = req;
        const imapFolders = await mailService.getImapFolders(credentials!);
        const userFolders = await dbService.reconcileFolders(userId!, imapFolders);
        res.json({ folders: userFolders });
    } catch (error) {
        res.status(500).json({ message: "Failed to sync folders." });
    }
});

app.patch('/api/folders/:id/subscription', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isSubscribed } = req.body;
    const { userId } = req;
    const folders = await dbService.updateFolderSubscription(id, isSubscribed, userId!);
    res.json({ folders });
});

// Settings, Onboarding, and Profile
app.post('/api/settings', async (req: Request, res: Response) => {
    const { userId } = req;
    const settings = await dbService.updateSettings(req.body, userId!);
    res.json({ settings });
});

app.post('/api/onboarding', async (req: Request, res: Response) => {
    const { userId } = req;
    const onboardingData = req.body;
    try {
        const result = await dbService.completeOnboarding(userId!, onboardingData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to complete onboarding." });
    }
});

app.patch('/api/settings/profile', async (req: Request, res: Response) => {
    const { userId } = req;
    const profileData = req.body;
    try {
        const settings = await dbService.updateProfileSettings(userId!, profileData);
        res.json({ settings });
    } catch (error) {
        res.status(500).json({ message: "Failed to update profile." });
    }
});

// Contacts & Groups (omitted for brevity, but would follow the same pattern)

// --- FRONTEND SERVING ---
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const buildPath = path.resolve(__dirname, '..'); // Corrected path
app.use(express.static(buildPath));
app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));

// --- SERVER STARTUP with WebSocket Support ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
    const { query } = url.parse(req.url || '', true);
    const token = query.token as string;
    if (!token) return ws.close(1008, 'Token required');

    const session = await dbService.getSession(token);
    if (!session || session.expiresAt.getTime() < Date.now()) {
        return ws.close(1008, 'Invalid or expired token');
    }
    
    const { userId } = session;
    wsManager.add(userId, ws);

    try {
        const decryptedPassword = security.decrypt(session.encryptedCredentials);
        const credentials = { user: session.user.email, pass: decryptedPassword };
        imapManager.start(userId, credentials);
    } catch (err) {
        return ws.close(1011, 'Internal server error');
    }

    ws.on('close', () => {
        wsManager.remove(userId, ws);
        if (wsManager.getConnectionCount(userId) === 0) {
            imapManager.stop(userId);
        }
    });
    ws.on('error', (error) => console.error(`[WebSocket] Error for user ${userId}:`, error));
});

const startServer = async () => {
    await dbService.initDb();
    const PORT = process.env.PORT || 3001;
    server.listen(Number(PORT), '127.0.0.1', () => {
        console.log(`🚀 Backend server is running and listening on http://localhost:${PORT}`);
    });
};

startServer();
