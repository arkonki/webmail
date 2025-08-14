

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { UserFolder } from '../types';
import { useTranslation } from 'react-i18next';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: UserFolder | null;
}

const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, folder }) => {
  const { createFolder, updateFolder, folderTree } = useAppContext();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setParentId(folder.parentId);
    } else {
      setName('');
      setParentId(null);
    }
  }, [folder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (folder) {
      updateFolder(folder.id, name);
    } else {
      createFolder(name, parentId);
    }
    onClose();
  };

  if (!isOpen) return null;
  
  const renderFolderOptions = (folders: UserFolder[], level = 0, disabledIds: Set<string> = new Set()): React.ReactNode[] => {
    return folders.flatMap(f => {
      const newDisabledIds = new Set(disabledIds);
      if (folder && (f.id === folder.id || newDisabledIds.has(f.id))) {
          newDisabledIds.add(f.id);
          if (f.children) {
              f.children.forEach(c => newDisabledIds.add(c.id));
          }
      }

      return [
        <option key={f.id} value={f.id} disabled={newDisabledIds.has(f.id)}>
          {'\u00A0'.repeat(level * 4)}
          {f.name}
        </option>,
        ...(f.children ? renderFolderOptions(f.children, level + 1, newDisabledIds) : [])
      ]
    });
  };

  const modalContent = (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-dark-surface-container rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">{folder ? t('folderModal.editTitle') : t('folderModal.createTitle')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('folderModal.name')}</label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="parent-folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('folderModal.parent')}</label>
            <select
              id="parent-folder"
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline focus:ring-primary focus:border-primary"
            >
              <option value="">{t('folderModal.noParent')}</option>
              {renderFolderOptions(folderTree, 0, folder ? new Set([folder.id]) : new Set())}
            </select>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-outline dark:border-dark-outline">{t('folderModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">{t('folderModal.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
  
  const portalNode = document.getElementById('modal-portal');
  return portalNode ? ReactDOM.createPortal(modalContent, portalNode) : modalContent;
};

export default FolderModal;