import {
    User, Email, Label, UserFolder, Contact, ContactGroup, AppSettings, SendEmailData, Attachment
} from '../types';
import { logService } from './logService';

// This will hold the JWT or session token after login
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        localStorage.setItem('sessionToken', token);
    } else {
        localStorage.removeItem('sessionToken');
    }
};

// Initialize token from localStorage on module load
const storedToken = localStorage.getItem('sessionToken');
if (storedToken) {
    setAuthToken(storedToken);
}

// In development, Vite's proxy handles this. For production, API calls are on the same origin.
const API_BASE = '';

// A helper to make authenticated requests
const fetchApi = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
    }

    const fullPath = API_BASE + path;
    const method = options.method || 'GET';
    const bodyForLog = options.body ? JSON.parse(options.body as string) : undefined;
    logService.log('DEBUG', `API Request ==> ${method} ${path}`, { body: bodyForLog });

    try {
        const response = await fetch(fullPath, { ...options, headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            logService.log('ERROR', `API Error <== ${method} ${path}`, { status: response.status, error: errorData });
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        if (response.status === 204 || response.headers.get('content-length') === '0') {
            logService.log('DEBUG', `API Success <== ${method} ${path}`, { status: response.status, response: null });
            return null;
        }

        const data = await response.json();
        logService.log('DEBUG', `API Success <== ${method} ${path}`, { status: response.status, response: data });
        return data;
    } catch (error) {
        logService.log('ERROR', `API Fetch Failed: ${method} ${path}`, { error });
        throw error;
    }
};

// --- AUTH ---
export const apiLogin = (email: string, pass: string): Promise<{ user: User, token: string }> => {
    return fetchApi('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass })
    });
};

export const apiCheckSession = (): Promise<{ user: User } | null> => fetchApi('/api/session');

export const apiLogout = (): Promise<void> => {
    const promise = fetchApi('/api/logout', { method: 'POST' });
    setAuthToken(null);
    return promise;
};

// --- INITIAL DATA ---
export const getInitialData = (): Promise<{ emails: Email[], labels: Label[], userFolders: UserFolder[], contacts: Contact[], contactGroups: ContactGroup[], appSettings: AppSettings }> => {
    return fetchApi('/api/initial-data');
};


// --- MAIL ACTIONS ---
export const apiMoveConversations = (conversationIds: string[], targetFolderId: string): Promise<{ emails: Email[] }> => {
    return fetchApi('/api/conversations/move', {
        method: 'POST',
        body: JSON.stringify({ conversationIds, targetFolderId })
    });
};

export const apiDeletePermanently = (conversationIds: string[]): Promise<{ emails: Email[] }> => {
    return fetchApi('/api/conversations/delete-permanently', {
        method: 'POST',
        body: JSON.stringify({ conversationIds })
    });
};

export const apiSetLabelState = (messageIds: string[], labelId: string, state: boolean): Promise<{ emails: Email[] }> => {
    return fetchApi('/api/conversations/set-label-state', {
        method: 'POST',
        body: JSON.stringify({ messageIds, labelId, state })
    });
};

export const apiMarkConversationsAsRead = (conversationIds: string[], isRead: boolean): Promise<{ emails: Email[] }> => {
    return fetchApi('/api/conversations/mark-read', {
        method: 'POST',
        body: JSON.stringify({ conversationIds, isRead })
    });
};

export const apiSendEmail = (data: SendEmailData, conversationId?: string, draftId?: string): Promise<{ emails: Email[] }> => {
    return fetchApi('/api/emails/send', {
        method: 'POST',
        body: JSON.stringify({ data, conversationId, draftId })
    });
};

export const apiSaveDraft = (data: Omit<SendEmailData, 'attachments'> & { attachments: Attachment[] }, user: User, conversationId?: string, draftId?: string): Promise<{ emails: Email[], newDraftId: string }> => {
    return fetchApi('/api/emails/draft', {
        method: 'POST',
        body: JSON.stringify({ data, user, conversationId, draftId })
    });
};

