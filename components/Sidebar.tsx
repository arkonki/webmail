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


const getSystemFolderIcon = (folderName: string): React.ReactNode => {
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
}

const NavItem: React.FC<NavItemProps> = ({ name, icon, isActive, onClick, isSidebarCollapsed, onDrop, onEdit, onDelete, isEditable }) => {
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
       {isEditable && !isSidebarCollapsed && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 bg-inherit pl-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><PencilIcon className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><TrashIcon className="w-4 h-4" /></button>
        </div>
      )}
    </li>
  );
};


const Sidebar: React.FC = () => {
  const { 
    currentSelection, setCurrentSelection, openCompose, labels, userFolders, isSidebarCollapsed, 
    toggleLabel, moveConversations, deleteFolder, view 
  } = useAppContext();
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<UserFolder | null>(null);

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
        toggleLabel(data.conversationIds, labelId);
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

  const systemFolders = Object.values(SystemFolder);

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
            {systemFolders.map((folder) => (
              <NavItem
                key={folder}
                name={folder}
                icon={getSystemFolderIcon(folder)}
                isActive={currentSelection.type === 'folder' && currentSelection.id === folder && view === 'mail'}
                onClick={() => setCurrentSelection('folder', folder)}
                isSidebarCollapsed={isSidebarCollapsed}
                onDrop={(e) => handleDropOnFolder(e, folder)}
              />
            ))}
             <NavItem
                key={SystemLabel.STARRED}
                name={SystemLabel.STARRED}
                icon={<StarIcon className="w-5 h-5" />}
                isActive={currentSelection.type === 'label' && currentSelection.id === SystemLabel.STARRED && view === 'mail'}
                onClick={() => setCurrentSelection('label', SystemLabel.STARRED)}
                isSidebarCollapsed={isSidebarCollapsed}
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
              <ul>
                {userFolders.map(folder => (
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
                    isEditable
                  />
                ))}
              </ul>
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