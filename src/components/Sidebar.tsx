
import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { InboxIcon } from './icons/InboxIcon';
import { StarIcon } from './icons/StarIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SystemLabel, Label, SystemFolder, UserFolder } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { PlusIcon } from './icons/PlusIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { TagIcon } from './icons/TagIcon';
import LabelModal from './LabelModal';
import { FolderIcon } from './icons/FolderIcon';
import { FolderPlusIcon } from './icons/FolderPlusIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import FolderModal from './FolderModal';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';


const getSystemFolderIcon = (folderName: SystemFolder): React.ReactNode => {
    switch (folderName) {
        case SystemFolder.INBOX: return <InboxIcon className="w-5 h-5" />;
        case SystemFolder.SENT: return <PaperAirplaneIcon className="w-5 h-5" />;
        case SystemFolder.SCHEDULED: return <ClockIcon className="w-5 h-5" />;
        case SystemFolder.SPAM: return <ExclamationCircleIcon className="w-5 h-5" />;
        case SystemFolder.DRAFTS: return <DocumentIcon className="w-5 h-5" />;
        case SystemFolder.TRASH: return <TrashIcon className="w-5 h-5" />;
        case SystemFolder.ARCHIVE: return <ArchiveBoxIcon className="w-5 h-5" />;
        default: return <FolderIcon className="w-5 h-5" />;
    }
}

interface NavItemProps {
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  isSidebarCollapsed?: boolean;
  onDrop?: (e: React.DragEvent) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
  count?: number;
}

const NavItem: React.FC<NavItemProps> = ({ name, icon, isActive, onClick, isSidebarCollapsed, onDrop, onEdit, onDelete, isEditable, count = 0 }) => {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDropTarget(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if(dragCounter.current === 0) setIsDropTarget(false);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    dragCounter.current = 0;
    setIsDropTarget(false);
    if(onDrop) onDrop(e);
  };

  const justifyContent = isSidebarCollapsed ? 'justify-center' : 'justify-between';
  const baseClasses = `group relative flex items-center ${justifyContent} px-4 py-2.5 my-1 text-sm rounded-full cursor-pointer transition-all duration-200 ease-in-out`;
  const activeClasses = 'bg-primary text-white font-bold';
  const inactiveClasses = 'text-gray-700 dark:text-dark-on-surface hover:bg-gray-200 dark:hover:bg-dark-surface';
  const dropTargetClasses = isDropTarget ? 'scale-105 bg-blue-200 dark:bg-blue-800 ring-2 ring-primary shadow-lg' : '';
  
  return (
    <li
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${dropTargetClasses}`}
      onClick={onClick}
      title={isSidebarCollapsed ? name : undefined}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? '' : 'space-x-4 flex-grow'}`}>
        {icon}
        {!isSidebarCollapsed && <span className="truncate">{name}</span>}
      </div>
      {!isSidebarCollapsed && count > 0 && (
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full transition-opacity group-hover:opacity-0 ${isActive ? 'bg-white text-primary' : 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300'}`}>
              {count}
          </span>
      )}
       {isEditable && !isSidebarCollapsed && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 bg-inherit pl-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><PencilIcon className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><TrashIcon className="w-4 h-4" /></button>
        </div>
      )}
    </li>
  );
};

const SYSTEM_FOLDER_ORDER: SystemFolder[] = [
    SystemFolder.INBOX,
    SystemFolder.SENT,
    SystemFolder.DRAFTS,
    SystemFolder.SPAM,
    SystemFolder.TRASH,
    SystemFolder.SCHEDULED,
    SystemFolder.ARCHIVE,
];

