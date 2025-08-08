import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { Rule, SystemFolder } from '../types';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

type ConditionField = Rule['condition']['field'];
type ActionType = Rule['action']['type'];

const Pill: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${className}`}>
        {children}
    </div>
);

const RulesSettings: React.FC = () => {
    const { appSettings, labels, userFolders, addRule, deleteRule } = useAppContext();
    const [conditionField, setConditionField] = useState<ConditionField>('sender');
    const [conditionValue, setConditionValue] = useState('');
    const [actionType, setActionType] = useState<ActionType>('applyLabel');
    const [actionLabelId, setActionLabelId] = useState(labels[0]?.id || '');
    const [actionFolderId, setActionFolderId] = useState<string>(SystemFolder.INBOX);

    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!conditionValue) {
            alert('Please fill out all fields for the rule.');
            return;
        }

        let action: Rule['action'];
        switch(actionType) {
            case 'moveToFolder':
                action = { type: 'moveToFolder', folderId: actionFolderId };
                break;
            case 'applyLabel':
                if (!actionLabelId) { alert('Please select a label.'); return; }
                action = { type: 'applyLabel', labelId: actionLabelId };
                break;
            case 'star':
                action = { type: 'star' };
                break;
            case 'markAsRead':
                 action = { type: 'markAsRead' };
                 break;
            default:
                return;
        }

        addRule({
            condition: { field: conditionField, operator: 'contains', value: conditionValue },
            action,
        });
        setConditionValue('');
    };
    
    const renderRule = (rule: Rule) => {
        let actionElement: React.ReactNode;
        switch(rule.action.type) {
            case 'applyLabel': 
                const label = labels.find(l => l.id === rule.action.labelId);
                actionElement = <Pill className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Apply label: "{label?.name || 'unknown'}"</Pill>;
                break;
            case 'moveToFolder':
                const folderName = userFolders.find(f => f.id === rule.action.folderId)?.name || rule.action.folderId || 'unknown folder';
                actionElement = <Pill className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Move to: "{folderName}"</Pill>;
                break;
            case 'star': actionElement = <Pill className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Star it</Pill>; break;
            case 'markAsRead': actionElement = <Pill className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100">Mark as read</Pill>; break;
            default: actionElement = null;
        }
        
        return (
            <div className="flex items-center gap-2 flex-wrap">
                <Pill className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100">If {rule.condition.field} contains:</Pill>
                <Pill className="bg-white dark:bg-dark-surface border border-outline dark:border-dark-outline">"{rule.condition.value}"</Pill>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                {actionElement}
            </div>
        );
    }


    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-on-surface dark:text-dark-on-surface">Rules & Filters</h2>
            <div className="space-y-8">
                <form onSubmit={handleAddRule} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Create a new rule</h3>
                    
                    <div className="flex flex-wrap items-end gap-4">
                        <span className="font-semibold text-gray-600 dark:text-gray-300">If</span>
                        <select 
                            value={conditionField} 
                            onChange={e => setConditionField(e.target.value as ConditionField)}
                            className="p-2 border rounded-md bg-white dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                        >
                            <option value="sender">Sender</option>
                            <option value="recipient">Recipient</option>
                            <option value="subject">Subject</option>
                        </select>
                        <span className="text-gray-600 dark:text-gray-300">contains</span>
                        <input
                            type="text"
                            value={conditionValue}
                            onChange={e => setConditionValue(e.target.value)}
                            className="flex-grow p-2 border rounded-md bg-white dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            placeholder="e.g., newsletter@example.com"
                        />
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                        <span className="font-semibold text-gray-600 dark:text-gray-300">Then</span>
                        <select
                            value={actionType}
                            onChange={e => { setActionType(e.target.value as ActionType); if(e.target.value === 'applyLabel' && !actionLabelId && labels[0]) setActionLabelId(labels[0].id); }}
                            className="p-2 border rounded-md bg-white dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                        >
                            <option value="moveToFolder">Move to folder</option>
                            <option value="applyLabel">Apply label</option>
                            <option value="star">Star it</option>
                            <option value="markAsRead">Mark as read</option>
                        </select>
                         {actionType === 'applyLabel' && (
                            <select
                                value={actionLabelId}
                                onChange={e => setActionLabelId(e.target.value)}
                                className="p-2 border rounded-md bg-white dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                                disabled={labels.length === 0}
                            >
                                {labels.length === 0 ? <option>Create a label first</option> : labels.map(label => <option key={label.id} value={label.id}>{label.name}</option>)}
                            </select>
                        )}
                         {actionType === 'moveToFolder' && (
                            <select
                                value={actionFolderId}
                                onChange={e => setActionFolderId(e.target.value)}
                                className="p-2 border rounded-md bg-white dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            >
                                {Object.values(SystemFolder).map(f => <option key={f} value={f}>{f}</option>)}
                                <option disabled>-- User Folders --</option>
                                {userFolders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                           <PlusCircleIcon className="w-5 h-5"/> Add Rule
                        </button>
                    </div>
                </form>

                <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Existing Rules</h3>
                    <div className="space-y-2">
                        {appSettings.rules.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">No rules have been created.</p>
                        ) : (
                            appSettings.rules.map(rule => (
                                <div key={rule.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-lg border border-outline dark:border-dark-outline">
                                    {renderRule(rule)}
                                    <button onClick={() => deleteRule(rule.id)} className="p-2 ml-4 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RulesSettings;