/// <reference types="node" />

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { WebSocketServer } from 'ws';
import url from 'url';
import rateLimit from 'express-rate-limit';
import process from 'process';

import * as mailService from './mailService.js';
import * as dbService from './databaseService.js';
import * as security from './security.js';
import { User } from '../src/types.ts';
import crypto from 'crypto';
import * as wsManager from './wsManager.js';
import * as imapManager from './imapManager.js';

declare global {
  namespace Express {
    interface Request { 
      sessionData?: { 
        userId: string;
        user: User;
        credentials: { user: string; pass: string; };
      };
    }
  }
}

const app: Application = express();


// --- Middleware Setup ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));


// --- Session Management ---
const SESSION_TTL = 3600 * 1000; // 1 hour

// Periodically clean up expired sessions from DB
setInterval(() => {
    dbService.deleteExpiredSessions();
}, 10 * 60 * 1000); // every 10 minutes


// Middleware to authenticate requests in a stateless manner
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const session = await dbService.getSession(token);
        
        // Check if session exists and is not expired
        if (session && session.expiresAt.getTime() >= Date.now()) {
            await dbService.touchSession(token, SESSION_TTL);
            try {
                const decryptedPassword = security.decrypt(session.encryptedCredentials);
                req.sessionData = { 
                    userId: session.userId, 
                    user: session.user,
                    credentials: { user: session.user.email, pass: decryptedPassword }
                };
                return next();
            } catch (error) {
                 console.error("Credential decryption failed for token:", token, error);
                 await dbService.deleteSession(token); // Corrupt session, delete it.
                 return res.status(401).json({ message: "Invalid session credentials." });
            }
        }
        
        // If session exists but is expired, or doesn't exist at all, delete it just in case.
        if (session) {
            await dbService.deleteSession(token);
        }
    }
    res.status(401).json({ message: "Not authenticated or session expired" });
};


// --- API Routes ---

// Security: Rate limiting for login
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 requests per window
	standardHeaders: true,
	legacyHeaders: false,
    message: { message: 'Too many login attempts. Please try again after 15 minutes.'}
});

// Auth (unauthenticated)
app.post('/api/login', loginLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            return res.status(400).json({ message: 'Email and password are required and must be strings.' });
        }
        
        const user = await mailService.login(email, password);
        const dbUser = await dbService.findOrCreateUser(user.email);
        const userSettings = await dbService.getAppSettings(dbUser.id);
        
        const encryptedCredentials = security.encrypt(password);
        const token = crypto.randomBytes(32).toString('hex');

        const userPayload = {
            email: user.email,
            name: userSettings.displayName || user.name,
            profilePicture: userSettings.profilePicture,
        };

        await dbService.createSession(token, dbUser.id, userPayload, encryptedCredentials, SESSION_TTL);

        res.json({ user: userPayload, token });

    } catch (error: any) {
        console.error("Login failed:", error.message);
        res.status(401).json({ message: 'Invalid email or password' });
    }
});


// All subsequent routes that need authentication will use this middleware
app.use('/api', authenticate);

// Authenticated Auth routes
app.post('/api/logout', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const session = await dbService.getSession(token);
        if (session) {
            imapManager.stop(session.userId);
        }
        await dbService.deleteSession(token);
    }
    res.status(200).json({ message: "Logged out successfully."});
});

app.get('/api/session', (req: Request, res: Response) => {
    res.json({ user: req.sessionData!.user });
});


