import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { UserFolder } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: UserFolder | null;
}

const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, folder }) => {
    const { createFolder, updateFolder } = useAppContext();
    const [name, setName] = useState('');

    useEffect(() => {
        if (folder) {
            setName(folder.name);
        } else {
            setName('');
        }
    }, [folder, isOpen]);

    useEffect(() => {
        const rootEl = document.getElementById('root');
        if (isOpen) {
            rootEl?.setAttribute('inert', '');
        }
        return () => {
            rootEl?.removeAttribute('inert');
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        if (folder) {
            updateFolder(folder.id, name.trim());
        } else {
            createFolder(name.trim());
        }
        onClose();
    };
    
    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface-container rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">{folder ? 'Edit' : 'Create'} Folder</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Folder name</label>
                        <input
                            id="folder-name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-outline dark:border-dark-outline">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );

    const portalNode = document.getElementById('modal-portal');
    return portalNode ? ReactDOM.createPortal(modalContent, portalNode) : modalContent;
};

export default FolderModal;