


import React, { useState } from 'react';
import SignatureSettings from './SignatureSettings';
import AutoResponderSettings from './AutoResponderSettings';
import RulesSettings from './RulesSettings';
import GeneralSettings from './GeneralSettings';
import LabelSettings from './LabelSettings';
import FolderSettings from './FolderSettings';
import ProfileSettings from './ProfileSettings';
import { useTranslation } from 'react-i18next';

type SettingsTab = 'general' | 'profile' | 'labels' | 'folders' | 'signature' | 'autoResponder' | 'rules';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const { t } = useTranslation();

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettings />;
            case 'profile': return <ProfileSettings />;
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
                <h1 className="text-2xl font-bold text-on-surface dark:text-dark-on-surface">{t('settings.title')}</h1>
            </div>

            <div className="flex flex-row gap-8">
                <div className="flex flex-col gap-2 p-2 bg-white dark:bg-dark-surface-container rounded-lg border border-outline dark:border-dark-outline self-start w-48 flex-shrink-0">
                    <TabButton tab="general" label={t('settings.general')} />
                    <TabButton tab="profile" label={t('settings.profile')} />
                    <TabButton tab="labels" label={t('settings.labels')} />
                    <TabButton tab="folders" label={t('settings.folders')} />
                    <TabButton tab="signature" label={t('settings.signature')} />
                    <TabButton tab="autoResponder" label={t('settings.autoResponder')} />
                    <TabButton tab="rules" label={t('settings.rules')} />
                </div>
                <div className="flex-grow bg-white dark:bg-dark-surface-container p-6 rounded-lg border border-outline dark:border-dark-outline min-h-[500px]">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default Settings;