// Initial Data
app.get('/api/initial-data', async (req: Request, res: Response) => {
    try {
        const { credentials, userId } = req.sessionData!;
        
        // Sync folders with IMAP server before fetching data
        const imapFolders = await mailService.getImapFolders(credentials);
        await dbService.reconcileFolders(userId, imapFolders);

        const [emails, labels, userFolders, contacts, contactGroups, appSettings] = await Promise.all([
            mailService.getEmailsForUser(credentials),
            dbService.getLabels(userId),
            dbService.getUserFolders(userId),
            dbService.getContacts(userId),
            dbService.getContactGroups(userId),
            dbService.getAppSettings(userId)
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
    if (!Array.isArray(conversationIds) || typeof targetFolderId !== 'string') {
        return res.status(400).json({ message: 'Invalid input.' });
    }
    const { credentials } = req.sessionData!;
    const emails = await mailService.moveConversations(credentials, conversationIds, targetFolderId);
    res.json({ emails });
});

app.post('/api/conversations/delete-permanently', async (req: Request, res: Response) => {
    const { conversationIds } = req.body;
    if (!Array.isArray(conversationIds)) return res.status(400).json({ message: 'Invalid input.' });
    const { credentials } = req.sessionData!;
    const emails = await mailService.deleteConversationsPermanently(credentials, conversationIds);
    res.json({ emails });
});

app.post('/api/conversations/toggle-label', async (req: Request, res: Response) => {
    const { conversationIds, labelId } = req.body;
    if (!Array.isArray(conversationIds) || typeof labelId !== 'string') {
        return res.status(400).json({ message: 'Invalid input.' });
    }
    const { credentials, userId } = req.sessionData!;
    const label = await dbService.getLabelById(labelId, userId);
    if (!label) return res.status(404).json({message: "Label not found"});
    const emails = await mailService.toggleLabelOnConversations(credentials, conversationIds, label.name);
    res.json({ emails });
});

app.post('/api/conversations/mark-read', async (req: Request, res: Response) => {
    const { conversationIds, isRead } = req.body;
    if (!Array.isArray(conversationIds) || typeof isRead !== 'boolean') {
        return res.status(400).json({ message: 'Invalid input.' });
    }
    const { credentials } = req.sessionData!;
    const emails = await mailService.markConversationsAsRead(credentials, conversationIds, isRead);
    res.json({ emails });
});

app.post('/api/emails/send', async (req: Request, res: Response) => {
    const { data, user, conversationId, draftId } = req.body;
    if (!data || typeof data.to !== 'string' || typeof data.subject !== 'string' || typeof data.body !== 'string' || !user) {
        return res.status(400).json({ message: 'Invalid email data.' });
    }
    const { credentials } = req.sessionData!;
    const emails = await mailService.sendEmail({ data, user, credentials, conversationId, draftId });
    res.json({ emails });
});

app.post('/api/emails/draft', async (req: Request, res: Response) => {
    const { data, user, conversationId, draftId } = req.body;
    if (!data || typeof data.body !== 'string' || !user) { // Drafts can have empty to/subject
        return res.status(400).json({ message: 'Invalid draft data.' });
    }
    const { credentials } = req.sessionData!;
    const { emails, newDraftId } = await mailService.saveDraft({ data, user, credentials, conversationId, draftId });
    res.json({ emails, newDraftId });
});

app.delete('/api/emails/draft', async (req: Request, res: Response) => {
    const { draftId } = req.body;
    if (typeof draftId !== 'string') return res.status(400).json({ message: 'Invalid input.' });
    const { credentials } = req.sessionData!;
    const emails = await mailService.deleteDraft(credentials, draftId);
    res.json({ emails });
});

// Labels
app.post('/api/labels', async (req: Request, res: Response) => {
    const { name, color } = req.body;
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
        return res.status(400).json({ message: 'Label name must be a non-empty string up to 50 characters.' });
    }
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
        return res.status(400).json({ message: 'Color must be a valid hex code (e.g., #RRGGBB).' });
    }
    const { userId } = req.sessionData!;
    const labels = await dbService.createLabel(name.trim(), color, userId);
    res.json({ labels });
});

app.patch('/api/labels/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, color } = req.body;
    if ((name && (typeof name !== 'string' || name.trim().length === 0 || name.length > 50)) || (color && (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)))) {
        return res.status(400).json({ message: 'Invalid input data.' });
    }
    const updates = { name: name?.trim(), color };
    const { userId } = req.sessionData!;
    const labels = await dbService.updateLabel(id, updates, userId);
    res.json({ labels });
});

app.delete('/api/labels/:id', async (req: Request, res: Response) => {
    const { id: labelId } = req.params;
    const { credentials, userId } = req.sessionData!;

    const labelToDelete = await dbService.getLabelById(labelId, userId);
    if (!labelToDelete) {
        return res.status(404).json({ message: "Label not found or you don't have permission." });
    }
    
    const labels = await dbService.deleteLabel(labelId, userId);
    const emails = await mailService.removeLabelFromAllEmails(credentials, labelToDelete.name);
    res.json({ labels, emails });
});

