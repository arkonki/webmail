import { Pool } from 'pg';
import { AppSettings, Label, UserFolder, Contact, ContactGroup, User } from '../types';
import crypto from 'crypto';

let db: Pool;

export async function initDb() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set. Please provide a PostgreSQL connection string.");
    }

    db = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    db.on('connect', () => console.log("Database connected."));
    db.on('error', (err) => console.error("Database pool error:", err));

    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE
        );
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS labels (
            id TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT NOT NULL
        );
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_folders (
            id TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL
        );
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            company TEXT,
            notes TEXT,
            UNIQUE("userId", email)
        );
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS contact_groups (
            id TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            "contactIds" JSONB NOT NULL DEFAULT '[]'
        );
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS settings (
            "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            value JSONB NOT NULL
        );
    `);
    
    console.log("Database schema initialized.");
}

async function seedDataForNewUser(userId: string) {
    console.log(`Seeding initial data for new user ${userId}`);
    // Seed Labels
    const initialLabels = [
        { id: 'label-1', name: 'Travel', color: '#3498db' },
        { id: 'label-2', name: 'Receipts', color: '#2ecc71' },
        { id: 'label-3', name: 'Work', color: '#e74c3c' },
    ];
    for (const label of initialLabels) {
        await db.query('INSERT INTO labels (id, "userId", name, color) VALUES ($1, $2, $3, $4)', [`${label.id}-${userId}`, userId, label.name, label.color]);
    }

    // Seed Folders
    const initialFolders = [ { id: 'folder-1', name: 'Project Phoenix' } ];
    for (const folder of initialFolders) {
        await db.query('INSERT INTO user_folders (id, "userId", name) VALUES ($1, $2, $3)', [`${folder.id}-${userId}`, userId, folder.name]);
    }
    
    // Seed Settings
    const initialSettings: AppSettings = {
        signature: { isEnabled: true, body: '<p>Best regards</p>' },
        autoResponder: { isEnabled: false, subject: '', message: '' },
        rules: [],
        sendDelay: { isEnabled: true, duration: 5 },
        language: 'en',
    };
    await db.query('INSERT INTO settings ("userId", value) VALUES ($1, $2)', [userId, initialSettings]);
}

// --- User Management ---
export const findOrCreateUser = async (email: string): Promise<User & {id: string}> => {
    let result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    if (!user) {
        console.log(`Creating new user for ${email}`);
        const newId = `user-${crypto.randomBytes(16).toString('hex')}`;
        await db.query('INSERT INTO users (id, email) VALUES ($1, $2)', [newId, email]);
        await seedDataForNewUser(newId);
        user = { id: newId, email, name: email.split('@')[0] }; // name is transient, not in db
    } else {
        user.name = user.email.split('@')[0];
    }
    return user;
};


// --- Labels ---
export const getLabels = async (userId: string): Promise<Label[]> => {
    const res = await db.query('SELECT id, name, color, "userId" FROM labels WHERE "userId" = $1', [userId]);
    return res.rows;
};
export const getLabelById = async (id: string, userId: string): Promise<Label | undefined> => {
    const res = await db.query('SELECT * FROM labels WHERE id = $1 AND "userId" = $2', [id, userId]);
    return res.rows[0];
}

export const createLabel = async (name: string, color: string, userId: string): Promise<Label[]> => {
    const newId = `label-${Date.now()}`;
    await db.query('INSERT INTO labels (id, "userId", name, color) VALUES ($1, $2, $3, $4)', [newId, userId, name, color]);
    return getLabels(userId);
};

export const updateLabel = async (id: string, updates: Partial<Omit<Label, 'id'>>, userId: string): Promise<Label[]> => {
    await db.query('UPDATE labels SET name = $1, color = $2 WHERE id = $3 AND "userId" = $4', [updates.name, updates.color, id, userId]);
    return getLabels(userId);
};

export const deleteLabel = async (id: string, userId: string): Promise<Label[]> => {
    await db.query('DELETE FROM labels WHERE id = $1 AND "userId" = $2', [id, userId]);
    return getLabels(userId);
};

// --- Folders ---
export const getUserFolders = async (userId: string): Promise<UserFolder[]> => {
    const res = await db.query('SELECT id, name, "userId" FROM user_folders WHERE "userId" = $1', [userId]);
    return res.rows;
};
export const getFolderById = async(id: string, userId: string): Promise<UserFolder | undefined> => {
    const res = await db.query('SELECT * FROM user_folders WHERE id = $1 AND "userId" = $2', [id, userId]);
    return res.rows[0];
};

export const createFolder = async (name: string, userId: string): Promise<UserFolder[]> => {
    const newId = `folder-${Date.now()}`;
    await db.query('INSERT INTO user_folders (id, "userId", name) VALUES ($1, $2, $3)', [newId, userId, name]);
    return getUserFolders(userId);
};

export const updateFolder = async (id: string, newName: string, userId: string): Promise<UserFolder[]> => {
    await db.query('UPDATE user_folders SET name = $1 WHERE id = $2 AND "userId" = $3', [newName, id, userId]);
    return getUserFolders(userId);
};

export const deleteFolder = async (id: string, userId: string): Promise<UserFolder[]> => {
    await db.query('DELETE FROM user_folders WHERE id = $1 AND "userId" = $2', [id, userId]);
    return getUserFolders(userId);
};

// --- Settings ---
export const getAppSettings = async (userId: string): Promise<AppSettings> => {
    const res = await db.query("SELECT value FROM settings WHERE \"userId\" = $1", [userId]);
    return res.rows[0]?.value || {};
};

export const updateSettings = async (newSettings: AppSettings, userId: string): Promise<AppSettings> => {
    await db.query("UPDATE settings SET value = $1 WHERE \"userId\" = $2", [newSettings, userId]);
    return getAppSettings(userId);
};

// --- Contacts ---
export const getContacts = async (userId: string): Promise<Contact[]> => {
    const res = await db.query('SELECT * FROM contacts WHERE "userId" = $1', [userId]);
    return res.rows;
};

export const addContact = async (contactData: Omit<Contact, 'id'>, userId: string): Promise<{ contacts: Contact[], newContactId: string }> => {
    const newId = `contact-${Date.now()}`;
    await db.query('INSERT INTO contacts (id, "userId", name, email, phone, company, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [newId, userId, contactData.name, contactData.email, contactData.phone, contactData.company, contactData.notes]);
    const newContacts = await getContacts(userId);
    return { contacts: newContacts, newContactId: newId };
};

export const updateContact = async (id: string, updatedContactData: Contact, userId: string): Promise<Contact[]> => {
    await db.query('UPDATE contacts SET name=$1, email=$2, phone=$3, company=$4, notes=$5 WHERE id=$6 AND "userId" = $7', [updatedContactData.name, updatedContactData.email, updatedContactData.phone, updatedContactData.company, updatedContactData.notes, id, userId]);
    return getContacts(userId);
};

export const deleteContact = async (contactId: string, userId: string): Promise<{ contacts: Contact[], groups: ContactGroup[] }> => {
    await db.query('DELETE FROM contacts WHERE id = $1 AND "userId" = $2', [contactId, userId]);
    // Remove contact from any groups it was in
    const groups = await getContactGroups(userId);
    for (const group of groups) {
        const initialCount = group.contactIds.length;
        group.contactIds = group.contactIds.filter(id => id !== contactId);
        if (group.contactIds.length < initialCount) {
            await db.query('UPDATE contact_groups SET "contactIds" = $1 WHERE id = $2 AND "userId" = $3', [JSON.stringify(group.contactIds), group.id, userId]);
        }
    }
    const contacts = await getContacts(userId);
    const updatedGroups = await getContactGroups(userId);
    return { contacts, groups: updatedGroups };
};

export const importContacts = async (newContacts: Omit<Contact, 'id'>[], userId: string): Promise<{ contacts: Contact[], importedCount: number, skippedCount: number }> => {
    let importedCount = 0;
    let skippedCount = 0;
    const existingUserContacts = await getContacts(userId);
    const existingEmails = new Set(existingUserContacts.map(c => c.email.toLowerCase()));

    for (const newContact of newContacts) {
        if (!existingEmails.has(newContact.email.toLowerCase())) {
            await db.query('INSERT INTO contacts (id, "userId", name, email) VALUES ($1, $2, $3, $4)', [`contact-${Date.now()}-${importedCount}`, userId, newContact.name, newContact.email]);
            importedCount++;
        } else {
            skippedCount++;
        }
    }
    const updatedContacts = await getContacts(userId);
    return { contacts: updatedContacts, importedCount, skippedCount };
};

// --- Contact Groups ---
export const getContactGroups = async (userId: string): Promise<ContactGroup[]> => {
    const res = await db.query('SELECT id, name, "contactIds" FROM contact_groups WHERE "userId" = $1', [userId]);
    return res.rows;
};

export const createContactGroup = async (name: string, userId: string): Promise<ContactGroup[]> => {
    await db.query('INSERT INTO contact_groups (id, "userId", name, "contactIds") VALUES ($1, $2, $3, $4)', [`group-${Date.now()}`, userId, name, '[]']);
    return getContactGroups(userId);
};

export const renameContactGroup = async (groupId: string, newName: string, userId: string): Promise<ContactGroup[]> => {
    await db.query('UPDATE contact_groups SET name = $1 WHERE id = $2 AND "userId" = $3', [newName, groupId, userId]);
    return getContactGroups(userId);
};

export const deleteContactGroup = async (groupId: string, userId: string): Promise<ContactGroup[]> => {
    await db.query('DELETE FROM contact_groups WHERE id = $1 AND "userId" = $2', [groupId, userId]);
    return getContactGroups(userId);
};

export const addContactToGroup = async (groupId: string, contactId: string, userId: string): Promise<ContactGroup[]> => {
    const res = await db.query('SELECT "contactIds" FROM contact_groups WHERE id = $1 AND "userId" = $2', [groupId, userId]);
    const group = res.rows[0];
    if(group) {
        const contactIds = new Set(group.contactIds);
        contactIds.add(contactId);
        await db.query('UPDATE contact_groups SET "contactIds" = $1 WHERE id = $2', [JSON.stringify(Array.from(contactIds)), groupId]);
    }
    return getContactGroups(userId);
};

export const removeContactFromGroup = async (groupId: string, contactId: string, userId: string): Promise<ContactGroup[]> => {
    const res = await db.query('SELECT "contactIds" FROM contact_groups WHERE id = $1 AND "userId" = $2', [groupId, userId]);
    const group = res.rows[0];
    if(group) {
        let contactIds: string[] = group.contactIds;
        contactIds = contactIds.filter(id => id !== contactId);
        await db.query('UPDATE contact_groups SET "contactIds" = $1 WHERE id = $2', [JSON.stringify(contactIds), groupId]);
    }
    return getContactGroups(userId);
};