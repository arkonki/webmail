import React, { useState } from 'react';
import { Contact } from '../types';

interface ContactFormProps {
    initialData?: Contact | null;
    onSave: (data: Omit<Contact, 'id'>, existingId?: string) => void;
    onCancel: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ initialData, onSave, onCancel }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [company, setCompany] = useState(initialData?.company || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, email, phone, company, notes }, initialData?.id);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline animate-fade-in space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {initialData ? 'Edit Contact' : 'Create New Contact'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input id="contact-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input id="contact-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input id="contact-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary" />
                </div>
                 <div>
                    <label htmlFor="contact-company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                    <input id="contact-company" type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary" />
                </div>
            </div>
            
            <div>
                <label htmlFor="contact-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea id="contact-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary" />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-outline dark:border-dark-outline">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover">Save Changes</button>
            </div>
        </form>
    );
};

export default ContactForm;