// Folders
app.post('/api/folders', async (req: Request, res: Response) => {
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
        return res.status(400).json({ message: 'Folder name must be a non-empty string up to 50 characters.' });
    }
    const { userId } = req.sessionData!;
    const folders = await dbService.createFolder(name.trim(), userId);
    res.json({ folders });
});

app.patch('/api/folders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newName } = req.body;
    if (typeof newName !== 'string' || newName.trim().length === 0 || newName.length > 50) {
        return res.status(400).json({ message: 'Folder name must be a non-empty string up to 50 characters.' });
    }
    const { userId } = req.sessionData!;
    const folders = await dbService.updateFolder(id, newName.trim(), userId);
    res.json({ folders });
});

app.delete('/api/folders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { credentials, userId } = req.sessionData!;
    const folderToDelete = await dbService.getFolderById(id, userId);
     if (!folderToDelete) {
        return res.status(404).json({ message: "Folder not found or you don't have permission." });
    }

    const folders = await dbService.deleteFolder(id, userId);
    const emails = await mailService.moveEmailsFromFolder(credentials, folderToDelete.name, 'Archive');
    res.json({ folders, emails });
});

app.post('/api/folders/sync', async (req: Request, res: Response) => {
    try {
        const { credentials, userId } = req.sessionData!;
        const imapFolders = await mailService.getImapFolders(credentials);
        const userFolders = await dbService.reconcileFolders(userId, imapFolders);
        res.json({ folders: userFolders });
    } catch (error) {
        console.error("Failed to sync folders:", error);
        res.status(500).json({ message: "Failed to sync folders with mail server." });
    }
});

app.patch('/api/folders/:id/subscription', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isSubscribed } = req.body;
        if (typeof isSubscribed !== 'boolean') {
             return res.status(400).json({ message: 'Invalid input.' });
        }
        const { userId } = req.sessionData!;
        const folders = await dbService.updateFolderSubscription(id, isSubscribed, userId);
        res.json({ folders });
    } catch (error) {
        console.error("Failed to update folder subscription:", error);
        res.status(500).json({ message: "Failed to update subscription." });
    }
});

// Settings
app.post('/api/settings', async (req: Request, res: Response) => {
    if (typeof req.body !== 'object' || req.body === null) {
        return res.status(400).json({ message: 'Invalid settings format.' });
    }
    const { userId } = req.sessionData!;
    const settings = await dbService.updateSettings(req.body, userId);
    res.json({ settings });
});

app.post('/api/onboarding', async (req: Request, res: Response) => {
    const { userId } = req.sessionData!;
    const onboardingData = req.body;
    if (typeof onboardingData !== 'object' || onboardingData === null || typeof onboardingData.displayName !== 'string' || onboardingData.displayName.trim().length === 0) {
        return res.status(400).json({ message: 'Invalid onboarding data. Display name is required.' });
    }
    try {
        const result = await dbService.completeOnboarding(userId, onboardingData);
        res.json(result);
    } catch (error) {
        console.error("Onboarding failed:", error);
        res.status(500).json({ message: "Failed to complete onboarding." });
    }
});

app.patch('/api/settings/profile', async (req: Request, res: Response) => {
    const { userId } = req.sessionData!;
    const profileData = req.body;
    if (typeof profileData !== 'object' || profileData === null || typeof profileData.displayName !== 'string' || profileData.displayName.trim().length === 0) {
        return res.status(400).json({ message: 'Invalid profile data. Display name is required.' });
    }
    try {
        const settings = await dbService.updateProfileSettings(userId, profileData);
        res.json({ settings });
    } catch (error) {
        console.error("Profile update failed:", error);
        res.status(500).json({ message: "Failed to update profile." });
    }
});


