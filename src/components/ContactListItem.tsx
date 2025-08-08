import React from 'react';
import { Contact } from '../types';
import Avatar from './Avatar';

interface ContactListItemProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
}

const ContactListItem: React.FC<ContactListItemProps> = ({ contact, isSelected, onSelect }) => {
  
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/contact-id', contact.id);
  };
  
  return (
    <li
      onClick={onSelect}
      draggable="true"
      onDragStart={handleDragStart}
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer border-b border-outline dark:border-dark-outline transition-colors duration-150 ${
        isSelected
          ? 'bg-primary/10 dark:bg-primary/20'
          : 'hover:bg-gray-100 dark:hover:bg-dark-surface-container'
      }`}
    >
      <Avatar name={contact.name} />
      <div className="truncate">
        <p className={`font-semibold text-on-surface dark:text-dark-on-surface ${isSelected ? 'text-primary' : ''}`}>
          {contact.name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{contact.email}</p>
      </div>
    </li>
  );
};

export default ContactListItem;
