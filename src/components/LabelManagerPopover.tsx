import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { PlusIcon } from './icons/PlusIcon';

interface LabelManagerPopoverProps {
  conversationIds: string[];
  onClose: () => void;
}

const LabelManagerPopover: React.FC<LabelManagerPopoverProps> = ({ conversationIds, onClose }) => {
  const { labels, conversations, toggleLabel, createLabel } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
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

  const activeLabels = useMemo(() => {
    if (!conversationIds.length) return new Set<string>();
    const firstConv = conversations.find(c => c.id === conversationIds[0]);
    if (!firstConv) return new Set<string>();

    return new Set(
        firstConv.labelIds.filter(labelId => 
            conversationIds.slice(1).every(convId => {
                const conv = conversations.find(c => c.id === convId);
                return conv?.labelIds.includes(labelId);
            })
        )
    );
  }, [conversationIds, conversations]);

  const handleToggleLabel = (labelId: string) => {
    toggleLabel(conversationIds, labelId);
  };
  
  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if(newLabelName.trim()) {
        createLabel(newLabelName, '#7f8c8d'); // Default color
        setNewLabelName('');
        setIsCreating(false);
    }
  }

  const filteredLabels = labels.filter(label => label.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div ref={popoverRef} className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20">
      <div className="p-2 border-b border-outline dark:border-dark-outline">
        <input
          type="text"
          placeholder="Filter labels"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md border-transparent focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="py-1 max-h-48 overflow-y-auto">
        {filteredLabels.map(label => {
            const isChecked = activeLabels.has(label.id);
            return (
                <label key={label.id} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleLabel(label.id)}
                        className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                    />
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: label.color}}></div>
                    <span className="truncate">{label.name}</span>
                </label>
            );
        })}
      </div>
      <div className="p-2 border-t border-outline dark:border-dark-outline">
        {isCreating ? (
            <form onSubmit={handleCreateLabel} className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="New label name"
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    autoFocus
                    className="flex-grow w-full p-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md border-transparent focus:ring-primary focus:border-primary"
                />
                <button type="submit" className="p-1 rounded-full text-primary hover:bg-gray-200 dark:hover:bg-gray-700"><PlusIcon className="w-5 h-5"/></button>
            </form>
        ) : (
            <button onClick={() => setIsCreating(true)} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                <PlusIcon className="w-4 h-4"/> Create new
            </button>
        )}
      </div>
    </div>
  );
};

export default LabelManagerPopover;
