import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { Label } from '../types';

interface LabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: Label | null;
}

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#7f8c8d'];

const LabelModal: React.FC<LabelModalProps> = ({ isOpen, onClose, label }) => {
    const { createLabel, updateLabel } = useAppContext();
    const [name, setName] = useState(label?.name || '');
    const [color, setColor] = useState(label?.color || COLORS[0]);

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
        
        if (label) {
            updateLabel(label.id, { name, color });
        } else {
            createLabel(name, color);
        }
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface-container rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">{label ? 'Edit' : 'Create'} Label</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="label-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label name</label>
                        <input
                            id="label-name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(c => (
                                <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform duration-150 ${color === c ? 'ring-2 ring-primary ring-offset-2' : ''}`} style={{ backgroundColor: c }}></button>
                            ))}
                        </div>
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

export default LabelModal;
