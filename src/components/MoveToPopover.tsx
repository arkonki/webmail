

import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { SystemFolder, UserFolder } from '../types';
import { FolderIcon } from './icons/FolderIcon';

interface MoveToPopoverProps {
  onSelectFolder: (folderId: string) => void;
  onClose: () => void;
  aclass?: string;
}

const MoveToPopover: React.FC<MoveToPopoverProps> = ({ onSelectFolder, onClose, aclass }) => {
  const { userFolders, currentSelection } = useAppContext();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const folderTree = useAppContext().folderTree;
  const currentFolderId = currentSelection.type === 'folder' ? currentSelection.id : null;
  
  const renderFolderItems = (folders: UserFolder[], level = 0) => {
      return folders.filter(folder => folder.id !== currentFolderId).map(folder => (
        <React.Fragment key={folder.id}>
          <button
            onClick={() => onSelectFolder(folder.id)}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <FolderIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{folder.name}</span>
          </button>
          {folder.children && folder.children.length > 0 && renderFolderItems(folder.children, level + 1)}
        </React.Fragment>
      ));
  };
  
  return (
    <div ref={popoverRef} className={`absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20 ${aclass}`}>
      <div className="py-1 max-h-60 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Move to</p>
        {renderFolderItems(folderTree)}
      </div>
    </div>
  );
};

export default MoveToPopover;