import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';
import { ArrowUturnRightIcon } from './icons/ArrowUturnRightIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { StarIconSolid } from './icons/StarIconSolid';
import { StarIcon as StarIconOutline } from './icons/StarIcon';
import { MailIcon } from './icons/MailIcon';
import { ActionType, Email, SystemLabel, Label, SystemFolder } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { EllipsisVerticalIcon } from './icons/EllipsisVerticalIcon';
import { NoSymbolIcon } from './icons/NoSymbolIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { EnvelopeOpenIcon } from './icons/EnvelopeOpenIcon';
import { TagIcon } from './icons/TagIcon';
import LabelManagerPopover from './LabelManagerPopover';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { FolderArrowDownIcon } from './icons/FolderArrowDownIcon';
import MoveToPopover from './MoveToPopover';


const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SingleEmailInThread: React.FC<{ email: Email; isExpanded: boolean; onToggle: () => void; onReply: (email: Email) => void; onForward: (email: Email) => void; }> = ({ email, isExpanded, onToggle, onReply, onForward }) => {
    const formatDate = (dateString: string) => new Date(dateString).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

    return (
        <div className="border border-outline dark:border-dark-outline rounded-lg mb-4 bg-white dark:bg-dark-surface-container overflow-hidden">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={onToggle}>
                <div className="flex items-center min-w-0">
                    <UserCircleIcon className="w-8 h-8 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <div className="flex flex-col sm:flex-row sm:items-center min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-semibold text-on-surface dark:text-dark-on-surface truncate" title={email.senderName}>{email.senderName}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={email.senderEmail}>{`<${email.senderEmail}>`}</span>
                            {!isExpanded && <span className="text-sm text-gray-500 dark:text-gray-400 sm:hidden">, {formatDate(email.timestamp)}</span>}
                        </div>
                        <div className="hidden sm:flex items-center">
                            {isExpanded && <span className="mx-2 text-gray-400">&middot;</span>}
                            <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(email.timestamp)}</span>
                        </div>
                    </div>
                </div>
                {!isExpanded && <p className="text-sm text-gray-600 dark:text-gray-400 truncate ml-4 flex-grow">{email.snippet}</p>}
            </div>
            {isExpanded && (
                <div className="px-6 pb-6">
                    <div className="border-t border-outline dark:border-dark-outline pt-4 flex justify-between items-start">
                         <p className="text-sm text-gray-500 dark:text-gray-400">to {email.recipientEmail}</p>
                         <div className="flex items-center">
                             <button onClick={() => onReply(email)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Reply"><ArrowUturnLeftIcon className="w-5 h-5"/></button>
                            <button onClick={() => onForward(email)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Forward"><ArrowUturnRightIcon className="w-5 h-5"/></button>
                         </div>
                    </div>
                    <div className="pt-4 prose dark:prose-invert max-w-none prose-a:text-primary dark:prose-a:text-blue-400" dangerouslySetInnerHTML={{ __html: email.body }} />
                    {email.attachments && email.attachments.length > 0 && (
                        <div className="pt-6 mt-6 border-t border-outline dark:border-dark-outline">
                            <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">{email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}</h3>
                            <ul className="flex flex-wrap gap-3">
                            {email.attachments.map((att, index) => (
                                <li key={index} className="flex items-center p-2 border border-outline dark:border-dark-outline rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer w-full sm:w-auto max-w-xs">
                                    <PaperClipIcon className="w-5 h-5 mr-3 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate text-on-surface dark:text-dark-on-surface" title={att.fileName}>{att.fileName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(att.fileSize)}</p>
                                    </div>
                                </li>
                            ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const EmailView: React.FC = () => {
  const { selectedConversationId, setSelectedConversationId, currentSelection, deleteConversation, openCompose, toggleLabel, markAsSpam, markAsNotSpam, displayedConversations, addRule, markAsUnread, archiveConversation, moveConversations, labels } = useAppContext();
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);
  const [isMovePopoverOpen, setIsMovePopoverOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const selectedConversation = displayedConversations.find(c => c.id === selectedConversationId);
  const latestEmail = selectedConversation?.emails[selectedConversation.emails.length - 1];
  const isStarred = selectedConversation?.labelIds.includes(SystemLabel.STARRED) || false;

  useEffect(() => {
    if (selectedConversation) {
      const latestEmailId = selectedConversation.emails[selectedConversation.emails.length - 1].id;
      setExpandedEmails(new Set([latestEmailId]));
    }
  }, [selectedConversation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) setIsMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedConversation) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400">
        <MailIcon className="w-24 h-24 text-gray-200 dark:text-gray-700" />
        <p className="mt-4 text-lg">Select a conversation to read</p>
      </div>
    );
  }

  const handleToggleExpand = (emailId: string) => { setExpandedEmails(prev => { const newSet = new Set(prev); newSet.has(emailId) ? newSet.delete(emailId) : newSet.add(emailId); return newSet; }); };
  const handleReply = () => openCompose({ action: ActionType.REPLY, email: latestEmail });
  const handleForward = () => openCompose({ action: ActionType.FORWARD, email: latestEmail });
  const handleStarConversation = () => toggleLabel([selectedConversation.id], SystemLabel.STARRED);
  const handleDeleteConversation = () => deleteConversation([selectedConversation.id]);
  const handleSpamAction = () => { currentSelection.id === SystemFolder.SPAM ? markAsNotSpam([selectedConversation.id]) : markAsSpam([selectedConversation.id]); setIsMoreMenuOpen(false); };
  const handleArchive = () => archiveConversation([selectedConversation.id]);
  
  const handleMove = (targetFolderId: string) => {
      moveConversations([selectedConversation.id], targetFolderId);
      setIsMovePopoverOpen(false);
      setIsMoreMenuOpen(false);
  }

  const handleMarkAsUnread = () => { markAsUnread(selectedConversation.id); setIsMoreMenuOpen(false); setSelectedConversationId(null); };

  const handleBlockSender = () => {
    if (!latestEmail) return;
    if (window.confirm(`Are you sure you want to block ${latestEmail.senderEmail}? Future messages from this sender will be moved to Trash.`)) {
        addRule({
            condition: { field: 'sender', operator: 'contains', value: latestEmail.senderEmail },
            action: { type: 'moveToFolder', folderId: SystemFolder.TRASH }
        });
    }
    setIsMoreMenuOpen(false);
  };

  const userLabels = selectedConversation.labelIds
    .map(id => labels.find(l => l.id === id))
    .filter((l): l is Label => l !== undefined);

  return (
    <div className="flex-grow flex flex-col bg-gray-50 dark:bg-dark-surface overflow-y-auto">
      <div className="p-4 border-b border-outline dark:border-dark-outline bg-white dark:bg-dark-surface-container sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
            <div className="flex items-center min-w-0">
                <button onClick={() => setSelectedConversationId(null)} className="p-2 mr-2 -ml-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Back to list">
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-normal text-on-surface dark:text-dark-on-surface truncate pr-4">{selectedConversation.subject}</h2>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {userLabels.map(label => (
                        <div key={label.id} className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${label.color}33`, color: label.color }}>
                            {label.name}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                {selectedConversation.folderId === SystemFolder.INBOX && <button onClick={handleArchive} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Archive"><ArchiveBoxIcon className="w-5 h-5"/></button>}
                 <button onClick={handleSpamAction} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title={currentSelection.id === SystemFolder.SPAM ? "Not spam" : "Mark as spam"}><ExclamationCircleIcon className="w-5 h-5"/></button>
                 <div className="relative">
                    <button onClick={() => setIsLabelPopoverOpen(p => !p)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Apply label"><TagIcon className="w-5 h-5"/></button>
                    {isLabelPopoverOpen && <LabelManagerPopover conversationIds={[selectedConversation.id]} onClose={() => setIsLabelPopoverOpen(false)} />}
                </div>
                <button onClick={handleStarConversation} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-500/20" title={isStarred ? 'Unstar conversation' : 'Star conversation'}>{isStarred ? <StarIconSolid className="w-5 h-5 text-yellow-500" /> : <StarIconOutline className="w-5 h-5 text-gray-400" />}</button>
                <button onClick={handleReply} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Reply to latest"><ArrowUturnLeftIcon className="w-5 h-5"/></button>
                <button onClick={handleForward} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Forward latest"><ArrowUturnRightIcon className="w-5 h-5"/></button>
                <button onClick={handleDeleteConversation} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete conversation"><TrashIcon className="w-5 h-5"/></button>
                <div className="relative" ref={moreMenuRef}>
                    <button onClick={() => setIsMoreMenuOpen(p => !p)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="More options"><EllipsisVerticalIcon className="w-5 h-5"/></button>
                    {isMoreMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20">
                            <div className="py-1">
                                <button onClick={handleMarkAsUnread} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><EnvelopeOpenIcon className="w-5 h-5" /> Mark as unread</button>
                                <div className="relative">
                                    <button onClick={() => setIsMovePopoverOpen(p => !p)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><FolderArrowDownIcon className="w-5 h-5" /> Move to...</button>
                                    {isMovePopoverOpen && <MoveToPopover onSelectFolder={handleMove} onClose={() => setIsMovePopoverOpen(false)} aclass="left-full -top-1 ml-1"/>}
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                <button onClick={handleBlockSender} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><NoSymbolIcon className="w-5 h-5" /> Block "{latestEmail?.senderName}"</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {currentSelection.id === SystemFolder.SPAM && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-sm rounded-md mx-4">
                This conversation is in Spam. Messages in Spam will be deleted after 30 days.
            </div>
        )}
      </div>
      <div className="p-6">
        {selectedConversation.emails.map(email => (
            <SingleEmailInThread 
                key={email.id} 
                email={email}
                isExpanded={expandedEmails.has(email.id)}
                onToggle={() => handleToggleExpand(email.id)}
                onReply={(email) => openCompose({ action: ActionType.REPLY, email })}
                onForward={(email) => openCompose({ action: ActionType.FORWARD, email })}
            />
        ))}
      </div>
    </div>
  );
};

export default EmailView;
