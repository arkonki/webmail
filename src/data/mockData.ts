import { Contact, Email, User, Label, SystemLabel, ContactGroup, SystemFolder, UserFolder } from '../types';

export let mockUser: User = {
    email: 'test.user@example.com',
    name: 'Test User',
};

export let mockLabels: Label[] = [
    { id: 'label-1', name: 'Travel', color: '#3498db' }, // Blue
    { id: 'label-2', name: 'Receipts', color: '#2ecc71' }, // Green
    { id: 'label-3', name: 'Work', color: '#e74c3c' }, // Red
    { id: 'label-4', name: 'Personal', color: '#f1c40f' }, // Yellow
];

export let mockUserFolders: UserFolder[] = [
    { id: 'folder-1', name: 'Project Phoenix' },
    { id: 'folder-2', name: 'Conference 2024' },
];

export let mockContacts: Contact[] = [
  { id: 'contact-1', name: 'Alex Johnson', email: 'alex.j@example.com', phone: '123-456-7890', company: 'Innovate Inc.', notes: 'Lead developer on Project Alpha.' },
  { id: 'contact-2', name: 'Jane Doe', email: 'jane.d@example.com', phone: '987-654-3210', company: 'Solutions Co.', notes: 'Met at the 2023 tech conference.' },
  { id: 'contact-3', name: 'Sarah Lee', email: 'sarah.k@example.com', company: 'Innovate Inc.' },
  { id: 'contact-4', name: 'GitHub', email: 'noreply@github.com', notes: 'Automated notifications.' },
  { id: 'contact-5', name: 'Vercel', email: 'notifications@vercel.com' },
  { id: 'contact-6', name: 'Figma', email: 'team@figma.com', company: 'Figma' },
  { id: 'contact-7', name: 'Mom', email: 'mom@example.com', phone: '555-123-4567', notes: 'Call on weekends!' },
  { id: 'user', name: mockUser.name, email: mockUser.email},
  { id: 'contact-8', name: 'Tech Weekly', email: 'newsletter@techweekly.com' },
  { id: 'contact-9', name: 'SocialNet', email: 'notification@social.net' },
  { id: 'contact-10', name: 'OnlineStore', email: 'orders@estore.com' },
  { id: 'contact-11', name: 'Chris Green', email: 'chris.g@example.com', company: 'Solutions Co.' },
  { id: 'contact-12', name: 'Marketing Team', email: 'marketing-updates@example.com' },
];

export let mockContactGroups: ContactGroup[] = [
    { id: 'group-1', name: 'Work Team', contactIds: ['contact-1', 'contact-3', 'contact-11'] },
    { id: 'group-2', name: 'Family', contactIds: ['contact-7'] },
];
