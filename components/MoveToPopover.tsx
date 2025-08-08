
import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { SystemFolder } from '../types';

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

  const allFolders = [
      ...Object.values(SystemFolder).filter(f => ![SystemFolder.SPAM, SystemFolder.TRASH].includes(f)), 
      ...userFolders.map(f => f.id)
  ];
  const currentFolderId = currentSelection.type === 'folder' ? currentSelection.id : null;
  const validFolders = allFolders.filter(f => f !== currentFolderId);
  
  const getFolderName = (folderId: string) => {
      return userFolders.find(f => f.id === folderId)?.name || folderId;
  }

  return (
    <div ref={popoverRef} className={`absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20 ${aclass}`}>
      <div className="py-1 max-h-60 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Move to</p>
        {validFolders.map(folderId => (
          <button
            key={folderId}
            onClick={() => onSelectFolder(folderId)}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {getFolderName(folderId)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MoveToPopover;
