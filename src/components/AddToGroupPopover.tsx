import React, { useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

interface AddToGroupPopoverProps {
  contactId: string;
  onClose: () => void;
}

const AddToGroupPopover: React.FC<AddToGroupPopoverProps> = ({ contactId, onClose }) => {
    const { contactGroups, addContactToGroup, removeContactFromGroup } = useAppContext();
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

    const contactGroupIds = useMemo(() => {
        return new Set(contactGroups.filter(g => g.contactIds.includes(contactId)).map(g => g.id));
    }, [contactGroups, contactId]);

    const handleToggleGroup = (groupId: string, isMember: boolean) => {
        if (isMember) {
            removeContactFromGroup(groupId, contactId);
        } else {
            addContactToGroup(groupId, contactId);
        }
    };

    return (
        <div ref={popoverRef} className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20">
            <div className="py-1 max-h-60 overflow-y-auto">
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Add to group</p>
                {contactGroups.length > 0 ? contactGroups.map(group => {
                    const isMember = contactGroupIds.has(group.id);
                    return (
                        <div key={group.id} className="flex items-center px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <input
                                type="checkbox"
                                id={`group-checkbox-${group.id}`}
                                checked={isMember}
                                onChange={() => handleToggleGroup(group.id, isMember)}
                                className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 focus:ring-primary"
                            />
                            <label htmlFor={`group-checkbox-${group.id}`} className="ml-3 flex items-center cursor-pointer">
                                {group.name}
                            </label>
                        </div>
                    );
                }) : (
                    <p className="px-3 py-2 text-sm text-gray-500">No groups created yet.</p>
                )}
            </div>
        </div>
    );
};

export default AddToGroupPopover;
