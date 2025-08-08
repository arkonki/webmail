
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { UserFolder } from '../types';
import FolderModal from './FolderModal';

const FolderSettings: React.FC = () => {
    const { userFolders, deleteFolder } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<UserFolder | null>(null);

    const handleOpenModal = (folder: UserFolder | null) => {
        setEditingFolder(folder);
        setIsModalOpen(true);
    };

    const handleDelete = (folder: UserFolder) => {
        if (window.confirm(`Are you sure you want to delete the folder "${folder.name}"? All emails inside will be moved to Archive.`)) {
            deleteFolder(folder.id);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-on-surface dark:text-dark-on-surface">Folders</h2>
                <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                    <PlusCircleIcon className="w-5 h-5"/> Create new folder
                </button>
            </div>
            <div className="space-y-2">
                {userFolders.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No custom folders have been created.</p>
                ) : (
                    userFolders.map(folder => (
                        <div key={folder.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-lg border border-outline dark:border-dark-outline">
                            <p className="text-sm text-on-surface dark:text-dark-on-surface">{folder.name}</p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenModal(folder)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDelete(folder)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {isModalOpen && (
                <FolderModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    folder={editingFolder}
                />
            )}
        </div>
    );
};

export default FolderSettings;
