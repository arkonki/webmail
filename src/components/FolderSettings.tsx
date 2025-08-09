
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { UserFolder } from '../types';
import FolderModal from './FolderModal';
import { ArrowsClockwiseIcon } from './icons/ArrowsClockwiseIcon';
import { useTranslation } from 'react-i18next';

const FolderSettings: React.FC = () => {
    const { userFolders, deleteFolder, syncFolders, updateFolderSubscription } = useAppContext();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<UserFolder | null>(null);

    const handleOpenModal = (folder: UserFolder | null) => {
        setEditingFolder(folder);
        setIsModalOpen(true);
    };

    const handleDelete = (folder: UserFolder) => {
        if (window.confirm(t('sidebar.confirmDeleteFolder', { folderName: folder.name }))) {
            deleteFolder(folder.id);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-on-surface dark:text-dark-on-surface">{t('folderSettings.title')}</h2>
                <div className="flex gap-2">
                    <button onClick={syncFolders} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-outline dark:border-dark-outline">
                        <ArrowsClockwiseIcon className="w-5 h-5"/> {t('folderSettings.sync')}
                    </button>
                    <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                        <PlusCircleIcon className="w-5 h-5"/> {t('folderSettings.create')}
                    </button>
                </div>
            </div>
            <div className="space-y-2">
                {userFolders.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('folderSettings.noFolders')}</p>
                ) : (
                    userFolders.map(folder => (
                        <div key={folder.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-lg border border-outline dark:border-dark-outline">
                           <div className="flex items-center gap-3">
                                <p className="text-sm text-on-surface dark:text-dark-on-surface">{folder.name}</p>
                                {folder.source === 'imap' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{t('folderSettings.imapTag')}</span>}
                            </div>
                            <div className="flex items-center gap-4">
                               <label className="flex items-center cursor-pointer">
                                  <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={folder.isSubscribed} onChange={(e) => updateFolderSubscription(folder.id, e.target.checked)} />
                                    <div className="block bg-gray-300 dark:bg-gray-600 w-10 h-6 rounded-full"></div>
                                    <div className={`dot absolute left-1 top-1 bg-white dark:bg-gray-400 w-4 h-4 rounded-full transition-transform ${folder.isSubscribed ? 'translate-x-full bg-primary dark:bg-blue-300' : ''}`}></div>
                                  </div>
                                  <div className="ml-3 text-sm text-gray-700 dark:text-gray-300">{t('folderSettings.subscribed')}</div>
                                </label>
                                <button onClick={() => handleOpenModal(folder)} disabled={folder.source === 'imap'} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDelete(folder)} disabled={folder.source === 'imap'} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <style>{`
                input:checked ~ .dot {
                  transform: translateX(100%);
                }
                 input:checked ~ .block {
                  background-color: #A8C7FA; /* A lighter blue for the track */
                }
            `}</style>
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