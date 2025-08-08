import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Contact } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import ContactListItem from './ContactListItem';
import ContactDetail from './ContactDetail';
import ContactForm from "./ContactForm";
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import ContactGroupListItem from './ContactGroupListItem';
import { UsersIcon } from './icons/UsersIcon';


const ContactsView: React.FC = () => {
    const { 
        contacts, contactGroups, setView, selectedContactId, setSelectedContactId, 
        addContact, updateContact, importContacts, selectedGroupId, setSelectedGroupId,
        createContactGroup, renameContactGroup, deleteContactGroup, addContactToGroup
    } = useAppContext();
    const { addToast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
            setIsActionsMenuOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredContacts = useMemo(() => {
        let list = contacts;
        if (selectedGroupId) {
            const group = contactGroups.find(g => g.id === selectedGroupId);
            if (group) {
                const memberIds = new Set(group.contactIds);
                list = contacts.filter(c => memberIds.has(c.id));
            }
        }
        
        return list.filter(contact => 
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, searchTerm, selectedGroupId, contactGroups]);
    
    const handleSelectContact = (id: string) => {
        setIsCreating(false);
        setSelectedContactId(id);
    };
    
    const handleSelectGroup = (id: string) => {
        setIsCreating(false);
        setSelectedContactId(null);
        setSelectedGroupId(id);
    };

    const handleSelectAllContacts = () => {
        setIsCreating(false);
        setSelectedContactId(null);
        setSelectedGroupId(null);
    }
    
    const handleAddContact = () => {
        setSelectedContactId(null);
        setSelectedGroupId(null);
        setIsCreating(true);
        setIsActionsMenuOpen(false);
    };

    const handleCancelForm = () => {
        setIsCreating(false);
        setSelectedContactId(null); 
    };
    
    const handleSaveContact = (contactData: Omit<Contact, 'id'>, existingId?: string) => {
        if(existingId) {
            const contactToUpdate = contacts.find(c => c.id === existingId);
            if(contactToUpdate) {
                updateContact({ ...contactToUpdate, ...contactData });
            }
        } else {
            addContact(contactData);
        }
        setIsCreating(false);
    }
    
    const selectedContact = useMemo(() => contacts.find(c => c.id === selectedContactId), [contacts, selectedContactId]);

    const exportVCard = (contact: Contact): string => {
        const nameParts = contact.name.split(' ');
        const lastName = nameParts.length > 1 ? nameParts.pop() : '';
        const firstName = nameParts.join(' ');

        let vCard = 'BEGIN:VCARD\r\n';
        vCard += 'VERSION:3.0\r\n';
        vCard += `N:${lastName};${firstName};;;\r\n`;
        vCard += `FN:${contact.name}\r\n`;
        if (contact.email) vCard += `EMAIL;TYPE=INTERNET:${contact.email}\r\n`;
        if (contact.phone) vCard += `TEL;TYPE=CELL:${contact.phone}\r\n`;
        if (contact.company) vCard += `ORG:${contact.company}\r\n`;
        if (contact.notes) vCard += `NOTE:${contact.notes.replace(/\n/g, '\\n')}\r\n`;
        vCard += 'END:VCARD\r\n';
        return vCard;
    };

    const handleExport = () => {
        setIsActionsMenuOpen(false);
        if (contacts.length === 0) {
            addToast('No contacts to export.');
            return;
        }
        const vCardData = contacts.map(exportVCard).join('');
        const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contacts.vcf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast(`Exported ${contacts.length} contacts.`);
    };
    
    const handleImportClick = () => {
        setIsActionsMenuOpen(false);
        importInputRef.current?.click();
    }
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                addToast('Could not read file.', { duration: 5000 });
                return;
            }

            try {
                const vcards = text.split('BEGIN:VCARD');
                const newContacts: Omit<Contact, 'id'>[] = [];

                vcards.forEach(vcardText => {
                    if (vcardText.trim() === '') return;

                    const lines = vcardText.split(/\r\n|\r|\n/);
                    const contact: Omit<Contact, 'id'> = { name: '', email: '' };
                    let nameFromN = '';

                    lines.forEach(line => {
                        if (line.startsWith('FN:')) {
                            contact.name = line.substring(3).trim();
                        } else if (line.startsWith('N:')) {
                            const parts = line.substring(2).trim().split(';');
                            nameFromN = `${parts[1] || ''} ${parts[0] || ''}`.trim();
                        } else if (line.startsWith('EMAIL')) {
                            contact.email = line.substring(line.indexOf(':') + 1).trim();
                        } else if (line.startsWith('TEL')) {
                            contact.phone = line.substring(line.indexOf(':') + 1).trim();
                        } else if (line.startsWith('ORG')) {
                            contact.company = line.substring(line.indexOf(':') + 1).trim();
                        } else if (line.startsWith('NOTE')) {
                            contact.notes = line.substring(5).trim().replace(/\\n/g, '\n');
                        }
                    });

                    if (!contact.name && nameFromN) {
                        contact.name = nameFromN;
                    }
                    
                    if (contact.name && contact.email) {
                        newContacts.push(contact);
                    }
                });
                
                if (newContacts.length > 0) {
                    importContacts(newContacts);
                } else {
                    addToast('No valid contacts found in the file.');
                }

            } catch (error) {
                console.error("Error parsing vCard file:", error);
                addToast('Failed to parse vCard file. Please check the file format.', { duration: 5000 });
            }
        };
        reader.onerror = () => addToast('Error reading file.', { duration: 5000 });
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    };
    
    const handleCreateGroupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(newGroupName.trim()) {
            createContactGroup(newGroupName.trim());
            setNewGroupName('');
            setIsCreatingGroup(false);
        }
    }
    
    const handleContactDropOnGroup = (e: React.DragEvent, groupId: string) => {
        const contactId = e.dataTransfer.getData('application/contact-id');
        if (contactId) {
            addContactToGroup(groupId, contactId);
        }
    }


    return (
        <div className="flex-grow flex flex-col bg-gray-50 dark:bg-dark-surface overflow-hidden">
            <header className="p-4 border-b border-outline dark:border-dark-outline bg-white dark:bg-dark-surface-container flex-shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-xl font-medium text-on-surface dark:text-dark-on-surface">Contacts</h1>
                    <div className="flex flex-wrap gap-2">
                         <div className="relative inline-flex" ref={actionsMenuRef}>
                            <button onClick={handleAddContact} className="flex items-center gap-2 pl-4 pr-3 py-2 text-sm font-medium text-white bg-primary rounded-l-md hover:bg-primary-hover">
                                <PlusCircleIcon className="w-5 h-5"/>
                                <span>Create contact</span>
                            </button>
                            <button onClick={() => setIsActionsMenuOpen(p => !p)} className="px-2 py-2 text-sm font-medium text-white bg-primary rounded-r-md hover:bg-primary-hover border-l border-blue-400 dark:border-blue-700">
                                <ChevronDownIcon className="w-5 h-5"/>
                            </button>
                             <div className={`absolute right-0 top-full mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-20 transition-all duration-150 ${isActionsMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                                <div className="py-1">
                                    <button onClick={() => { setIsCreatingGroup(true); setIsActionsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <UsersIcon className="w-5 h-5" /> Create group
                                    </button>
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                    <button onClick={handleImportClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <ArrowUpTrayIcon className="w-5 h-5" /> Import contacts
                                    </button>
                                     <button onClick={handleExport} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <ArrowDownTrayIcon className="w-5 h-5" /> Export contacts
                                    </button>
                                </div>
                            </div>
                         </div>
                        <input ref={importInputRef} type="file" className="hidden" accept=".vcf,.vcard" onChange={handleImport} />
                    </div>
                </div>
            </header>
            <div className="flex flex-grow overflow-hidden">
                {/* Left Pane: Contact List */}
                <div className="w-1/3 border-r border-outline dark:border-dark-outline flex flex-col overflow-y-auto">
                    <div className="p-4 border-b border-outline dark:border-dark-outline sticky top-0 bg-white dark:bg-dark-surface-container z-10">
                         <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <input 
                                type="search"
                                placeholder="Search contacts"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full p-2 pl-10 text-sm text-gray-900 bg-gray-100 border border-transparent rounded-full dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 focus:ring-primary focus:border-primary focus:bg-white dark:focus:bg-gray-800"
                            />
                        </div>
                    </div>
                    <ul className="flex-grow p-2">
                        <li
                            onClick={handleSelectAllContacts}
                            className={`flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg mb-1 ${!selectedGroupId && !selectedContactId && !isCreating ? 'bg-primary/10 dark:bg-primary/20 text-primary font-semibold' : 'hover:bg-gray-100 dark:hover:bg-dark-surface-container'}`}
                        >
                            <UserCircleIcon className="w-6 h-6" /> All Contacts ({contacts.length})
                        </li>
                        
                        <div className="mt-4 pt-2 border-t border-outline dark:border-dark-outline">
                            <h3 className="px-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Groups</h3>
                            {contactGroups.map(group => (
                                <ContactGroupListItem 
                                    key={group.id}
                                    group={group}
                                    isSelected={group.id === selectedGroupId}
                                    onSelect={() => handleSelectGroup(group.id)}
                                    onRename={(newName) => renameContactGroup(group.id, newName)}
                                    onDelete={() => deleteContactGroup(group.id)}
                                    onDrop={(e) => handleContactDropOnGroup(e, group.id)}
                                />
                            ))}
                            {isCreatingGroup && (
                                <li className="px-2 py-1">
                                    <form onSubmit={handleCreateGroupSubmit}>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="New group name"
                                            autoFocus
                                            onBlur={() => {setIsCreatingGroup(false); setNewGroupName('');}}
                                            className="w-full text-sm bg-transparent border-b border-primary focus:outline-none py-1 px-2 rounded-t-md"
                                        />
                                    </form>
                                </li>
                            )}
                        </div>

                        <div className="mt-4 pt-2 border-t border-outline dark:border-dark-outline">
                             <h3 className="px-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                                {selectedGroupId ? contactGroups.find(g => g.id === selectedGroupId)?.name : "All Contacts"}
                            </h3>
                            {filteredContacts.map(contact => (
                                <ContactListItem 
                                    key={contact.id}
                                    contact={contact}
                                    isSelected={contact.id === selectedContactId}
                                    onSelect={() => handleSelectContact(contact.id)}
                                />
                            ))}
                            {filteredContacts.length === 0 && <p className="p-8 text-center text-gray-500 dark:text-gray-400">No contacts found.</p>}
                        </div>
                    </ul>
                </div>

                {/* Right Pane: Detail View or Form */}
                <div className="w-2/3 overflow-y-auto p-8">
                    {isCreating ? (
                         <ContactForm onSave={handleSaveContact} onCancel={handleCancelForm} />
                    ) : selectedContact ? (
                         <ContactDetail contact={selectedContact} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                           <UserCircleIcon className="w-24 h-24 text-gray-300 dark:text-gray-600"/>
                           <p className="mt-4 text-lg">Select a contact to see details</p>
                           <p>Or <button onClick={handleAddContact} className="text-primary hover:underline">create a new contact</button>.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactsView;