const Sidebar: React.FC = () => {
  const { 
    currentSelection, setCurrentSelection, openCompose, labels, userFolders, folderTree, systemFoldersMap, isSidebarCollapsed, 
    setLabelState, moveConversations, deleteFolder, view, unreadCounts
  } = useAppContext();
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<UserFolder | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.conversationIds) {
        moveConversations(data.conversationIds, folderId);
      }
    } catch(err) {
      console.error("Failed to handle drop:", err);
    }
  };

  const handleDropOnLabel = (e: React.DragEvent, labelId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.conversationIds) {
        setLabelState(data.conversationIds, labelId, true);
      }
    } catch(err) {
      console.error("Failed to handle drop:", err);
    }
  };
  
  const handleOpenLabelModal = (label: Label | null = null) => {
    setEditingLabel(label);
    setIsLabelModalOpen(true);
  }

  const handleOpenFolderModal = (folder: UserFolder | null = null) => {
      setEditingFolder(folder);
      setIsFolderModalOpen(true);
  }

  const handleDeleteFolder = (folder: UserFolder) => {
    if (window.confirm(`Are you sure you want to delete the folder "${folder.name}"? All emails inside will be moved to Archive.`)) {
        deleteFolder(folder.id);
    }
  }

  const userCreatedFoldersTree = folderTree.filter(f => f.source === 'user' || (!f.specialUse && f.source === 'imap'));

  const toggleExpand = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) newSet.delete(folderId);
        else newSet.add(folderId);
        return newSet;
    });
  };

  const renderFolderTree = (folders: UserFolder[], level = 0): React.ReactNode => {
      return (
          <ul>
              {folders.filter(f => f.isSubscribed).map(folder => (
                  <React.Fragment key={folder.id}>
                      <NavItem
                          name={folder.name}
                          icon={
                              <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
                                  {folder.children && folder.children.length > 0 ? (
                                      <button onClick={(e) => toggleExpand(e, folder.id)} className="p-0.5 rounded-full -ml-1 mr-1 hover:bg-black/10 dark:hover:bg-white/10">
                                          {expandedFolders.has(folder.id) ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                      </button>
                                  ) : (
                                      <div className="w-5 h-5 mr-1.5" /> // Placeholder for alignment
                                  )}
                                  <FolderIcon className="w-5 h-5" />
                              </div>
                          }
                          isActive={currentSelection.type === 'folder' && currentSelection.id === folder.id && view === 'mail'}
                          onClick={() => setCurrentSelection('folder', folder.id)}
                          isSidebarCollapsed={isSidebarCollapsed}
                          onDrop={(e) => handleDropOnFolder(e, folder.id)}
                          onEdit={() => handleOpenFolderModal(folder)}
                          onDelete={() => handleDeleteFolder(folder)}
                          isEditable={folder.source === 'user'}
                          count={unreadCounts[folder.id]}
                      />
                      {expandedFolders.has(folder.id) && folder.children && (
                          <>{renderFolderTree(folder.children, level + 1)}</>
                      )}
                  </React.Fragment>
              ))}
          </ul>
      );
  };


  return (
    <aside className={`fixed top-0 pt-16 h-full flex-shrink-0 p-2 bg-surface-container dark:bg-dark-surface-container flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex-shrink-0 p-2">
        <button 
          onClick={() => openCompose()}
          className={`flex items-center w-full px-4 py-3 space-x-2 font-semibold text-gray-700 dark:text-gray-800 transition-all duration-150 bg-compose-accent rounded-2xl hover:shadow-lg justify-center`}
          title={isSidebarCollapsed ? 'Compose' : undefined}
          >
          <PencilIcon className="w-6 h-6" />
          {!isSidebarCollapsed && <span>Compose</span>}
        </button>
      </div>
      <div className="flex-grow overflow-y-auto mt-2 pr-1">
        <nav>
          <ul>
            {SYSTEM_FOLDER_ORDER.map(folderKey => {
                const folder = systemFoldersMap.get(folderKey);
                if (!folder) return null;
                return (
                     <NavItem
                        key={folder.id}
                        name={folder.name}
                        icon={getSystemFolderIcon(folderKey)}
                        isActive={currentSelection.type === 'folder' && currentSelection.id === folder.id && view === 'mail'}
                        onClick={() => setCurrentSelection('folder', folder.id)}
                        isSidebarCollapsed={isSidebarCollapsed}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                        count={unreadCounts[folder.id]}
                      />
                )
            })}
             <NavItem
                key={SystemLabel.STARRED}
                name={SystemLabel.STARRED}
                icon={<StarIcon className="w-5 h-5" />}
                isActive={currentSelection.type === 'label' && currentSelection.id === SystemLabel.STARRED && view === 'mail'}
                onClick={() => setCurrentSelection('label', SystemLabel.STARRED)}
                isSidebarCollapsed={isSidebarCollapsed}
                count={unreadCounts[SystemLabel.STARRED]}
              />
          </ul>
           <div className="mt-4 pt-4 border-t border-outline dark:border-dark-outline">
              <div className={`flex items-center justify-between px-4 mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                 <h3 className={`text-xs font-semibold uppercase text-gray-500 dark:text-gray-400`}>{isSidebarCollapsed ? "F" : "Folders"}</h3>
                 {!isSidebarCollapsed && (
                     <button onClick={() => handleOpenFolderModal(null)} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600" title="Create new folder">
                         <FolderPlusIcon className="w-4 h-4" />
                     </button>
                 )}
              </div>
              {isSidebarCollapsed ? (
                <ul>
                    {userFolders.filter(f => f.source === 'user' && f.isSubscribed).map(folder => (
                         <NavItem
                            key={folder.id}
                            name={folder.name}
                            icon={<FolderIcon className="w-5 h-5" />}
                            isActive={currentSelection.type === 'folder' && currentSelection.id === folder.id && view === 'mail'}
                            onClick={() => setCurrentSelection('folder', folder.id)}
                            isSidebarCollapsed={isSidebarCollapsed}
                            onDrop={(e) => handleDropOnFolder(e, folder.id)}
                            onEdit={() => handleOpenFolderModal(folder)}
                            onDelete={() => handleDeleteFolder(folder)}
                            isEditable={folder.source === 'user'}
                            count={unreadCounts[folder.id]}
                          />
                    ))}
                </ul>
                ) : (
                    renderFolderTree(userCreatedFoldersTree)
                )}
          </div>
          <div className="mt-4 pt-4 border-t border-outline dark:border-dark-outline">
              <div className={`flex items-center justify-between px-4 mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                 <h3 className={`text-xs font-semibold uppercase text-gray-500 dark:text-gray-400`}>{isSidebarCollapsed ? "L" : "Labels"}</h3>
                 {!isSidebarCollapsed && (
                     <button onClick={() => handleOpenLabelModal(null)} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600" title="Create new label">
                         <PlusIcon className="w-4 h-4" />
                     </button>
                 )}
              </div>
              <ul>
                {labels.map(label => (
                   <NavItem
                    key={label.id}
                    name={label.name}
                    icon={<TagIcon className="w-5 h-5" style={{color: label.color}} />}
                    isActive={currentSelection.type === 'label' && currentSelection.id === label.id && view === 'mail'}
                    onClick={() => setCurrentSelection('label', label.id)}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onDrop={(e) => handleDropOnLabel(e, label.id)}
                    onEdit={() => handleOpenLabelModal(label)}
                    onDelete={() => { /* Should be handled in settings */}}
                    isEditable
                    count={unreadCounts[label.id]}
                  />
                ))}
              </ul>
          </div>
        </nav>
      </div>
      {isFolderModalOpen && (
          <FolderModal 
              isOpen={isFolderModalOpen}
              onClose={() => setIsFolderModalOpen(false)}
              folder={editingFolder}
          />
      )}
      {isLabelModalOpen && (
          <LabelModal 
              isOpen={isLabelModalOpen}
              onClose={() => setIsLabelModalOpen(false)}
              label={editingLabel}
          />
      )}
    </aside>
  );
};

export default Sidebar;