export const apiDeleteDraft = (draftId: string): Promise<{ emails: Email[] }> => {
    return fetchApi('/api/emails/draft', {
        method: 'DELETE',
        body: JSON.stringify({ draftId })
    });
};

// --- LABELS ---
export const apiCreateLabel = (name: string, color: string): Promise<{ labels: Label[] }> => {
    return fetchApi('/api/labels', {
        method: 'POST',
        body: JSON.stringify({ name, color })
    });
};
export const apiUpdateLabel = (id: string, updates: Partial<Omit<Label, 'id'>>): Promise<{ labels: Label[] }> => {
    return fetchApi(`/api/labels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
};
export const apiDeleteLabel = (id: string): Promise<{ labels: Label[], emails: Email[] }> => fetchApi(`/api/labels/${id}`, { method: 'DELETE' });

// --- FOLDERS ---
export const apiCreateFolder = (name: string, parentId: string | null): Promise<{ folders: UserFolder[] }> => {
    return fetchApi('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name, parentId })
    });
};
export const apiUpdateFolder = (id: string, newName: string): Promise<{ folders: UserFolder[] }> => {
    return fetchApi(`/api/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ newName })
    });
};
export const apiDeleteFolder = (id: string): Promise<{ folders: UserFolder[], emails: Email[] }> => fetchApi(`/api/folders/${id}`, { method: 'DELETE' });
export const apiSyncFolders = (): Promise<{ folders: UserFolder[] }> => fetchApi('/api/folders/sync', { method: 'POST' });
export const apiRefreshFolder = (folderPath: string): Promise<{ message: string }> => {
    return fetchApi(`/api/folders/${folderPath}/refresh`, { method: 'POST' });
};
export const apiUpdateFolderSubscription = (id: string, isSubscribed: boolean): Promise<{ folders: UserFolder[] }> => {
    return fetchApi(`/api/folders/${id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({ isSubscribed })
    });
};

// --- SETTINGS & PROFILE ---
export const apiUpdateSettings = (settings: AppSettings): Promise<{ settings: AppSettings }> => {
    return fetchApi('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
    });
};
export const apiCompleteOnboarding = (data: Partial<AppSettings>): Promise<{ settings: AppSettings, contacts: Contact[] }> => {
    return fetchApi('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};
export const apiUpdateProfile = (data: { displayName: string, profilePicture?: string }): Promise<{ settings: AppSettings }> => {
    return fetchApi('/api/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
};

// --- CONTACTS ---
export const apiAddContact = (contactData: Omit<Contact, 'id'>): Promise<{ contacts: Contact[], newContactId: string }> => {
    return fetchApi('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData)
    });
};
export const apiUpdateContact = (contact: Contact): Promise<{ contacts: Contact[] }> => {
    return fetchApi(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        body: JSON.stringify(contact)
    });
};
export const apiDeleteContact = (contactId: string): Promise<{ contacts: Contact[], groups: ContactGroup[] }> => fetchApi(`/api/contacts/${contactId}`, { method: 'DELETE' });
export const apiImportContacts = (newContacts: Omit<Contact, 'id'>[]): Promise<{ contacts: Contact[], importedCount: number, skippedCount: number }> => {
    return fetchApi('/api/contacts/import', {
        method: 'POST',
        body: JSON.stringify({ newContacts })
    });
};

// --- CONTACT GROUPS ---
export const apiCreateContactGroup = (name: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi('/api/contact-groups', {
        method: 'POST',
        body: JSON.stringify({ name })
    });
};
export const apiRenameContactGroup = (groupId: string, newName: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi(`/api/contact-groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify({ newName })
    });
};
export const apiDeleteContactGroup = (groupId: string): Promise<{ groups: ContactGroup[] }> => fetchApi(`/api/contact-groups/${groupId}`, { method: 'DELETE' });
export const apiAddContactToGroup = (groupId: string, contactId: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi(`/api/contact-groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ contactId })
    });
};
export const apiRemoveContactFromGroup = (groupId: string, contactId: string): Promise<{ groups: ContactGroup[] }> => fetchApi(`/api/contact-groups/${groupId}/members/${contactId}`, { method: 'DELETE' });