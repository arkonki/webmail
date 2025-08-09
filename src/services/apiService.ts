
import {
    User, Email, Label, UserFolder, Contact, ContactGroup, SystemFolder, AppSettings
} from '../types';

// This will hold the JWT or session token after login
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

// Initialize token from localStorage on module load
const storedToken = localStorage.getItem('sessionToken');
if (storedToken) {
    setAuthToken(storedToken);
}

// Use environment variable for production, otherwise use a relative path for dev proxy
// Safely access the environment variable to prevent runtime errors.
const API_BASE = ((import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) || '';

// A helper to make authenticated requests
const fetchApi = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
    }

    // If API_BASE is set, it's a full URL. Otherwise, path should start with /api.
    const fullPath = API_BASE ? `${API_BASE}/api${path}` : `/api${path}`;

    const response = await fetch(fullPath, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || errorMessage;
        } catch (e) {
            // Ignore if response body is not JSON
        }
        if (response.status === 401) {
            // Auto-logout on auth error
            setAuthToken(null);
            localStorage.removeItem('sessionToken');
        }
        throw new Error(errorMessage);
    }
    
    // Handle responses that might not have a body
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return;
};


// --- Auth ---

export const apiLogin = async (email: string, password: string): Promise<{ user: User, token: string }> => {
    console.log(`API: Authenticating ${email}`);
    const { user, token } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    // The token is set in the context after this call
    return { user, token };
};

export const apiLogout = async (): Promise<void> => {
    try {
        await fetchApi('/logout', { method: 'POST' });
    } catch (error) {
        console.error("Logout failed, but clearing client session anyway.", error);
    } finally {
        setAuthToken(null);
        localStorage.removeItem('sessionToken');
    }
}

export const apiCheckSession = async (): Promise<{ user: User } | null> => {
    if (!authToken) {
        return null;
    }
    try {
        const { user } = await fetchApi('/session');
        return { user };
    } catch (error) {
        console.log("No active session found.");
        setAuthToken(null);
        localStorage.removeItem('sessionToken');
        return null;
    }
}


// --- Initial Data ---

export const getInitialData = async (): Promise<{ emails: Email[], labels: Label[], userFolders: UserFolder[], contacts: Contact[], contactGroups: ContactGroup[], appSettings: AppSettings }> => {
    console.log("API: Fetching initial data");
    return fetchApi('/initial-data');
};


// --- Mail Actions ---

export const apiMoveConversations = async (conversationIds: string[], targetFolderId: string): Promise<{ emails: Email[] }> => {
    console.log(`API: Moving conversations ${conversationIds} to ${targetFolderId}`);
    return fetchApi('/conversations/move', {
        method: 'POST',
        body: JSON.stringify({ conversationIds, targetFolderId }),
    });
};

export const apiDeletePermanently = async (conversationIds: string[]): Promise<{ emails: Email[] }> => {
    console.log(`API: Permanently deleting conversations ${conversationIds}`);
    return fetchApi('/conversations/delete-permanently', {
        method: 'POST',
        body: JSON.stringify({ conversationIds }),
    });
};

export const apiToggleLabel = async (conversationIds: string[], labelId: string): Promise<{ emails: Email[] }> => {
    console.log(`API: Toggling label ${labelId} for conversations ${conversationIds}`);
    return fetchApi('/conversations/toggle-label', {
        method: 'POST',
        body: JSON.stringify({ conversationIds, labelId }),
    });
};

export const apiMarkConversationsAsRead = async (conversationIds: string[], isRead: boolean): Promise<{ emails: Email[] }> => {
    console.log(`API: Marking conversations ${conversationIds} as read=${isRead}`);
    return fetchApi('/conversations/mark-read', {
        method: 'POST',
        body: JSON.stringify({ conversationIds, isRead }),
    });
};

interface SendEmailData {
  to: string; cc?: string; bcc?: string; subject: string; body: string; attachments: File[]; scheduleDate?: Date;
}