// Contacts & Groups
app.post('/api/contacts', async (req: Request, res: Response) => {
    const contactData = req.body;
    if (!contactData || typeof contactData.name !== 'string' || contactData.name.trim().length === 0 || typeof contactData.email !== 'string' || contactData.email.trim().length === 0) {
        return res.status(400).json({ message: 'Invalid contact data. Name and email are required.' });
    }
    const { userId } = req.sessionData!;
    const { contacts, newContactId } = await dbService.addContact(contactData, userId);
    res.json({ contacts, newContactId });
});

app.put('/api/contacts/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updatedContact = req.body;
    if (!updatedContact || typeof updatedContact.name !== 'string' || updatedContact.name.trim().length === 0 || typeof updatedContact.email !== 'string' || updatedContact.email.trim().length === 0) {
        return res.status(400).json({ message: 'Invalid contact data. Name and email are required.' });
    }
    const { userId } = req.sessionData!;
    const contacts = await dbService.updateContact(id, updatedContact, userId);
    res.json({ contacts });
});

app.delete('/api/contacts/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.sessionData!;
    const { contacts, groups } = await dbService.deleteContact(id, userId);
    res.json({ contacts, groups });
});

app.post('/api/contacts/import', async (req: Request, res: Response) => {
    const { newContacts } = req.body;
    if (!Array.isArray(newContacts)) {
        return res.status(400).json({ message: 'Invalid input. Expected an array of contacts.' });
    }
    const { userId } = req.sessionData!;
    const result = await dbService.importContacts(newContacts, userId);
    res.json(result);
});

app.post('/api/contact-groups', async (req: Request, res: Response) => {
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
        return res.status(400).json({ message: 'Group name must be a non-empty string up to 50 characters.' });
    }
    const { userId } = req.sessionData!;
    const groups = await dbService.createContactGroup(name.trim(), userId);
    res.json({ groups });
});

app.patch('/api/contact-groups/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newName } = req.body;
    if (typeof newName !== 'string' || newName.trim().length === 0 || newName.length > 50) {
        return res.status(400).json({ message: 'Group name must be a non-empty string up to 50 characters.' });
    }
    const { userId } = req.sessionData!;
    const groups = await dbService.renameContactGroup(id, newName.trim(), userId);
    res.json({ groups });
});

app.delete('/api/contact-groups/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.sessionData!;
    const groups = await dbService.deleteContactGroup(id, userId);
    res.json({ groups });
});

app.post('/api/contact-groups/:id/members', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { contactId } = req.body;
    if (typeof contactId !== 'string') return res.status(400).json({ message: 'Invalid contactId.' });
    const { userId } = req.sessionData!;
    const groups = await dbService.addContactToGroup(id, contactId, userId);
    res.json({ groups });
});

app.delete('/api/contact-groups/:id/members/:contactId', async (req: Request, res: Response) => {
    const { id, contactId } = req.params;
    const { userId } = req.sessionData!;
    const groups = await dbService.removeContactFromGroup(id, contactId, userId);
    res.json({ groups });
});


// --- Frontend Serving ---
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const buildPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(buildPath));

app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// --- Server Startup ---
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
        console.error(`[WebSocket] Failed to start IMAP session for user ${userId}`, err);
        return ws.close(1011, 'Internal server error');
    }

    ws.on('close', () => {
        wsManager.remove(userId);
        imapManager.stop(userId);
    });
    
    ws.on('error', (error) => {
        console.error(`[WebSocket] Error for user ${userId}:`, error);
    });
});

const startServer = async () => {
    await dbService.initDb();
    
    const SOCKET_PATH = process.env.SOCKET_PATH;
    const PORT = process.env.PORT || 3001;

    if (SOCKET_PATH) {
        const socketPath = path.resolve(SOCKET_PATH);
        if (fs.existsSync(socketPath)) {
            fs.unlinkSync(socketPath);
        }
        server.listen(socketPath, () => {
            fs.chmodSync(socketPath, '660');
            console.log(`🚀 Backend server is listening on UNIX socket: ${socketPath}`);
        });
        const shutdown = () => {
            server.close(() => {
                if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
                process.exit(0);
            });
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } else {
        server.listen(PORT, () => {
            console.log(`🚀 Backend server is running for development at http://localhost:${PORT}`);
        });
    }
};

startServer();