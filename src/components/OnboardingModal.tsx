
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { MailIcon } from './icons/MailIcon';
import { UserIcon } from './icons/UserIcon';
import { BuildingOffice2Icon } from './icons/BuildingOffice2Icon';
import Avatar from './Avatar';
import { SpinnerIcon } from './icons/SpinnerIcon';

const OnboardingModal: React.FC = () => {
    const { user, appSettings, completeOnboarding } = useAppContext();
    const [displayName, setDisplayName] = useState(appSettings.displayName || '');
    const [userType, setUserType] = useState<'person' | 'company'>('person');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await completeOnboarding({
            displayName,
            profilePicture: profilePicture || undefined,
            userType,
            firstName: userType === 'person' ? firstName : undefined,
            lastName: userType === 'person' ? lastName : undefined,
            companyName: userType === 'company' ? companyName : undefined,
            jobTitle: userType === 'company' ? jobTitle : undefined,
        });
        // The modal will be unmounted by the parent component, so no need to setIsSubmitting(false)
    };

    const modalContent = (
         <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-surface-container rounded-lg shadow-xl w-full max-w-lg animate-fade-in">
                <div className="p-6 text-center border-b border-outline dark:border-dark-outline">
                    <MailIcon className="w-12 h-12 mx-auto text-primary"/>
                    <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-gray-100">Welcome to Webmail!</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Let's set up your profile to personalize your experience.</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex flex-col items-center space-y-3">
                         <div className="relative w-24 h-24">
                            {profilePicture ? (
                                <img src={profilePicture} alt="Profile preview" className="w-24 h-24 rounded-full object-cover" />
                            ) : (
                                <Avatar name={displayName || user?.email || ''} className="w-24 h-24 text-4xl" />
                            )}
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                                <UserIcon className="w-4 h-4" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handlePictureUpload} accept="image/png, image/jpeg" className="hidden" />
                        </div>
                        <p className="text-xs text-gray-500">Upload a profile picture (optional)</p>
                    </div>

                    <div>
                        <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                        <input id="display-name" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary" placeholder="e.g., John Doe"/>
                        <p className="text-xs text-gray-500 mt-1">This is the name that will appear on emails you send.</p>
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">This account represents a...</span>
                        <div className="flex rounded-md shadow-sm">
                            <button type="button" onClick={() => setUserType('person')} className={`relative inline-flex items-center justify-center gap-2 w-1/2 px-4 py-2 text-sm font-medium rounded-l-md border focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary ${userType === 'person' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-dark-surface border-gray-300 dark:border-dark-outline hover:bg-gray-50'}`}>
                                <UserIcon className="w-5 h-5"/> Person
                            </button>
                            <button type="button" onClick={() => setUserType('company')} className={`relative -ml-px inline-flex items-center justify-center gap-2 w-1/2 px-4 py-2 text-sm font-medium rounded-r-md border focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary ${userType === 'company' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-dark-surface border-gray-300 dark:border-dark-outline hover:bg-gray-50'}`}>
                                <BuildingOffice2Icon className="w-5 h-5"/> Company
                            </button>
                        </div>
                    </div>
                    
                    {userType === 'person' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label htmlFor="first-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label><input id="first-name" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline" /></div>
                            <div><label htmlFor="last-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label><input id="last-name" type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline" /></div>
                        </div>
                    ) : (
                         <div className="grid grid-cols-2 gap-4">
                            <div><label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label><input id="company-name" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline" /></div>
                            <div><label htmlFor="job-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label><input id="job-title" type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline" /></div>
                        </div>
                    )}

                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitting || !displayName} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
                             {isSubmitting ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : "Save and Get Started"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
    
    const portalNode = document.getElementById('modal-portal');
    return portalNode ? ReactDOM.createPortal(modalContent, portalNode) : modalContent;
};

export default OnboardingModal;
