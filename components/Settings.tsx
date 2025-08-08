

import React, { useState } from 'react';
import SignatureSettings from './SignatureSettings';
import AutoResponderSettings from './AutoResponderSettings';
import RulesSettings from './RulesSettings';
import GeneralSettings from './GeneralSettings';
import LabelSettings from './LabelSettings';
import FolderSettings from './FolderSettings';

type SettingsTab = 'general' | 'labels' | 'folders' | 'signature' | 'autoResponder' | 'rules';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettings />;
            case 'labels': return <LabelSettings />;
            case 'folders': return <FolderSettings />;
            case 'signature': return <SignatureSettings />;
            case 'autoResponder': return <AutoResponderSettings />;
            case 'rules': return <RulesSettings />;
            default: return null;
        }
    };
    
    const TabButton: React.FC<{tab: SettingsTab, label: string}> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 w-full text-left text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
                ? 'bg-primary text-white' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex-grow flex flex-col bg-gray-50 dark:bg-dark-surface overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-on-surface dark:text-dark-on-surface">Settings</h1>
            </div>

            <div className="flex flex-row gap-8">
                <div className="flex flex-col gap-2 p-2 bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline self-start w-48 flex-shrink-0">
                    <TabButton tab="general" label="General" />
                    <TabButton tab="labels" label="Labels" />
                    <TabButton tab="folders" label="Folders" />
                    <TabButton tab="signature" label="Signature" />
                    <TabButton tab="autoResponder" label="Auto Responder" />
                    <TabButton tab="rules" label="Rules" />
                </div>
                <div className="flex-grow bg-white dark:bg-dark-surface-container p-6 rounded-lg border border-outline dark:border-dark-outline min-h-[500px]">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default Settings;