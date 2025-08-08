


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import * as mailService from './mailService';
import * as dbService from './databaseService';
import { User } from '../types';
import crypto from 'crypto';
import { Transporter } from 'nodemailer';
import Imap from 'node-imap';

declare global {
  namespace Express {
    interface Request {
      credentials?: { 
        userId: string;
        user: User;
        imap: Imap;
        smtp: Transporter;
      };
    }
  }
}

const app = express();
const PORT = 3001;

// --- Middleware Setup ---
app.use(helmet());
app.use(cors());
app.use(express.json());


// In-memory stores for active connections and sessions.
// In production, sessionStore should be a persistent store like Redis.
// Connection stores are necessarily in-memory.
const sessionStore: Record<string, { userId: string, user: User, lastAccessed: number }> = {};
const imapConnections: Record<string, Imap> = {};
const smtpTransporters: Record<string, Transporter> = {};
const SESSION_TTL = 3600 * 1000; // 1 hour

// Middleware to attach user connections to the request if authenticated
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && sessionStore[token]) {
        const session = sessionStore[token];
        const imap = imapConnections[token];
        const smtp = smtpTransporters[token];

        // If session or connections are gone, or session expired, treat as unauthenticated
        if (!imap || !smtp || (Date.now() - session.lastAccessed > SESSION_TTL)) {
            if (imap) imap.end();
            if (smtp) smtp.close();
            delete imapConnections[token];
            delete smtpTransporters[token];
            delete sessionStore[token];
            return res.status(401).json({ message: "Session expired or invalid." });
        }
        
        session.lastAccessed = Date.now();
        req.credentials = { userId: session.userId, user: session.user, imap, smtp };
        return next();
    }
    res.status(401).json({ message: "Not authenticated" });
};


// --- API Routes ---

// Auth
app.post('/api/login', async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        // 1. Validate credentials
        const user = await mailService.login(email, password);
        const dbUser = await dbService.findOrCreateUser(user.email);
        
        // 2. Create persistent connections for the session
        const imap = await mailService.createImapConnection(email, password);
        const smtp = mailService.createSmtpTransport(email, password);

        const token = crypto.randomBytes(32).toString('hex');

        // 3. Store connections and session info
        sessionStore[token] = { userId: dbUser.id, user, lastAccessed: Date.now() };
        imapConnections[token] = imap;
        smtpTransporters[token] = smtp;
        
        // Handle connection closing on error/end to clean up all related stores
        const cleanup = () => {
            console.log(`Cleaning up connections for token ${token}`);
            const aSmtp = smtpTransporters[token];
            if (aSmtp) aSmtp.close();
            delete imapConnections[token];
            delete smtpTransporters[token];
            delete sessionStore[token];
        };
        imap.once('end', cleanup);
        imap.once('error', (err) => {
            console.error('Persistent IMAP connection error:', err);
            // 'end' will be called automatically, triggering cleanup
        });


        res.json({ user, token });

    } catch (error: any) {
        console.error("Login failed:", error.message);
        res.status(401).json({ message: 'Invalid email or password' });
    }
});

app.post('/api/logout', (req: express.Request, res: express.Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        const imap = imapConnections[token];
        if (imap) {
            imap.end(); // This will trigger the 'end' event and associated cleanup
        } else {
            // If imap is already gone, clean up others just in case
            const smtp = smtpTransporters[token];
            if(smtp) smtp.close();
            delete smtpTransporters[token];
            delete sessionStore[token];
        }
    }
    res.status(200).json({ message: "Logged out successfully."});
});


app.get('/api/session', (req: express.Request, res: express.Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && sessionStore[token]) {
        const session = sessionStore[token];
        if (Date.now() - session.lastAccessed < SESSION_TTL) {
            session.lastAccessed = Date.now();
            return res.json({ user: session.user });
        }
    }
    res.status(401).json({ message: "No active session" });
});

// All subsequent routes that need authentication will use this middleware
app.use('/api', authenticate);


