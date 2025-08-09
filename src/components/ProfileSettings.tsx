
import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';
import { PhotoIcon } from './icons/PhotoIcon';

const ProfileSettings: React.FC = () => {
    const { user, appSettings, updateProfile } = useAppContext();
    const { addToast } = useToast();
    const [displayName, setDisplayName] = useState(appSettings.displayName || user?.name || '');
    const [profilePicture, setProfilePicture] = useState<string | null>(appSettings.profilePicture || user?.profilePicture || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                addToast("Image size should be less than 2MB.", { duration: 4000 });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        updateProfile({
            displayName,
            profilePicture: profilePicture || undefined,
        });
    };
    
    return (
        <div>
            <h2 className="text-xl font-semibold mb-6 text-on-surface dark:text-dark-on-surface">Profile Settings</h2>
            <div className="space-y-8 max-w-lg">
                <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 flex-shrink-0">
                        {profilePicture ? (
                            <img src={profilePicture} alt="Profile preview" className="w-24 h-24 rounded-full object-cover" />
                        ) : (
                            <Avatar name={displayName || user?.email || ''} className="w-24 h-24 text-4xl" />
                        )}
                    </div>
                    <div>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-medium rounded-md border border-outline dark:border-dark-outline hover:bg-gray-50 dark:hover:bg-gray-800">
                           Change Photo
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handlePictureUpload} accept="image/png, image/jpeg" className="hidden" />
                        <p className="text-xs text-gray-500 mt-2">PNG or JPG, up to 2MB.</p>
                    </div>
                </div>

                <div>
                    <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                    <input id="display-name" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary" placeholder="e.g., John Doe"/>
                    <p className="text-xs text-gray-500 mt-1">This is the name recipients will see when you send an email.</p>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
