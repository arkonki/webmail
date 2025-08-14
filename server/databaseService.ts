// This is a mocked/stubbed version of the database service for demonstration and debugging.
// It logs all operations to the new logger, which will help diagnose issues.
// In a real application, this would connect to a PostgreSQL database.

import { User, Label, UserFolder, AppSettings, Contact, ContactGroup, Rule, SystemFolder } from '../src/types';
import { logger } from './logger';

const MOCK_DB = {
    users: new Map<string, any>(),
    sessions: new Map<string, any>(),
    labels: new Map<string, any>(),
    folders: new Map<string, any>(),
    settings: new Map<string, any>(),
    contacts: new Map<string, any>(),
    contactGroups: new Map<string, any>(),
    scheduledSends: new Map<string, any>(),
    imapState: new Map<string, any>(),
};

export const initDb = async () => {
    logger.info("Database service initialized (mock).");
};

// --- Sessions ---
export const createSession = async (token: string, userId: string, user: User, encryptedCredentials: string, ttl: number): Promise<void> => {
    const expiresAt = new Date(Date.now() + ttl);
    logger.info("DB: Creating session", { userId, expiresAt });
    MOCK_DB.sessions.set(token, { token, userId, user, encryptedCredentials, expiresAt });
};
export const getSession = async (token: string): Promise<any> => {
    const session = MOCK_DB.sessions.get(token);
    logger.debug("DB: Getting session", { token, found: !!session });
    return session;
};
export const deleteSession = async (token: string): Promise<void> => {
    logger.info("DB: Deleting session", { token });
    MOCK_DB.sessions.delete(token);
};
export const touchSession = async (token: string, ttl: number): Promise<void> => {
    const session = MOCK_DB.sessions.get(token);
    if (session) {
        session.expiresAt = new Date(Date.now() + ttl);
        MOCK_DB.sessions.set(token, session);
    }
};
export const deleteExpiredSessions = async (): Promise<void> => {
    logger.debug("DB: Checking for expired sessions...");
    const now = Date.now();
    let deletedCount = 0;
    for (const [token, session] of MOCK_DB.sessions.entries()) {
        if (session.expiresAt.getTime() < now) {
            MOCK_DB.sessions.delete(token);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        logger.info(`DB: Deleted ${deletedCount} expired sessions.`);
    }
};

// --- Users ---
export const findOrCreateUser = async (email: string): Promise<User & { id: string }> => {
    let user = Array.from(MOCK_DB.users.values()).find(u => u.email === email);
    if (user) {
        logger.info("DB: Found existing user", { email, userId: user.id });
        return user;
    }
    const id = `user_${Date.now()}`;
    const name = email.split('@')[0];
    user = { id, email, name };
    MOCK_DB.users.set(id, user);
    logger.info("DB: Created new user", { email, userId: id });
    return user;
};

export const getUserById = async (userId: string): Promise<(User & {id: string}) | null> => {
    const user = MOCK_DB.users.get(userId);
    logger.debug("DB: Get user by ID", { userId, found: !!user });
    return user ? { ...user, id: userId } : null;
}

// --- Folders ---
export const reconcileFolders = async (userId: string, imapFolders: any[]): Promise<UserFolder[]> => {
    logger.info("DB: Reconciling folders with IMAP server", { userId, count: imapFolders.length });

    // Clear existing IMAP folders for this user to avoid stale data in this mock scenario
    for (const [id, folder] of MOCK_DB.folders.entries()) {
        if (folder.userId === userId && folder.source === 'imap') {
            MOCK_DB.folders.delete(id);
        }
    }

    const specialUseMap = new Map<string, SystemFolder>([
        ['\\Inbox', SystemFolder.INBOX],
        ['\\Sent', SystemFolder.SENT],
        ['\\Drafts', SystemFolder.DRAFTS],
        ['\\Trash', SystemFolder.TRASH],
        ['\\Junk', SystemFolder.SPAM],
        ['\\Archive', SystemFolder.ARCHIVE],
    ]);

    function flattenAndProcess(folders: any[], parentId: string | null) {
        for (const folder of folders) {
            const specialUseName = folder.specialUse ? specialUseMap.get(folder.specialUse) : null;
            const newFolder: UserFolder = {
                id: `${userId}_${folder.path}`,
                name: specialUseName || folder.name,
                userId: userId,
                path: folder.path,
                isSubscribed: folder.subscribed,
                source: 'imap',
                parentId: parentId,
                specialUse: folder.specialUse || null,
            };
            MOCK_DB.folders.set(newFolder.id, newFolder);

            if (folder.children?.length) {
                flattenAndProcess(folder.children, newFolder.id);
            }
        }
    }
    
    flattenAndProcess(imapFolders, null);

    // Ensure our custom 'Scheduled' folder exists if it doesn't come from IMAP
    const scheduledFolderExists = Array.from(MOCK_DB.folders.values()).some(f => f.userId === userId && f.name === SystemFolder.SCHEDULED);
    if (!scheduledFolderExists) {
        const scheduledFolder: UserFolder = {
            id: `${userId}_${SystemFolder.SCHEDULED}`,
            name: SystemFolder.SCHEDULED,
            userId: userId,
            path: SystemFolder.SCHEDULED,
            isSubscribed: true,
            source: 'user',
            parentId: null,
            specialUse: null,
        };
        MOCK_DB.folders.set(scheduledFolder.id, scheduledFolder);
    }
    
    // Return all folders for the user to be sent to the client
    return Array.from(MOCK_DB.folders.values()).filter(f => f.userId === userId);
};

export const getUserFolders = async (userId: string): Promise<UserFolder[]> => {
    const folders = Array.from(MOCK_DB.folders.values()).filter(f => f.userId === userId);
    logger.debug("DB: Get user folders", { userId, count: folders.length });
    return folders;
}
export const getFolderById = async (folderId: string, userId: string): Promise<UserFolder | null> => {
    const folder = Array.from(MOCK_DB.folders.values()).find(f => f.id === folderId && f.userId === userId) || null;
    logger.debug("DB: Get folder by ID", { folderId, userId, found: !!folder });
    return folder;
}
export const findFolder = async (identifier: string, userId: string): Promise<UserFolder | null> => {
    // Find by specialUse first, then name
    const bySpecialUse = Array.from(MOCK_DB.folders.values()).find(f => f.specialUse === identifier && f.userId === userId);
    if(bySpecialUse) {
        logger.debug("DB: Find folder by special use", { identifier, userId, found: !!bySpecialUse });
        return bySpecialUse;
    }
    const byNameOrId = Array.from(MOCK_DB.folders.values()).find(f => (f.id === identifier || f.name === identifier) && f.userId === userId) || null;
    logger.debug("DB: Find folder by name/id", { identifier, userId, found: !!byNameOrId });
     return byNameOrId;
}

// --- Labels ---
export const getLabels = async (userId: string): Promise<Label[]> => {
    const labels = Array.from(MOCK_DB.labels.values()).filter(l => l.userId === userId);
    logger.debug("DB: Get labels", { userId, count: labels.length });
    return labels;
}
export const getLabelById = async (labelId: string, userId: string): Promise<Label | null> => {
    const label = Array.from(MOCK_DB.labels.values()).find(l => l.id === labelId && l.userId === userId) || null;
    logger.debug("DB: Get label by ID", { labelId, userId, found: !!label });
    return label;
}

// --- IMAP State ---
export const getImapState = async (userId: string, folderPath: string): Promise<{ uidValidity: number, lastProcessedUid: number } | null> => {
    const key = `${userId}:${folderPath}`;
    const state = MOCK_DB.imapState.get(key);
    logger.debug("DB: Getting IMAP state", { userId, folderPath, state });
    return state;
}

export const setImapState = async (userId: string, folderPath: string, state: { uidValidity: number, lastProcessedUid: number }): Promise<void> => {
    const key = `${userId}:${folderPath}`;
    logger.debug("DB: Setting IMAP state", { userId, folderPath, state });
    MOCK_DB.imapState.set(key, state);
}

// --- Other Stubs ---
export const getContacts = async (userId: string): Promise<Contact[]> => {
    logger.debug("DB: Getting contacts", { userId });
    return [];
};
export const getContactGroups = async (userId: string): Promise<ContactGroup[]> => {
    logger.debug("DB: Getting contact groups", { userId });
    return [];
};
export const getAppSettings = async (userId: string): Promise<AppSettings> => {
    logger.debug("DB: Getting app settings", { userId });
    return MOCK_DB.settings.get(userId) || {
        signature: { isEnabled: false, body: '' },
        autoResponder: { isEnabled: false, subject: '', message: '' },
        rules: [],
        sendDelay: { isEnabled: true, duration: 5 },
        language: 'en',
        isOnboardingCompleted: false,
        displayName: '',
    };
};
export const createScheduledSend = async (job: any): Promise<void> => {
    logger.info('DB: Creating scheduled send job', job);
};
export const getDueScheduledSends = async (): Promise<any[]> => {
    logger.debug("DB: Getting due scheduled sends");
    return [];
};
export const deleteScheduledSend = async (id: string): Promise<void> => {
    logger.info("DB: Deleting scheduled send job", { id });
};
export const createLabel = async(name: string, color: string, userId: string): Promise<{ labels: Label[] }> => {
    logger.info("DB: Creating label", { name, color, userId });
    return { labels: [] };
};
export const updateLabel = async(id: string, updates: any, userId: string): Promise<{ labels: Label[] }> => {
    logger.info("DB: Updating label", { id, updates, userId });
    return { labels: [] };
};
export const deleteLabel = async(id: string, userId: string): Promise<{ labels: Label[], emails: any[] }> => {
    logger.info("DB: Deleting label", { id, userId });
    return { labels: [], emails: [] };
};
export const createFolder = async(name: string, userId: string, parentId: string | null): Promise<{ folders: UserFolder[] }> => {
    logger.info("DB: Creating folder", { name, userId, parentId });
    return { folders: [] };
};
export const updateFolder = async(id: string, newName: string, userId: string): Promise<{ folders: UserFolder[] }> => {
    logger.info("DB: Updating folder", { id, newName, userId });
    return { folders: [] };
};
export const deleteFolder = async(id: string, userId: string): Promise<{ folders: UserFolder[], emails: any[] }> => {
    logger.info("DB: Deleting folder", { id, userId });
    return { folders: [], emails: [] };
};
export const updateFolderSubscription = async(id: string, isSubscribed: boolean, userId: string): Promise<{ folders: UserFolder[] }> => {
    logger.info("DB: Updating folder subscription", { id, isSubscribed, userId });
    return { folders: [] };
};
export const updateSettings = async(settings: AppSettings, userId: string): Promise<{ settings: AppSettings }> => {
    logger.info("DB: Updating settings", { userId });
    MOCK_DB.settings.set(userId, settings);
    return { settings };
};
export const completeOnboarding = async(userId: string, data: Partial<AppSettings>): Promise<{ settings: AppSettings, contacts: Contact[] }> => {
    logger.info("DB: Completing onboarding", { userId, data });
    const currentSettings = await getAppSettings(userId);
    const newSettings = { ...currentSettings, ...data, isOnboardingCompleted: true };
    MOCK_DB.settings.set(userId, newSettings);
    return { settings: newSettings, contacts: [] };
};
export const updateProfileSettings = async(userId: string, data: any): Promise<{settings: AppSettings}> => {
    logger.info("DB: Updating profile settings", { userId, data });
    return { settings: {} as AppSettings };
};
export const addContact = async(data: any, userId: string): Promise<{ contacts: Contact[], newContactId: string }> => {
    logger.info("DB: Adding contact", { userId, data });
    return { contacts: [], newContactId: '' };
};
export const updateContact = async(id: string, data: any, userId: string): Promise<{ contacts: Contact[] }> => {
    logger.info("DB: Updating contact", { id, userId, data });
    return { contacts: [] };
};
export const deleteContact = async(id: string, userId: string): Promise<{ contacts: Contact[], groups: ContactGroup[] }> => {
    logger.info("DB: Deleting contact", { id, userId });
    return { contacts: [], groups: [] };
};
export const importContacts = async(newContacts: any[], userId: string): Promise<{ contacts: Contact[], importedCount: number, skippedCount: number }> => {
    logger.info("DB: Importing contacts", { userId, count: newContacts.length });
    return { contacts: [], importedCount: 0, skippedCount: 0 };
};
export const createContactGroup = async(name: string, userId: string): Promise<{ groups: ContactGroup[] }> => {
    logger.info("DB: Creating contact group", { name, userId });
    return { groups: [] };
};
export const renameContactGroup = async(id: string, newName: string, userId: string): Promise<{ groups: ContactGroup[] }> => {
    logger.info("DB: Renaming contact group", { id, newName, userId });
    return { groups: [] };
};
export const deleteContactGroup = async(id: string, userId: string): Promise<{ groups: ContactGroup[] }> => {
    logger.info("DB: Deleting contact group", { id, userId });
    return { groups: [] };
};
export const addContactToGroup = async(groupId: string, contactId: string, userId: string): Promise<{ groups: ContactGroup[] }> => {
    logger.info("DB: Adding contact to group", { groupId, contactId, userId });
    return { groups: [] };
};
export const removeContactFromGroup = async(groupId: string, contactId: string, userId: string): Promise<{ groups: ContactGroup[] }> => {
    logger.info("DB: Removing contact from group", { groupId, contactId, userId });
    return { groups: [] };
};