// Initial Data
app.get('/api/initial-data', async (req: express.Request, res: express.Response) => {
    try {
        const { imap, userId } = req.credentials!;
        
        const [emails, labels, userFolders, contacts, contactGroups, appSettings] = await Promise.all([
            mailService.getEmailsForUser(imap),
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
app.post('/api/conversations/move', async (req: express.Request, res: express.Response) => {
    const { conversationIds, targetFolderId } = req.body;
    const { imap } = req.credentials!;
    const emails = await mailService.moveConversations(imap, conversationIds, targetFolderId);
    res.json({ emails });
});

app.post('/api/conversations/delete-permanently', async (req: express.Request, res: express.Response) => {
    const { conversationIds } = req.body;
    const { imap } = req.credentials!;
    const emails = await mailService.deleteConversationsPermanently(imap, conversationIds);
    res.json({ emails });
});

app.post('/api/conversations/toggle-label', async (req: express.Request, res: express.Response) => {
    const { conversationIds, labelId } = req.body;
    const { imap, userId } = req.credentials!;
    const label = await dbService.getLabelById(labelId, userId);
    if (!label) return res.status(404).json({message: "Label not found"});
    const emails = await mailService.toggleLabelOnConversations(imap, conversationIds, label.name);
    res.json({ emails });
});

app.post('/api/conversations/mark-read', async (req: express.Request, res: express.Response) => {
    const { conversationIds, isRead } = req.body;
    const { imap } = req.credentials!;
    const emails = await mailService.markConversationsAsRead(imap, conversationIds, isRead);
    res.json({ emails });
});

app.post('/api/emails/send', async (req: express.Request, res: express.Response) => {
    const { data, user, conversationId, draftId } = req.body;
    const { smtp, imap } = req.credentials!;
    const emails = await mailService.sendEmail({ data, user, smtp, imap, conversationId, draftId });
    res.json({ emails });
});

app.post('/api/emails/draft', async (req: express.Request, res: express.Response) => {
    const { data, user, conversationId, draftId } = req.body;
    const { imap } = req.credentials!;
    const { emails, newDraftId } = await mailService.saveDraft({ data, user, imap, conversationId, draftId });
    res.json({ emails, newDraftId });
});

app.delete('/api/emails/draft', async (req: express.Request, res: express.Response) => {
    const { draftId } = req.body;
    const { imap } = req.credentials!;
    const emails = await mailService.deleteDraft(imap, draftId);
    res.json({ emails });
});

// Labels
app.post('/api/labels', async (req: express.Request, res: express.Response) => {
    const { name, color } = req.body;
    const { userId } = req.credentials!;
    const labels = await dbService.createLabel(name, color, userId);
    res.json({ labels });
});

app.patch('/api/labels/:id', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const updates = req.body;
    const { userId } = req.credentials!;
    const labels = await dbService.updateLabel(id, updates, userId);
    res.json({ labels });
});

app.delete('/api/labels/:id', async (req: express.Request, res: express.Response) => {
    const { id: labelId } = req.params;
    const { imap, userId } = req.credentials!;

    const labelToDelete = await dbService.getLabelById(labelId, userId);
    if (!labelToDelete) {
        return res.status(404).json({ message: "Label not found or you don't have permission." });
    }
    
    const labels = await dbService.deleteLabel(labelId, userId);
    const emails = await mailService.removeLabelFromAllEmails(imap, labelToDelete.name);
    res.json({ labels, emails });
});

// Folders
app.post('/api/folders', async (req: express.Request, res: express.Response) => {
    const { name } = req.body;
    const { userId } = req.credentials!;
    const folders = await dbService.createFolder(name, userId);
    res.json({ folders });
});

app.patch('/api/folders/:id', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { newName } = req.body;
    const { userId } = req.credentials!;
    const folders = await dbService.updateFolder(id, newName, userId);
    res.json({ folders });
});

app.delete('/api/folders/:id', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { imap, userId } = req.credentials!;
    const folderToDelete = await dbService.getFolderById(id, userId);
     if (!folderToDelete) {
        return res.status(404).json({ message: "Folder not found or you don't have permission." });
    }

    const folders = await dbService.deleteFolder(id, userId);
    const emails = await mailService.moveEmailsFromFolder(imap, folderToDelete.name, 'Archive');
    res.json({ folders, emails });
});

// Settings
app.post('/api/settings', async (req: express.Request, res: express.Response) => {
    const { userId } = req.credentials!;
    const settings = await dbService.updateSettings(req.body, userId);
    res.json({ settings });
});

// Contacts & Groups
app.post('/api/contacts', async (req: express.Request, res: express.Response) => {
    const contactData = req.body;
    const { userId } = req.credentials!;
    const { contacts, newContactId } = await dbService.addContact(contactData, userId);
    res.json({ contacts, newContactId });
});

app.put('/api/contacts/:id', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const updatedContact = req.body;
    const { userId } = req.credentials!;
    const contacts = await dbService.updateContact(id, updatedContact, userId);
    res.json({ contacts });
});

app.delete('/api/contacts/:id', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { userId } = req.credentials!;
    const { contacts, groups } = await dbService.deleteContact(id, userId);
    res.json({ contacts, groups });
});

app.post('/api/contacts/import', async (req: express.Request, res: express.Response) => {
    const { newContacts } = req.body;
    const { userId } = req.credentials!;
    const result = await dbService.importContacts(newContacts, userId);
    res.json(result);
});

app.post('/api/contact-groups', async (req: express.Request, res: express.Response) => {
    const { name } = req.body;
    const { userId } = req.credentials!;
    const groups = await dbService.createContactGroup(name, userId);
    res.json({ groups });
});

app.patch('/api/contact-groups/:id', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { newName } = req.body;
    const { userId } = req.credentials!;
    const groups = await dbService.renameContactGroup(id, newName, userId);
    res.json({ groups });
});

app.delete('/api/contact-groups/:id', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { userId } = req.credentials!;
    const groups = await dbService.deleteContactGroup(id, userId);
    res.json({ groups });
});

app.post('/api/contact-groups/:id/members', async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { contactId } = req.body;
    const { userId } = req.credentials!;
    const groups = await dbService.addContactToGroup(id, contactId, userId);
    res.json({ groups });
});

app.delete('/api/contact-groups/:id/members/:contactId', async (req: express.Request, res: express.Response) => {
    const { id, contactId } = req.params;
    const { userId } = req.credentials!;
    const groups = await dbService.removeContactFromGroup(id, contactId, userId);
    res.json({ groups });
});


// --- Frontend Serving ---
// This section must come AFTER all API routes

// Get the directory name of the current module
const __dirname = path.dirname(new URL(import.meta.url).pathname);
// Serve static files from the React app's build directory
const buildPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(buildPath));

// The "catchall" handler: for any request that doesn't match one above,
// send back React's index.html file. This is crucial for client-side routing.
app.get('*', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// --- Server Startup ---
const startServer = async () => {
    await dbService.initDb();
    app.listen(PORT, () => {
        console.log(`🚀 Backend server is running at http://localhost:${PORT}`);
    });
};

startServer();