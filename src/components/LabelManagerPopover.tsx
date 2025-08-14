
import React, { useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Label } from '../types';

interface LabelManagerPopoverProps {
  conversationIds: string[];
  onClose: () => void;
}

const LabelManagerPopover: React.FC<LabelManagerPopoverProps> = ({ conversationIds, onClose }) => {
    const { labels, conversations, setLabelState } = useAppContext();
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

    return (
        <div ref={popoverRef} className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20">
            <div className="py-1 max-h-60 overflow-y-auto">
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Apply label</p>
                {labels.map(label => {
                    const isLabelApplied = conversationIds.every(convId => {
                        const conv = conversations.find(c => c.id === convId);
                        return conv?.labelIds.includes(label.id);
                    });

                    const handleToggle = () => {
                        setLabelState(conversationIds, label.id, !isLabelApplied);
                    };

                    return (
                        <div key={label.id} className="flex items-center px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <input
                                type="checkbox"
                                id={`label-checkbox-${label.id}`}
                                checked={isLabelApplied}
                                onChange={handleToggle}
                                className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 focus:ring-primary"
                            />
                            <label htmlFor={`label-checkbox-${label.id}`} className="ml-3 flex items-center cursor-pointer">
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: label.color }}></span>
                                {label.name}
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LabelManagerPopover;
