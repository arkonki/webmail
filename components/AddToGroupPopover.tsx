
import React, { useEffect, useRef } from 'react';
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

  const handleGroupToggle = (groupId: string, isMember: boolean) => {
    if (isMember) {
      removeContactFromGroup(groupId, contactId);
    } else {
      addContactToGroup(groupId, contactId);
    }
  };

  return (
    <div ref={popoverRef} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-30">
      <div className="py-1">
        <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Add to group</p>
        <div className="max-h-60 overflow-y-auto">
            {contactGroups.length > 0 ? contactGroups.map(group => {
                const isMember = group.contactIds.includes(contactId);
                return (
                    <label key={group.id} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isMember}
                            onChange={() => handleGroupToggle(group.id, isMember)}
                            className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                        />
                        <span className="truncate">{group.name}</span>
                    </label>
                )
            }) : (
                 <p className="px-4 py-2 text-sm text-gray-500">No groups created yet.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default AddToGroupPopover;
