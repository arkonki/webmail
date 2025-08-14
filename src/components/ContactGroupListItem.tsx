import React, { useState, useRef } from 'react';
import { ContactGroup } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ContactGroupListItemProps {
  group: ContactGroup;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onDrop: (e: React.DragEvent) => void;
}

const ContactGroupListItem: React.FC<ContactGroupListItemProps> = ({ group, isSelected, onSelect, onRename, onDelete, onDrop }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(group.name);
    const [isDropTarget, setIsDropTarget] = useState(false);
    const dragCounter = useRef(0);

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (name.trim() && name.trim() !== group.name) {
            onRename(name.trim());
        }
        setIsEditing(false);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };
    
    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      setIsDropTarget(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if(dragCounter.current === 0) setIsDropTarget(false);
    };
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDropTarget(false);
      onDrop(e);
    };

    const className = `group relative flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg transition-all duration-150 ${
        isSelected
          ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold'
          : 'hover:bg-gray-100 dark:hover:bg-dark-surface-container'
    } ${isDropTarget ? 'scale-105 bg-blue-200 dark:bg-blue-800 ring-2 ring-primary shadow-lg' : ''}`;

    return (
        <li 
            onClick={() => !isEditing && onSelect()} 
            className={className}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <UsersIcon className="w-5 h-5 flex-shrink-0" />
            {isEditing ? (
                <form onSubmit={handleRenameSubmit} className="flex-grow">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleRenameSubmit}
                        autoFocus
                        className="w-full text-sm bg-transparent border-b border-primary focus:outline-none py-1"
                    />
                </form>
            ) : (
                <div className="flex-grow truncate flex justify-between items-center">
                    <span>{group.name}</span>
                    <span className="text-xs text-gray-500">{group.contactIds.length}</span>
                </div>
            )}

            {!isEditing && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 bg-inherit pl-2">
                    <button onClick={handleEditClick} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={handleDeleteClick} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><TrashIcon className="w-4 h-4" /></button>
                </div>
            )}
        </li>
    );
};

export default ContactGroupListItem;
