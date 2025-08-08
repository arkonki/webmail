import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { AppSettings, Label, UserFolder, Contact, ContactGroup, User } from '../types';
import crypto from 'crypto';

let db: Database;

export async function initDb() {
    db = await open({
        filename: './data/app.db',
        driver: sqlite3.Database
    });

    console.log("Database connected.");
    await db.exec('PRAGMA foreign_keys = ON;');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS labels (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS user_folders (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            company TEXT,
            notes TEXT,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(userId, email)
        );
        CREATE TABLE IF NOT EXISTS contact_groups (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            contactIds TEXT NOT NULL, -- Storing as JSON array
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS settings (
            userId TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
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
    const labelStmt = await db.prepare('INSERT INTO labels (id, userId, name, color) VALUES (?, ?, ?, ?)');
    for (const label of initialLabels) {
        await labelStmt.run(`${label.id}-${userId}`, userId, label.name, label.color);
    }
    await labelStmt.finalize();

    // Seed Folders
    const initialFolders = [ { id: 'folder-1', name: 'Project Phoenix' } ];
    const folderStmt = await db.prepare('INSERT INTO user_folders (id, userId, name) VALUES (?, ?, ?)');
    for (const folder of initialFolders) {
        await folderStmt.run(`${folder.id}-${userId}`, userId, folder.name);
    }
    await folderStmt.finalize();
    
    // Seed Settings
    const initialSettings: AppSettings = {
        signature: { isEnabled: true, body: '<p>Best regards</p>' },
        autoResponder: { isEnabled: false, subject: '', message: '' },
        rules: [],
        sendDelay: { isEnabled: true, duration: 5 },
        language: 'en',
    };
    await db.run('INSERT INTO settings (userId, value) VALUES (?, ?)', userId, JSON.stringify(initialSettings));
}

// --- User Management ---
export const findOrCreateUser = async (email: string): Promise<User & {id: string}> => {
    let user = await db.get<User & {id: string}>('SELECT * FROM users WHERE email = ?', email);
    if (!user) {
        console.log(`Creating new user for ${email}`);
        const newId = `user-${crypto.randomBytes(16).toString('hex')}`;
        await db.run('INSERT INTO users (id, email) VALUES (?, ?)', newId, email);
        await seedDataForNewUser(newId);
        user = { id: newId, email, name: email.split('@')[0] }; // name is transient, not in db
    } else {
        user.name = user.email.split('@')[0];
    }
    return user;
};


// --- Labels ---
export const getLabels = async (userId: string): Promise<Label[]> => db.all('SELECT * FROM labels WHERE userId = ?', userId);
export const getLabelById = async (id: string, userId: string): Promise<Label | undefined> => db.get('SELECT * FROM labels WHERE id = ? AND userId = ?', id, userId);

export const createLabel = async (name: string, color: string, userId: string): Promise<Label[]> => {
    const newId = `label-${Date.now()}`;
    await db.run('INSERT INTO labels (id, userId, name, color) VALUES (?, ?, ?, ?)', newId, userId, name, color);
    return getLabels(userId);
};

export const updateLabel = async (id: string, updates: Partial<Omit<Label, 'id'>>, userId: string): Promise<Label[]> => {
    await db.run('UPDATE labels SET name = ?, color = ? WHERE id = ? AND userId = ?', updates.name, updates.color, id, userId);
    return getLabels(userId);
};

export const deleteLabel = async (id: string, userId: string): Promise<Label[]> => {
    await db.run('DELETE FROM labels WHERE id = ? AND userId = ?', id, userId);
    return getLabels(userId);
};

// --- Folders ---
export const getUserFolders = async (userId: string): Promise<UserFolder[]> => db.all('SELECT * FROM user_folders WHERE userId = ?', userId);
export const getFolderById = async(id: string, userId: string): Promise<UserFolder | undefined> => db.get('SELECT * FROM user_folders WHERE id = ? AND userId = ?', id, userId);

export const createFolder = async (name: string, userId: string): Promise<UserFolder[]> => {
    const newId = `folder-${Date.now()}`;
    await db.run('INSERT INTO user_folders (id, userId, name) VALUES (?, ?, ?)', newId, userId, name);
    return getUserFolders(userId);
};

export const updateFolder = async (id: string, newName: string, userId: string): Promise<UserFolder[]> => {
    await db.run('UPDATE user_folders SET name = ? WHERE id = ? AND userId = ?', newName, id, userId);
    return getUserFolders(userId);
};

export const deleteFolder = async (id: string, userId: string): Promise<UserFolder[]> => {
    await db.run('DELETE FROM user_folders WHERE id = ? AND userId = ?', id, userId);
    return getUserFolders(userId);
};

// --- Settings ---
export const getAppSettings = async (userId: string): Promise<AppSettings> => {
    const row = await db.get("SELECT value FROM settings WHERE userId = ?", userId);
    return row ? JSON.parse(row.value) : {};
};

export const updateSettings = async (newSettings: AppSettings, userId: string): Promise<AppSettings> => {
    await db.run("UPDATE settings SET value = ? WHERE userId = ?", JSON.stringify(newSettings), userId);
    return getAppSettings(userId);
};

// --- Contacts ---
export const getContacts = async (userId: string): Promise<Contact[]> => db.all('SELECT * FROM contacts WHERE userId = ?', userId);

export const addContact = async (contactData: Omit<Contact, 'id'>, userId: string): Promise<{ contacts: Contact[], newContactId: string }> => {
    const newId = `contact-${Date.now()}`;
    await db.run('INSERT INTO contacts (id, userId, name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', newId, userId, contactData.name, contactData.email, contactData.phone, contactData.company, contactData.notes);
    const newContacts = await getContacts(userId);
    return { contacts: newContacts, newContactId: newId };
};

export const updateContact = async (id: string, updatedContactData: Contact, userId: string): Promise<Contact[]> => {
    await db.run('UPDATE contacts SET name=?, email=?, phone=?, company=?, notes=? WHERE id=? AND userId = ?', updatedContactData.name, updatedContactData.email, updatedContactData.phone, updatedContactData.company, updatedContactData.notes, id, userId);
    return getContacts(userId);
};

export const deleteContact = async (contactId: string, userId: string): Promise<{ contacts: Contact[], groups: ContactGroup[] }> => {
    await db.run('DELETE FROM contacts WHERE id = ? AND userId = ?', contactId, userId);
    // Remove contact from any groups it was in
    const groups = await getContactGroups(userId);
    for (const group of groups) {
        const initialCount = group.contactIds.length;
        group.contactIds = group.contactIds.filter(id => id !== contactId);
        if (group.contactIds.length < initialCount) {
            await db.run('UPDATE contact_groups SET contactIds = ? WHERE id = ? AND userId = ?', JSON.stringify(group.contactIds), group.id, userId);
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

    const stmt = await db.prepare('INSERT INTO contacts (id, userId, name, email) VALUES (?, ?, ?, ?)');
    for (const newContact of newContacts) {
        if (!existingEmails.has(newContact.email.toLowerCase())) {
            await stmt.run(`contact-${Date.now()}-${importedCount}`, userId, newContact.name, newContact.email);
            importedCount++;
        } else {
            skippedCount++;
        }
    }
    await stmt.finalize();
    const updatedContacts = await getContacts(userId);
    return { contacts: updatedContacts, importedCount, skippedCount };
};

// --- Contact Groups ---
export const getContactGroups = async (userId: string): Promise<ContactGroup[]> => {
    const groups = await db.all<{id: string, name: string, contactIds: string}[]>('SELECT id, name, contactIds FROM contact_groups WHERE userId = ?', userId);
    return groups.map(g => ({...g, contactIds: JSON.parse(g.contactIds)}));
};

export const createContactGroup = async (name: string, userId: string): Promise<ContactGroup[]> => {
    await db.run('INSERT INTO contact_groups (id, userId, name, contactIds) VALUES (?, ?, ?, ?)', `group-${Date.now()}`, userId, name, '[]');
    return getContactGroups(userId);
};

export const renameContactGroup = async (groupId: string, newName: string, userId: string): Promise<ContactGroup[]> => {
    await db.run('UPDATE contact_groups SET name = ? WHERE id = ? AND userId = ?', newName, groupId, userId);
    return getContactGroups(userId);
};

export const deleteContactGroup = async (groupId: string, userId: string): Promise<ContactGroup[]> => {
    await db.run('DELETE FROM contact_groups WHERE id = ? AND userId = ?', groupId, userId);
    return getContactGroups(userId);
};

export const addContactToGroup = async (groupId: string, contactId: string, userId: string): Promise<ContactGroup[]> => {
    const group = await db.get('SELECT contactIds FROM contact_groups WHERE id = ? AND userId = ?', groupId, userId);
    if(group) {
        const contactIds = new Set(JSON.parse(group.contactIds));
        contactIds.add(contactId);
        await db.run('UPDATE contact_groups SET contactIds = ? WHERE id = ?', JSON.stringify(Array.from(contactIds)), groupId);
    }
    return getContactGroups(userId);
};

export const removeContactFromGroup = async (groupId: string, contactId: string, userId: string): Promise<ContactGroup[]> => {
    const group = await db.get('SELECT contactIds FROM contact_groups WHERE id = ? AND userId = ?', groupId, userId);
    if(group) {
        let contactIds: string[] = JSON.parse(group.contactIds);
        contactIds = contactIds.filter(id => id !== contactId);
        await db.run('UPDATE contact_groups SET contactIds = ? WHERE id = ?', JSON.stringify(contactIds), groupId);
    }
    return getContactGroups(userId);
};
