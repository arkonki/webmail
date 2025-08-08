
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TrashIcon } from './icons/TrashIcon';
import { MailIcon } from './icons/MailIcon';
import { InboxIcon } from './icons/InboxIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import ConversationListItem from './EmailListItem';
import SearchBar from './SearchBar';
import { TagIcon } from './icons/TagIcon';
import LabelManagerPopover from './LabelManagerPopover';
import { SystemFolder } from '../types';
import { FolderArrowDownIcon } from './icons/FolderArrowDownIcon';
import MoveToPopover from './MoveToPopover';

const BulkActionBar = () => {
    const { 
      selectedConversationIds, bulkDelete, bulkMarkAsRead, bulkMarkAsUnread, 
      deselectAllConversations, markAsSpam, archiveConversation, 
      currentSelection, moveConversations
    } = useAppContext();
    const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);
    const [isMovePopoverOpen, setIsMovePopoverOpen] = useState(false);
    const count = selectedConversationIds.size;
    const conversationIds = Array.from(selectedConversationIds);

    const handleMarkAsSpam = () => {
        markAsSpam(conversationIds);
        deselectAllConversations();
    }
    
    const handleArchive = () => {
        archiveConversation(conversationIds);
    }
    
    const handleMove = (targetFolderId: string) => {
        moveConversations(conversationIds, targetFolderId);
        setIsMovePopoverOpen(false);
    }

    const showArchive = currentSelection.type === 'folder' && currentSelection.id === SystemFolder.INBOX;

    return (
        <div className="flex items-center justify-between p-2 bg-primary/10 dark:bg-primary/20 border-b border-outline dark:border-dark-outline">
            <div className="flex items-center">
                <button onClick={deselectAllConversations} className="px-2 py-1 text-sm font-semibold text-primary">
                    {count} selected
                </button>
            </div>
            <div className="flex items-center space-x-2">
                {showArchive &&
                    <button onClick={handleArchive} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Archive">
                        <ArchiveBoxIcon className="w-5 h-5" />
                    </button>
                }
                <div className="relative">
                    <button onClick={() => setIsMovePopoverOpen(prev => !prev)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Move to">
                        <FolderArrowDownIcon className="w-5 h-5" />
                    </button>
                    {isMovePopoverOpen && <MoveToPopover onSelectFolder={handleMove} onClose={() => setIsMovePopoverOpen(false)} />}
                </div>
                <div className="relative">
                    <button onClick={() => setIsLabelPopoverOpen(prev => !prev)} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Apply label">
                        <TagIcon className="w-5 h-5" />
                    </button>
                    {isLabelPopoverOpen && <LabelManagerPopover conversationIds={conversationIds} onClose={() => setIsLabelPopoverOpen(false)} />}
                </div>
                <button onClick={bulkMarkAsRead} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Mark as read">
                    <MailIcon className="w-5 h-5" />
                </button>
                <button onClick={bulkMarkAsUnread} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Mark as unread">
                    <InboxIcon className="w-5 h-5" />
                </button>
                <button onClick={handleMarkAsSpam} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Mark as spam">
                    <ExclamationCircleIcon className="w-5 h-5" />
                </button>
                <button onClick={bulkDelete} className="p-2 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Delete">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


const EmailList: React.FC = () => {
  const { currentSelection, searchQuery, selectedConversationIds, selectAllConversations, deselectAllConversations, displayedConversations, labels, userFolders } = useAppContext();
  const isSearching = searchQuery.length > 0;
  
  const allDisplayedIds = displayedConversations.map(c => c.id);
  const areAllSelected = allDisplayedIds.length > 0 && allDisplayedIds.every(id => selectedConversationIds.has(id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      selectAllConversations(allDisplayedIds);
    } else {
      deselectAllConversations();
    }
  };
  
  const getListTitle = () => {
    if (isSearching) return `Search results for "${searchQuery}"`;
    if (currentSelection.type === 'folder') {
        return userFolders.find(f => f.id === currentSelection.id)?.name || currentSelection.id;
    }
    if (currentSelection.type === 'label') {
        return labels.find(l => l.id === currentSelection.id)?.name || currentSelection.id;
    }
    return 'Mail';
  }
  
  const listTitle = getListTitle();
  const emptyMessage = isSearching ? `No results found for "${searchQuery}".` : `No messages in "${listTitle}".`;
  
  const showBulkActions = selectedConversationIds.size > 0;

  const renderContent = () => {
    if (displayedConversations.length === 0) {
        return (
            <div className="flex-grow flex items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
              <p>{emptyMessage}</p>
            </div>
        );
    }
    return (
        <ul className="flex-grow">
          {displayedConversations.map((conv) => (
            <ConversationListItem key={conv.id} conversation={conv} />
          ))}
        </ul>
    );
  };

  return (
    <div className="flex-grow flex flex-col bg-white dark:bg-dark-surface overflow-y-auto">
        { showBulkActions ? <BulkActionBar /> : (
            <div className="p-4 border-b border-outline dark:border-dark-outline flex items-center justify-between gap-4">
                 <div className="flex items-center gap-4 flex-shrink-0">
                    <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 focus:ring-primary"
                        checked={areAllSelected}
                        onChange={handleSelectAll}
                        disabled={displayedConversations.length === 0}
                        title="Select all"
                    />
                    <h2 className="text-lg font-medium text-on-surface dark:text-dark-on-surface truncate">{listTitle}</h2>
                </div>
                <div className="flex-grow max-w-lg">
                    <SearchBar />
                </div>
            </div>
        )}
      {renderContent()}
    </div>
  );
};

export default EmailList;