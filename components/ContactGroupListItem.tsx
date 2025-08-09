
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
  const [editingName, setEditingName] = useState(group.name);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragCounter = useRef(0);

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
    if (dragCounter.current === 0) setIsDropTarget(false);
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

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editingName.trim()) onRename(editingName.trim());
    setIsEditing(false);
  };

  const baseClasses = `group relative flex items-center justify-between px-4 py-3 my-1 text-sm rounded-lg cursor-pointer transition-all duration-200 ease-in-out`;
  const activeClasses = 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold';
  const inactiveClasses = 'text-gray-700 dark:text-dark-on-surface hover:bg-gray-100 dark:hover:bg-dark-surface';
  const dropTargetClasses = isDropTarget ? 'scale-105 bg-blue-200 dark:bg-blue-800 ring-2 ring-primary shadow-lg' : '';

  if (isEditing) {
    return (
      <li className={`${baseClasses} ${inactiveClasses}`}>
        <form onSubmit={handleRenameSubmit} className="flex items-center w-full">
          <UsersIcon className="w-6 h-6 mr-4" />
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="w-full bg-transparent focus:outline-none"
          />
        </form>
      </li>
    );
  }

  return (
    <li
      className={`${baseClasses} ${isSelected ? activeClasses : inactiveClasses} ${dropTargetClasses}`}
      onClick={onSelect}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center min-w-0 flex-grow">
        <UsersIcon className="w-6 h-6 mr-4 flex-shrink-0" />
        <span className="truncate">{group.name}</span>
        <span className="ml-2 text-xs text-gray-500">({group.contactIds.length})</span>
      </div>
      <div className="flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0">
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
          <PencilIcon className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
};

export default ContactGroupListItem;
