import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Email, ActionType, Label, Conversation, User, AppSettings, Signature, AutoResponder, Rule, SystemLabel, Contact, ContactGroup, SystemFolder, UserFolder } from '../types';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { useTranslation } from 'react-i18next';


interface ComposeState {
  isOpen: boolean;
  isMinimized?: boolean;
  action?: ActionType;
  email?: Email;
  recipient?: string;
  bodyPrefix?: string;
  draftId?: string;
  conversationId?: string;
  initialData?: {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      attachments: File[];
  }
}

type Theme = 'light' | 'dark';
type View = 'mail' | 'settings' | 'contacts';
type SelectionType = 'folder' | 'label';

interface AppContextType {
  // State
  user: User | null;
  emails: Email[];
  conversations: Conversation[];
  labels: Label[];
  userFolders: UserFolder[];
  currentSelection: { type: SelectionType, id: string };
  selectedConversationId: string | null;
  focusedConversationId: string | null;
  composeState: ComposeState;
  searchQuery: string;
  selectedConversationIds: Set<string>;
  theme: Theme;
  displayedConversations: Conversation[];
  isSidebarCollapsed: boolean;
  view: View;
  appSettings: AppSettings;
  contacts: Contact[];
  contactGroups: ContactGroup[];
  selectedContactId: string | null;
  selectedGroupId: string | null;
  isLoading: boolean;
  
  // Auth
  login: (email: string, pass: string) => void;
  logout: () => void;
  checkUserSession: () => void;
  
