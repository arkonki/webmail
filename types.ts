
export enum SystemFolder {
  INBOX = 'Inbox',
  SENT = 'Sent',
  DRAFTS = 'Drafts',
  SPAM = 'Spam',
  TRASH = 'Trash',
  SCHEDULED = 'Scheduled',
  ARCHIVE = 'Archive',
}
export const SYSTEM_FOLDERS = Object.values(SystemFolder);


// Labels are for tagging, Starred is a special tag
export enum SystemLabel {
  STARRED = 'Starred',
  SNOOZED = 'Snoozed',
}
export const SYSTEM_LABELS = Object.values(SystemLabel);


export enum ActionType {
  REPLY = 'reply',
  FORWARD = 'forward',
  DRAFT = 'draft',
}

export interface Attachment {
  fileName: string;
  fileSize: number; // in bytes
}

export interface Label {
  id: string;
  name:string;
  color: string;
}

export interface UserFolder {
  id: string;
  name: string;
}


export interface Email {
  id: string;
  conversationId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  snippet: string;
  timestamp: string;
  isRead: boolean;
  folderId: string;
  labelIds: string[];
  attachments?: Attachment[];
  scheduledSendTime?: string;
  snoozedUntil?: string;
}

export interface Conversation {
    id: string;
    subject: string;
    emails: Email[];
    participants: { name: string, email: string }[];
    lastTimestamp: string;
    isRead: boolean;
    folderId: string;
    labelIds: string[];
    isSnoozed: boolean;
    hasAttachments: boolean;
}

export interface User {
    email: string;
    name: string;
}

export interface Contact {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    notes?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  contactIds: string[];
}


// Settings Types
export interface Signature {
  isEnabled: boolean;
  body: string;
}

export interface AutoResponder {
  isEnabled: boolean;
  subject: string;
  message: string;
  startDate?: string;
  endDate?: string;
}

export interface Rule {
  id: string;
  condition: {
    field: 'sender' | 'recipient' | 'subject';
    operator: 'contains';
    value: string;
  };
  action: {
    type: 'applyLabel' | 'star' | 'markAsRead' | 'moveToFolder';
    labelId?: string;
    folderId?: string;
  };
}


export interface AppSettings {
  signature: Signature;
  autoResponder: AutoResponder;
  rules: Rule[];
  sendDelay: {
    isEnabled: boolean;
    duration: 5 | 10 | 20 | 30; // seconds
  };
}