export const apiSendEmail = async (data: SendEmailData, user: User, conversationId?: string, draftId?: string): Promise<{ emails: Email[] }> => {
    console.log("API: Sending email");
    // File sending would typically be handled with FormData, but we'll simulate with JSON for now.
    const payload = { data, user, conversationId, draftId };
    return fetchApi('/emails/send', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

export const apiSaveDraft = async (data: SendEmailData, user: User, conversationId: string, draftId?: string): Promise<{ emails: Email[], newDraftId: string }> => {
    console.log("API: Saving draft");
    const payload = { data, user, conversationId, draftId };
    return fetchApi('/emails/draft', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

export const apiDeleteDraft = async (draftId: string): Promise<{ emails: Email[] }> => {
    console.log(`API: Deleting draft ${draftId}`);
    return fetchApi('/emails/draft', {
        method: 'DELETE',
        body: JSON.stringify({ draftId })
    });
};


// --- Labels & Folders ---

export const apiCreateLabel = async (name: string, color: string): Promise<{ labels: Label[] }> => {
    return fetchApi('/labels', { method: 'POST', body: JSON.stringify({ name, color }) });
};

export const apiUpdateLabel = async (id: string, updates: Partial<Omit<Label, 'id'>>): Promise<{ labels: Label[] }> => {
    return fetchApi(`/labels/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
};

export const apiDeleteLabel = async (id: string): Promise<{ labels: Label[], emails: Email[] }> => {
    return fetchApi(`/labels/${id}`, { method: 'DELETE' });
};

export const apiCreateFolder = async (name: string): Promise<{ folders: UserFolder[] }> => {
    return fetchApi('/folders', { method: 'POST', body: JSON.stringify({ name }) });
};

export const apiUpdateFolder = async (id: string, newName: string): Promise<{ folders: UserFolder[] }> => {
    return fetchApi(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ newName }) });
};

export const apiDeleteFolder = async (id: string): Promise<{ folders: UserFolder[], emails: Email[] }> => {
    return fetchApi(`/folders/${id}`, { method: 'DELETE' });
};

export const apiSyncFolders = async (): Promise<{ folders: UserFolder[] }> => {
    return fetchApi('/folders/sync', { method: 'POST' });
};

export const apiUpdateFolderSubscription = async (id: string, isSubscribed: boolean): Promise<{ folders: UserFolder[] }> => {
    return fetchApi(`/folders/${id}/subscription`, { method: 'PATCH', body: JSON.stringify({ isSubscribed }) });
};


// --- Settings & Profile ---

export const apiUpdateSettings = async (settings: AppSettings): Promise<{ settings: AppSettings }> => {
    return fetchApi('/settings', { method: 'POST', body: JSON.stringify(settings) });
};

export const apiCompleteOnboarding = async (data: Partial<AppSettings>): Promise<{ settings: AppSettings, contacts: Contact[] }> => {
    return fetchApi('/onboarding', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

export const apiUpdateProfile = async (data: { displayName: string, profilePicture?: string }): Promise<{ settings: AppSettings }> => {
    return fetchApi('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
};


// --- Contacts & Groups ---

export const apiAddContact = async (contactData: Omit<Contact, 'id'>): Promise<{ contacts: Contact[], newContactId: string }> => {
    return fetchApi('/contacts', { method: 'POST', body: JSON.stringify(contactData) });
};

export const apiUpdateContact = async (updatedContact: Contact): Promise<{ contacts: Contact[] }> => {
    return fetchApi(`/contacts/${updatedContact.id}`, { method: 'PUT', body: JSON.stringify(updatedContact) });
};

export const apiDeleteContact = async (contactId: string): Promise<{ contacts: Contact[], groups: ContactGroup[] }> => {
    return fetchApi(`/contacts/${contactId}`, { method: 'DELETE' });
};

export const apiImportContacts = async (newContacts: Omit<Contact, 'id'>[]): Promise<{ contacts: Contact[], importedCount: number, skippedCount: number }> => {
    return fetchApi('/contacts/import', { method: 'POST', body: JSON.stringify({ newContacts }) });
};

export const apiCreateContactGroup = async (name: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi('/contact-groups', { method: 'POST', body: JSON.stringify({ name }) });
};

export const apiRenameContactGroup = async (groupId: string, newName: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi(`/contact-groups/${groupId}`, { method: 'PATCH', body: JSON.stringify({ newName }) });
};

export const apiDeleteContactGroup = async (groupId: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi(`/contact-groups/${groupId}`, { method: 'DELETE' });
};

export const apiAddContactToGroup = async (groupId: string, contactId: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi(`/contact-groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ contactId }) });
};

export const apiRemoveContactFromGroup = async (groupId: string, contactId: string): Promise<{ groups: ContactGroup[] }> => {
    return fetchApi(`/contact-groups/${groupId}/members/${contactId}`, { method: 'DELETE' });
};