  // Mail Navigation
  setCurrentSelection: (type: SelectionType, id: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Compose
  openCompose: (config?: Partial<Omit<ComposeState, 'isOpen'>>) => void;
  closeCompose: () => void;
  toggleMinimizeCompose: () => void;
  sendEmail: (data: SendEmailData, draftId?: string) => void;
  saveDraft: (data: SendEmailData, draftId?: string) => string;
  deleteDraft: (draftId: string) => void;
  cancelSend: () => void;
  
  // Mail Actions
  moveConversations: (conversationIds: string[], targetFolderId: string) => void;
  toggleLabel: (conversationIds: string[], labelId: string) => void;
  deleteConversation: (conversationIds: string[]) => void;
  archiveConversation: (conversationIds: string[]) => void;
  markAsRead: (conversationId: string) => void;
  markAsUnread: (conversationId: string) => void;
  markAsSpam: (conversationIds: string[]) => void;
  markAsNotSpam: (conversationIds: string[]) => void;

  // Bulk Selection
  toggleConversationSelection: (conversationId: string) => void;
  selectAllConversations: (conversationIds: string[]) => void;
  deselectAllConversations: () => void;
  bulkDelete: () => void;
  bulkMarkAsRead: () => void;
  bulkMarkAsUnread: () => void;

  // UI
  toggleTheme: () => void;
  toggleSidebar: () => void;
  handleEscape: () => void;
  navigateConversationList: (direction: 'up' | 'down') => void;
  openFocusedConversation: () => void;
  setView: (view: View) => void;
  
  // Settings
  updateSignature: (signature: Signature) => void;
  updateAutoResponder: (autoResponder: AutoResponder) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  deleteRule: (ruleId: string) => void;
  updateSendDelay: (sendDelay: AppSettings['sendDelay']) => void;

  // Label Management
  createLabel: (name: string, color: string) => void;
  updateLabel: (id: string, updates: Partial<Omit<Label, 'id'>>) => void;
  deleteLabel: (id: string) => void;

  // Folder Management
  createFolder: (name: string) => void;
  updateFolder: (id: string, newName: string) => void;
  deleteFolder: (id: string) => void;

  // Contacts
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (contactId: string) => void;
  setSelectedContactId: (id: string | null) => void;
  importContacts: (newContacts: Omit<Contact, 'id'>[]) => void;
  
  // Contact Groups
  createContactGroup: (name: string) => void;
  renameContactGroup: (groupId: string, newName: string) => void;
  deleteContactGroup: (groupId: string) => void;
  addContactToGroup: (groupId: string, contactId: string) => void;
  removeContactFromGroup: (groupId: string, contactId: string) => void;
  setSelectedGroupId: (id: string | null) => void;
}

interface SendEmailData {
  to: string; 
  cc?: string; 
  bcc?: string; 
  subject: string; 
  body: string; 
  attachments: File[]; 
  scheduleDate?: Date;
}

interface PendingSend {
    timerId: number;
    emailData: SendEmailData;
    draftId?: string;
    conversationId?: string;
}

const initialAppSettings: AppSettings = {
  signature: { isEnabled: false, body: '' },
  autoResponder: { isEnabled: false, subject: '', message: '' },
  rules: [],
  sendDelay: { isEnabled: true, duration: 5 },
  language: 'en',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
  const [currentSelection, setCurrentSelection] = useState<{type: SelectionType, id: string}>({type: 'folder', id: SystemFolder.INBOX});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null);
  const [composeState, setComposeState] = useState<ComposeState>({ isOpen: false, isMinimized: false });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedConversationIds, setSelectedConversationIds] = useState(new Set<string>());
  const { addToast } = useToast();
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
        return savedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('isSidebarCollapsed') === 'true');
  const [view, setView] = useState<View>('mail');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null);


  const checkUserSession = useCallback(async () => {
    setIsLoading(true);
    try {
        const session = await api.apiCheckSession();
        if (session?.user) {
            const initialData = await api.getInitialData();
            setUser(session.user);
            setEmails(initialData.emails);
            setLabels(initialData.labels);
            setUserFolders(initialData.userFolders);
            setContacts(initialData.contacts);
            setContactGroups(initialData.contactGroups);
            setAppSettings(initialData.appSettings);
        }
    } catch (error) {
        console.error("Session check failed:", error);
        setUser(null);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
        if (!email || !pass) {
            throw new Error('Please enter both email and password.');
        }
        const { user } = await api.apiLogin(email, pass);
        const initialData = await api.getInitialData();

        setUser(user);
        setEmails(initialData.emails);
        setLabels(initialData.labels);
        setUserFolders(initialData.userFolders);
        setContacts(initialData.contacts);
        setContactGroups(initialData.contactGroups);
        setAppSettings(initialData.appSettings);
        
        setCurrentSelection({type: 'folder', id: SystemFolder.INBOX});
        addToast('toasts.welcome', { tOptions: { name: user.name } });
    } catch (error: any) {
        addToast(error.message || 'toasts.loginFailed');
        console.error(error);
    } finally {
        setIsLoading(false);
    }
  }, [addToast]);


  const logout = useCallback(() => {
    setUser(null);
    setEmails([]);
    setLabels([]);
    setUserFolders([]);
    setContacts([]);
    setContactGroups([]);
    setAppSettings(initialAppSettings);
    setCurrentSelection({type: 'folder', id: SystemFolder.INBOX});
    setSelectedConversationId(null);
    addToast('toasts.logout');
  }, [addToast]);


  // --- Data Transformation ---
  const allConversations = useMemo<Conversation[]>(() => {
    if (emails.length === 0) return [];
    const grouped = emails.reduce((acc, email) => {
      const convId = email.conversationId || email.id;
      if (!acc[convId]) acc[convId] = [];
      acc[convId].push(email);
      return acc;
    }, {} as Record<string, Email[]>);

    return Object.entries(grouped)
      .map(([id, convEmails]) => {
        convEmails.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const lastEmail = convEmails[convEmails.length - 1];
        const participants = [...new Map(convEmails.map(e => [e.senderEmail, { name: e.senderEmail === user?.email ? t('emailListItem.me') : e.senderName, email: e.senderEmail }])).values()];
        const allLabelIds = [...new Set(convEmails.flatMap(e => e.labelIds))];

        return {
          id,
          subject: lastEmail.subject || t('emailListItem.noSubject'),
          emails: convEmails,
          participants,
          lastTimestamp: lastEmail.timestamp,
          isRead: convEmails.every(e => e.isRead),
          folderId: lastEmail.folderId,
          labelIds: allLabelIds,
          isSnoozed: false,
          hasAttachments: convEmails.some(e => e.attachments && e.attachments.length > 0)
        };
      })
      .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [emails, user, t]);


  const displayedConversations = useMemo(() => {
    let baseList = allConversations;
    
    if (currentSelection.type === 'folder') {
        baseList = allConversations.filter(c => c.folderId === currentSelection.id);
    } else if (currentSelection.type === 'label') {
        baseList = allConversations.filter(c => c.labelIds.includes(currentSelection.id) && c.folderId !== SystemFolder.SPAM && c.folderId !== SystemFolder.TRASH);
    }
    
    let filtered = baseList;
    
    if(searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        
        const filters: { type: string, value: string }[] = [];
        const filterRegex = /(from:|to:|subject:|is:|has:)([\w@.-]+)/g;
        
        const textSearch = lowerQuery.replace(filterRegex, '').trim();
        
        let match;
        while ((match = filterRegex.exec(lowerQuery)) !== null) {
            filters.push({ type: match[1].slice(0, -1), value: match[2] });
        }
        
        if (filters.length > 0) {
            filtered = filtered.filter(conv => {
                return filters.every(({ type, value }) => {
                    switch (type) {
                        case 'from':
                            return conv.participants.some(p => p.name.toLowerCase().includes(value) || p.email.toLowerCase().includes(value));
                        case 'to':
                            return conv.emails.some(email =>
                                (email.recipientEmail && email.recipientEmail.toLowerCase().includes(value)) ||
                                (email.cc && email.cc.toLowerCase().includes(value)) ||
                                (email.bcc && email.bcc.toLowerCase().includes(value))
                            );
                        case 'subject':
                            return conv.subject.toLowerCase().includes(value);
                        case 'is':
                            if (value === 'starred') return conv.labelIds.includes(SystemLabel.STARRED);
                            if (value === 'unread') return !conv.isRead;
                            return true;
                        case 'has':
                            return value === 'attachment' ? conv.hasAttachments : true;
                        default:
                            return true;
                    }
                });
            });
        }

        if (textSearch) {
            filtered = filtered.filter(conv => 
                conv.subject.toLowerCase().includes(textSearch) ||
                conv.participants.some(p => p.name.toLowerCase().includes(textSearch) || p.email.toLowerCase().includes(textSearch)) ||
                conv.emails.some(e => e.snippet.toLowerCase().includes(textSearch))
            );
        }
    }
    
    return filtered;

  }, [allConversations, currentSelection, searchQuery]);
  

  const setCurrentSelectionCallback = useCallback((type: SelectionType, id: string) => {
    setView('mail');
    setCurrentSelection({type, id});
    setSelectedConversationId(null);
    setFocusedConversationId(null);
    setSearchQuery('');
    setSelectedConversationIds(new Set());
  }, []);

  const openCompose = useCallback((config: Partial<Omit<ComposeState, 'isOpen'>> = {}) => {
    const draftId = (config.action === ActionType.DRAFT && config.email) ? config.email.id : undefined;
    const conversationId = config.email?.conversationId;
    setComposeState({ isOpen: true, isMinimized: false, draftId, conversationId, ...config });
  }, []);

  const closeCompose = useCallback(() => setComposeState({ isOpen: false, isMinimized: false }), []);
  const toggleMinimizeCompose = useCallback(() => setComposeState(prev => ({ ...prev, isMinimized: !prev.isMinimized })), []);
  const deselectAllConversations = useCallback(() => setSelectedConversationIds(new Set()), []);
  
  const moveConversations = useCallback(async (conversationIds: string[], targetFolderId: string) => {
    try {
        const { emails: updatedEmails } = await api.apiMoveConversations(conversationIds, targetFolderId);
        setEmails(updatedEmails);
        const folderName = userFolders.find(f => f.id === targetFolderId)?.name || t(`sidebar.systemFolders.${targetFolderId.toLowerCase()}`);
        addToast('toasts.moved', { tOptions: { count: conversationIds.length, folderName: folderName }});
        deselectAllConversations();
        if (conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
    } catch (err) {
        addToast('toasts.moveFailed', { duration: 4000 });
        console.error("Failed to move conversations", err);
    }
  }, [addToast, userFolders, deselectAllConversations, selectedConversationId, t]);

  const toggleLabel = useCallback(async (conversationIds: string[], labelId: string) => {
    try {
      const { emails: updatedEmails } = await api.apiToggleLabel(conversationIds, labelId);
      setEmails(updatedEmails);
      const label = labels.find(l => l.id === labelId);
      const isAdding = updatedEmails.find(e => e.conversationId === conversationIds[0])?.labelIds.includes(labelId);
      if (label?.name !== SystemLabel.STARRED) {
          addToast(isAdding ? 'toasts.labelAdded' : 'toasts.labelRemoved', { tOptions: { name: label?.name } });
      }
    } catch (err) {
      addToast('toasts.labelUpdateFailed', { duration: 4000 });
      console.error("Failed to toggle label", err);
    }
  }, [addToast, labels]);
  
  const archiveConversation = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, SystemFolder.ARCHIVE);
  }, [moveConversations]);

  const actuallySendEmail = useCallback(async (data: SendEmailData, draftId?: string, conversationId?: string) => {
      if (!user) return;
      try {
        const { emails: updatedEmails } = await api.apiSendEmail(data, user, conversationId, draftId);
        setEmails(updatedEmails);
        if (data.scheduleDate) {
            addToast('toasts.messageScheduled');
        } else {
            addToast('toasts.messageSent');
        }
        const targetFolder = data.scheduleDate ? SystemFolder.SCHEDULED : SystemFolder.SENT;
        if (currentSelection.id !== targetFolder) {
            setCurrentSelectionCallback('folder', targetFolder);
        }
      } catch (err) {
          addToast('toasts.sendFailed', { duration: 4000 });
          console.error("Failed to send email", err);
      }
  }, [user, addToast, setCurrentSelectionCallback, currentSelection]);

  const cancelSend = useCallback(() => {
    if (pendingSend) {
        clearTimeout(pendingSend.timerId);
        openCompose({ 
            initialData: pendingSend.emailData, 
            draftId: pendingSend.draftId,
            conversationId: pendingSend.conversationId,
        });
        setPendingSend(null);
        addToast('toasts.sendCancelled');
    }
  }, [pendingSend, openCompose, addToast]);

  const sendEmail = useCallback((data: SendEmailData, draftId?: string) => {
    const convId = composeState.conversationId;
    closeCompose();

    if (data.scheduleDate) {
      actuallySendEmail(data, draftId, convId);
      return;
    }
    
    if (appSettings.sendDelay.isEnabled && appSettings.sendDelay.duration > 0) {
      if (pendingSend?.timerId) clearTimeout(pendingSend.timerId);
      
      const timerId = setTimeout(() => {
        actuallySendEmail(data, draftId, convId);
        setPendingSend(null);
      }, appSettings.sendDelay.duration * 1000);
      
      setPendingSend({ timerId: timerId as unknown as number, emailData: data, draftId, conversationId: convId });
      
      addToast('toasts.sending', {
        duration: appSettings.sendDelay.duration * 1000,
        action: { label: 'toasts.undo', onClick: cancelSend }
      });
    } else {
      actuallySendEmail(data, draftId, convId);
    }
  }, [closeCompose, actuallySendEmail, appSettings.sendDelay, pendingSend, addToast, cancelSend, composeState.conversationId]);
  
  const saveDraft = useCallback((data: SendEmailData, draftId?: string) => {
      if (!user) return '';
      const conversationId = composeState.conversationId || `conv-${Date.now()}`;
      
      api.apiSaveDraft(data, user, conversationId, draftId).then(({ emails, newDraftId }) => {
          setEmails(emails);
          addToast('toasts.draftSaved');
          if (currentSelection.id !== SystemFolder.DRAFTS) {
            setCurrentSelectionCallback('folder', SystemFolder.DRAFTS);
          }
          if(composeState.isOpen) { // keep draftId up to date if compose window is open
            setComposeState(prev => ({...prev, draftId: newDraftId}));
          }
      }).catch(err => {
          addToast('toasts.saveDraftFailed', { duration: 4000 });
          console.error("Failed to save draft", err);
      });

      return draftId || ''; // This is optimistic
  }, [user, addToast, composeState.conversationId, composeState.isOpen, currentSelection, setCurrentSelectionCallback]);

  const deleteDraft = useCallback(async (draftId: string) => {
    try {
        const { emails: updatedEmails } = await api.apiDeleteDraft(draftId);
        setEmails(updatedEmails);
        addToast('toasts.draftDiscarded');
    } catch (err) {
        addToast('toasts.discardDraftFailed', { duration: 4000 });
        console.error("Failed to delete draft", err);
    }
  }, [addToast]);

  const deleteConversation = useCallback(async (conversationIds: string[]) => {
    const convsToDelete = allConversations.filter(c => conversationIds.includes(c.id));
    const isPermanentDelete = convsToDelete.every(c => c.folderId === SystemFolder.TRASH);

    if (isPermanentDelete) {
        try {
            const { emails: updatedEmails } = await api.apiDeletePermanently(conversationIds);
            setEmails(updatedEmails);
            addToast('toasts.deletedPermanently', { tOptions: { count: conversationIds.length } });
        } catch (err) {
            addToast('toasts.deletePermanentlyFailed', { duration: 4000 });
            console.error("Failed to delete permanently", err);
        }
    } else {
        await moveConversations(conversationIds, SystemFolder.TRASH);
    }

    if(selectedConversationIds.size > 0) deselectAllConversations();
    if(conversationIds.includes(selectedConversationId!)) setSelectedConversationId(null);
  }, [allConversations, moveConversations, addToast, selectedConversationId, selectedConversationIds, deselectAllConversations]);

  const handleEscape = useCallback(() => {
    if (composeState.isOpen) return;
    if (selectedConversationId) setSelectedConversationId(null);
    else if (searchQuery) setSearchQuery('');
    else if (focusedConversationId) setFocusedConversationId(null);
  }, [composeState.isOpen, selectedConversationId, searchQuery, focusedConversationId]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  const toggleSidebar = useCallback(() => { setIsSidebarCollapsed(prev => { const newState = !prev; localStorage.setItem('isSidebarCollapsed', String(newState)); return newState; }); }, []);
  const toggleConversationSelection = useCallback((conversationId: string) => { setSelectedConversationIds(prev => { const newSet = new Set(prev); if (newSet.has(conversationId)) newSet.delete(conversationId); else newSet.add(conversationId); return newSet; }); }, []);
  const selectAllConversations = useCallback((conversationIds: string[]) => { setSelectedConversationIds(new Set(conversationIds)); }, []);
  
  const markConversationsAsRead = useCallback(async (conversationIds: string[], isRead: boolean) => {
    try {
        const { emails: updatedEmails } = await api.apiMarkConversationsAsRead(conversationIds, isRead);
        setEmails(updatedEmails);
    } catch (err) {
        addToast(`toasts.markReadFailed`, { duration: 4000, tOptions: { status: isRead ? t('status.read') : t('status.unread') } });
        console.error("Failed to mark conversations", err);
    }
  }, [addToast, t]);
  
  const bulkAction = useCallback((action: 'read' | 'unread' | 'delete') => {
    const ids = Array.from(selectedConversationIds);
    if (ids.length === 0) return;
    if (action === 'delete') {
      deleteConversation(ids);
    } else {
       markConversationsAsRead(ids, action === 'read'); 
       addToast('toasts.marked', { tOptions: { count: ids.length, status: t(`status.${action}`) } });
    }
    deselectAllConversations();
  }, [selectedConversationIds, deleteConversation, deselectAllConversations, markConversationsAsRead, addToast, t]);

  const bulkDelete = useCallback(() => bulkAction('delete'), [bulkAction]);
  const bulkMarkAsRead = useCallback(() => bulkAction('read'), [bulkAction]);
  const bulkMarkAsUnread = useCallback(() => bulkAction('unread'), [bulkAction]);
  const markAsRead = useCallback((conversationId: string) => { markConversationsAsRead([conversationId], true); }, [markConversationsAsRead]);
  const markAsUnread = useCallback((conversationId: string) => { markConversationsAsRead([conversationId], false); }, [markConversationsAsRead]);

  const navigateConversationList = useCallback((direction: 'up' | 'down') => {
    if (displayedConversations.length === 0) return;
    const currentId = focusedConversationId || selectedConversationId;
    const index = displayedConversations.findIndex(c => c.id === currentId);
    let nextIndex = index + (direction === 'down' ? 1 : -1);
    nextIndex = Math.max(0, Math.min(displayedConversations.length - 1, nextIndex));
    if (nextIndex !== index || !currentId) setFocusedConversationId(displayedConversations[nextIndex]?.id || null);
  }, [displayedConversations, focusedConversationId, selectedConversationId]);
  
  const openFocusedConversation = useCallback(() => {
    if (focusedConversationId) {
        setSelectedConversationId(focusedConversationId);
        const conv = allConversations.find(c => c.id === focusedConversationId);
        if (conv && !conv.isRead) markAsRead(focusedConversationId);
    }
  }, [focusedConversationId, allConversations, markAsRead]);

  const createLabel = useCallback(async (name: string, color: string) => {
      try {
        const { labels: updatedLabels } = await api.apiCreateLabel(name, color);
        setLabels(updatedLabels);
        addToast('toasts.labelCreated', { tOptions: { name } });
      } catch (err) {
        addToast('toasts.createLabelFailed', { duration: 4000 });
      }
  }, [addToast]);

  const updateLabel = useCallback(async (id: string, updates: Partial<Omit<Label, 'id'>>) => {
      try {
        const { labels: updatedLabels } = await api.apiUpdateLabel(id, updates);
        setLabels(updatedLabels);
        addToast(`toasts.labelUpdated`);
      } catch (err) {
        addToast('toasts.updateLabelFailed', { duration: 4000 });
      }
  }, [addToast]);

  const deleteLabel = useCallback(async (id: string) => {
      try {
        const { labels: updatedLabels, emails: updatedEmails } = await api.apiDeleteLabel(id);
        const labelName = labels.find(l => l.id === id)?.name || 'label';
        setLabels(updatedLabels);
        setEmails(updatedEmails);
        addToast('toasts.labelDeleted', { tOptions: { name: labelName }});
      } catch (err) {
        addToast('toasts.deleteLabelFailed', { duration: 4000 });
      }
  }, [addToast, labels]);
  
  const createFolder = useCallback(async (name: string) => {
      try {
        const { folders: updatedFolders } = await api.apiCreateFolder(name);
        setUserFolders(updatedFolders);
        addToast('toasts.folderCreated', { tOptions: { name }});
      } catch (err) {
        addToast('toasts.createFolderFailed', { duration: 4000 });
      }
  }, [addToast]);

  const updateFolder = useCallback(async (id: string, newName: string) => {
      try {
        const { folders: updatedFolders } = await api.apiUpdateFolder(id, newName);
        setUserFolders(updatedFolders);
        addToast('toasts.folderRenamed');
      } catch (err) {
        addToast('toasts.renameFolderFailed', { duration: 4000 });
      }
  }, [addToast]);

  const deleteFolder = useCallback(async (id: string) => {
      try {
        const { folders: updatedFolders, emails: updatedEmails } = await api.apiDeleteFolder(id);
        const folderName = userFolders.find(f => f.id === id)?.name || 'Folder';
        setUserFolders(updatedFolders);
        setEmails(updatedEmails);
        addToast('toasts.folderDeleted', { tOptions: { name: folderName }});
      } catch (err) {
        addToast('toasts.deleteFolderFailed', { duration: 4000 });
      }
  }, [addToast, userFolders]);

  const markAsSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, SystemFolder.SPAM);
  }, [moveConversations]);

  const markAsNotSpam = useCallback((conversationIds: string[]) => {
    moveConversations(conversationIds, SystemFolder.INBOX);
  }, [moveConversations]);

  const addContact = useCallback(async (contactData: Omit<Contact, 'id'>) => {
    try {
        const { contacts: updatedContacts, newContactId } = await api.apiAddContact(contactData);
        setContacts(updatedContacts);
        addToast('toasts.contactAdded');
        setSelectedContactId(newContactId);
    } catch(err) {
        addToast('toasts.addContactFailed', { duration: 4000 });
        console.error("Failed to add contact", err);
    }
  }, [addToast]);
  
  const updateContact = useCallback(async (updatedContact: Contact) => {
    try {
        const { contacts: updatedContacts } = await api.apiUpdateContact(updatedContact);
        setContacts(updatedContacts);
        addToast('toasts.contactUpdated');
    } catch(err) {
        addToast('toasts.updateContactFailed', { duration: 4000 });
        console.error("Failed to update contact", err);
    }
  }, [addToast]);

  const deleteContact = useCallback(async (contactId: string) => {
    try {
        const { contacts: updatedContacts, groups: updatedGroups } = await api.apiDeleteContact(contactId);
        setContacts(updatedContacts);
        setContactGroups(updatedGroups);
        addToast('toasts.contactDeleted');
        setSelectedContactId(null);
    } catch(err) {
        addToast('toasts.deleteContactFailed', { duration: 4000 });
        console.error("Failed to delete contact", err);
    }
  }, [addToast]);
  
  const importContacts = useCallback(async (newContacts: Omit<Contact, 'id'>[]) => {
    try {
        const { contacts: updatedContacts, importedCount, skippedCount } = await api.apiImportContacts(newContacts);
        setContacts(updatedContacts);
        let toastMessageKey = '';
        if (importedCount > 0 && skippedCount > 0) {
            toastMessageKey = 'toasts.importResult';
        } else if (importedCount > 0) {
            toastMessageKey = 'toasts.importResultImported';
        } else if (skippedCount > 0) {
            toastMessageKey = 'toasts.importResultSkipped';
        }
        addToast(toastMessageKey || 'toasts.importEmpty', { tOptions: { importedCount, skippedCount }});
    } catch (err) {
        addToast('toasts.importFailed', { duration: 4000 });
        console.error("Failed to import contacts", err);
    }
  }, [addToast]);
  
  const createContactGroup = useCallback(async (name: string) => {
    try {
        const { groups: updatedGroups } = await api.apiCreateContactGroup(name);
        setContactGroups(updatedGroups);
        addToast('toasts.groupCreated', { tOptions: { name } });
    } catch(err) {
        addToast('toasts.createGroupFailed', { duration: 4000 });
        console.error("Failed to create group", err);
    }
  }, [addToast]);
  
  const renameContactGroup = useCallback(async (groupId: string, newName: string) => {
    try {
        const { groups: updatedGroups } = await api.apiRenameContactGroup(groupId, newName);
        setContactGroups(updatedGroups);
        addToast('toasts.groupRenamed');
    } catch(err) {
        addToast('toasts.renameGroupFailed', { duration: 4000 });
        console.error("Failed to rename group", err);
    }
  }, [addToast]);
  
  const deleteContactGroup = useCallback(async (groupId: string) => {
    try {
        const { groups: updatedGroups } = await api.apiDeleteContactGroup(groupId);
        setContactGroups(updatedGroups);
        if (selectedGroupId === groupId) setSelectedGroupId(null);
        addToast('toasts.groupDeleted');
    } catch(err) {
        addToast('toasts.deleteGroupFailed', { duration: 4000 });
        console.error("Failed to delete group", err);
    }
  }, [addToast, selectedGroupId]);
  
  const addContactToGroup = useCallback(async (groupId: string, contactId: string) => {
    try {
        const { groups: updatedGroups } = await api.apiAddContactToGroup(groupId, contactId);
        setContactGroups(updatedGroups);
        const groupName = contactGroups.find(g => g.id === groupId)?.name;
        const contactName = contacts.find(c => c.id === contactId)?.name;
        if(groupName && contactName) addToast('toasts.contactAddedToGroup', { tOptions: { contactName, groupName } });
    } catch(err) {
        addToast('toasts.addToGroupFailed', { duration: 4000 });
        console.error("Failed to add to group", err);
    }
  }, [addToast, contactGroups, contacts]);
  
  const removeContactFromGroup = useCallback(async (groupId: string, contactId: string) => { 
    try {
        const { groups: updatedGroups } = await api.apiRemoveContactFromGroup(groupId, contactId);
        setContactGroups(updatedGroups);
    } catch (err) {
        addToast('toasts.removeFromGroupFailed', { duration: 4000 });
        console.error("Failed to remove from group", err);
    }
  }, [addToast]);

  const updateSettings = async (updatedSettings: AppSettings) => {
      try {
        const { settings: newSettings } = await api.apiUpdateSettings(updatedSettings);
        setAppSettings(newSettings);
      } catch (err) {
        addToast('toasts.settingsUpdateFailed', { duration: 4000 });
      }
  };

  const updateSignature = useCallback((signature: Signature) => { 
      const newSettings = {...appSettings, signature };
      updateSettings(newSettings);
      addToast('toasts.signatureUpdated'); 
  }, [addToast, appSettings]);

  const updateAutoResponder = useCallback((autoResponder: AutoResponder) => { 
      const newSettings = {...appSettings, autoResponder };
      updateSettings(newSettings);
      addToast('toasts.autoResponderUpdated'); 
  }, [addToast, appSettings]);
  
  const addRule = useCallback((ruleData: Omit<Rule, 'id'>) => { 
      const newRule = { ...ruleData, id: `rule-${Date.now()}`}; 
      const newSettings = {...appSettings, rules: [...appSettings.rules, newRule]};
      updateSettings(newSettings);
      addToast("toasts.ruleAdded"); 
  }, [addToast, appSettings]);
  
  const deleteRule = useCallback((ruleId: string) => { 
      const newSettings = { ...appSettings, rules: appSettings.rules.filter(r => r.id !== ruleId) };
      updateSettings(newSettings);
      addToast("toasts.ruleDeleted"); 
  }, [addToast, appSettings]);
  
  const updateSendDelay = useCallback((sendDelay: AppSettings['sendDelay']) => { 
      const newSettings = { ...appSettings, sendDelay };
      updateSettings(newSettings);
      addToast("toasts.sendDelayUpdated"); 
  }, [addToast, appSettings]);
  
  const setViewCallback = useCallback((newView: View) => { setView(newView); setSelectedConversationId(null); setFocusedConversationId(null); setSearchQuery(''); setSelectedConversationIds(new Set()); setSelectedContactId(null); }, []);

  const contextValue: AppContextType = {
    user, emails, conversations: allConversations, labels, userFolders, currentSelection, selectedConversationId, focusedConversationId, composeState, searchQuery, selectedConversationIds, theme, displayedConversations, isSidebarCollapsed, view, appSettings, contacts, contactGroups, selectedContactId, selectedGroupId, isLoading,
    login, logout, checkUserSession,
    setCurrentSelection: setCurrentSelectionCallback, setSelectedConversationId, setSearchQuery,
    openCompose, closeCompose, toggleMinimizeCompose, sendEmail, cancelSend, saveDraft, deleteDraft,
    moveConversations,
    toggleLabel, deleteConversation, archiveConversation, markAsRead, markAsUnread, markAsSpam, markAsNotSpam,
    toggleConversationSelection, selectAllConversations, deselectAllConversations, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread,
    toggleTheme, toggleSidebar, handleEscape, navigateConversationList, openFocusedConversation, setView: setViewCallback,
    updateSignature, updateAutoResponder, addRule, deleteRule, updateSendDelay,
    createLabel, updateLabel, deleteLabel,
    createFolder, updateFolder, deleteFolder,
    addContact, updateContact, deleteContact, setSelectedContactId, importContacts,
    createContactGroup, renameContactGroup, deleteContactGroup, addContactToGroup, removeContactFromGroup, setSelectedGroupId,
  };

  return <AppContext.Provider value={useMemo(() => contextValue, [contextValue])}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppContextProvider');
  return context;
};
