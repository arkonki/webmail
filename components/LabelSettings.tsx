import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import LabelModal from './LabelModal';
import { Label } from '../types';

const LabelSettings: React.FC = () => {
    const { labels, deleteLabel } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);

    const handleOpenModal = (label: Label | null) => {
        setEditingLabel(label);
        setIsModalOpen(true);
    };

    const handleDelete = (label: Label) => {
        if (window.confirm(`Are you sure you want to delete the label "${label.name}"? This will remove it from all conversations.`)) {
            deleteLabel(label.id);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-on-surface dark:text-dark-on-surface">Labels</h2>
                <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                    <PlusCircleIcon className="w-5 h-5"/> Create new label
                </button>
            </div>
            <div className="space-y-2">
                {labels.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No custom labels have been created.</p>
                ) : (
                    labels.map(label => (
                        <div key={label.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-lg border border-outline dark:border-dark-outline">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }}></div>
                                <p className="text-sm text-on-surface dark:text-dark-on-surface">{label.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenModal(label)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDelete(label)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {isModalOpen && (
                <LabelModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    label={editingLabel}
                />
            )}
        </div>
    );
};

export default LabelSettings;
