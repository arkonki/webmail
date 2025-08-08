import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Contact } from '../types';
import Avatar from './Avatar';
import { PhoneIcon } from './icons/PhoneIcon';
import { MailIcon } from './icons/MailIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import ContactForm from './ContactForm';
import AddToGroupPopover from './AddToGroupPopover';
import { UsersIcon } from './icons/UsersIcon';

interface ContactDetailProps {
  contact: Contact;
}

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; isLink?: boolean, href?: string }> = ({ icon, label, value, isLink, href }) => {
    if (!value) return null;
    const content = (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-6 h-6 pt-1 text-gray-500 dark:text-gray-400">{icon}</div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-on-surface dark:text-dark-on-surface">{value}</p>
            </div>
        </div>
    );
    return isLink ? <a href={href}>{content}</a> : content;
}

const ContactDetail: React.FC<ContactDetailProps> = ({ contact }) => {
  const { deleteContact, openCompose, updateContact, contactGroups } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isGroupPopoverOpen, setIsGroupPopoverOpen] = useState(false);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${contact.name}?`)) {
      deleteContact(contact.id);
    }
  };

  const handleSendEmail = () => {
    openCompose({ recipient: contact.email });
  };
  
  const handleSaveEdit = (contactData: Omit<Contact, 'id'>) => {
      updateContact({ ...contact, ...contactData });
      setIsEditing(false);
  }

  if (isEditing) {
      return <ContactForm initialData={contact} onSave={(data) => handleSaveEdit(data)} onCancel={() => setIsEditing(false)} />;
  }
  
  const contactMemberOfGroups = contactGroups.filter(g => g.contactIds.includes(contact.id));

  return (
    <div className="animate-fade-in">
        <div className="flex items-center justify-between pb-8 border-b border-outline dark:border-dark-outline mb-8">
            <div className="flex items-center gap-6">
                <Avatar name={contact.name} className="w-24 h-24 text-4xl" />
                <div>
                    <h2 className="text-3xl font-bold text-on-surface dark:text-dark-on-surface">{contact.name}</h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400">{contact.company || 'No company'}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit contact">
                    <PencilIcon className="w-6 h-6"/>
                </button>
                <button onClick={handleDelete} className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete contact">
                    <TrashIcon className="w-6 h-6"/>
                </button>
            </div>
        </div>

        <div className="space-y-6">
            <div className="p-4 bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline">
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="space-y-4">
                    <DetailRow icon={<MailIcon/>} label="Email" value={contact.email} isLink href={`mailto:${contact.email}`} />
                    <DetailRow icon={<PhoneIcon/>} label="Phone" value={contact.phone} isLink href={`tel:${contact.phone}`} />
                    <DetailRow icon={<BuildingOfficeIcon/>} label="Company" value={contact.company} />
                </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Groups</h3>
                    <div className="relative">
                        <button onClick={() => setIsGroupPopoverOpen(true)} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 border-outline dark:border-dark-outline">Manage</button>
                        {isGroupPopoverOpen && <AddToGroupPopover contactId={contact.id} onClose={() => setIsGroupPopoverOpen(false)} />}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                     {contactMemberOfGroups.length > 0 ? (
                        contactMemberOfGroups.map(group => (
                            <div key={group.id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-full px-3 py-1">
                                <UsersIcon className="w-4 h-4"/>
                                <span>{group.name}</span>
                            </div>
                        ))
                     ) : (
                         <p className="text-sm text-gray-400 italic">Not a member of any groups.</p>
                     )}
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline">
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                 <div className="space-y-4">
                    <DetailRow icon={<PencilSquareIcon />} label="" value={contact.notes || <span className="text-gray-400 italic">No notes for this contact.</span>} />
                </div>
            </div>
             <div className="flex justify-start pt-4">
                <button onClick={handleSendEmail} className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                    <MailIcon className="w-5 h-5"/>
                    <span>Send Email</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default ContactDetail;
