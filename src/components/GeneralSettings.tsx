import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18nConfig';

type SendDelayDuration = 5 | 10 | 20 | 30;

const GeneralSettings: React.FC = () => {
    const { appSettings, updateGeneralSettings } = useAppContext();
    const { t } = useTranslation();
    const [isEnabled, setIsEnabled] = useState(appSettings.sendDelay.isEnabled);
    const [duration, setDuration] = useState<SendDelayDuration>(appSettings.sendDelay.duration);
    const [language, setLanguage] = useState(appSettings.language || 'en');

    const handleSave = () => {
        updateGeneralSettings({ 
            sendDelay: { isEnabled, duration },
            language 
        });
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-on-surface dark:text-dark-on-surface">{t('generalSettings.title')}</h2>
            <div className="space-y-6">
                 <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('generalSettings.undoSend')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('generalSettings.undoSendDescription')}</p>
                     <div className="flex items-center justify-between">
                        <label htmlFor="enable-send-delay" className="font-medium text-gray-700 dark:text-gray-300">{t('generalSettings.enableSendDelay')}</label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                name="enable-send-delay"
                                id="enable-send-delay"
                                checked={isEnabled}
                                onChange={(e) => setIsEnabled(e.target.checked)}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-400 border-4 appearance-none cursor-pointer"
                            />
                            <label htmlFor="enable-send-delay" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></label>
                        </div>
                    </div>
                 </div>

                <div className={`transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('generalSettings.cancellationPeriod')}</label>
                    <select
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value) as SendDelayDuration)}
                        className="w-full md:w-1/2 p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                        disabled={!isEnabled}
                    >
                        <option value={5}>{t('generalSettings.seconds_5')}</option>
                        <option value={10}>{t('generalSettings.seconds_10')}</option>
                        <option value={20}>{t('generalSettings.seconds_20')}</option>
                        <option value={30}>{t('generalSettings.seconds_30')}</option>
                    </select>
                </div>

                <div className="border-t border-outline dark:border-dark-outline pt-6">
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('generalSettings.displayLanguage')}</label>
                     <select
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full md:w-1/2 p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                    >
                        {supportedLanguages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>


                <div className="flex justify-end">
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                        {t('generalSettings.save')}
                    </button>
                </div>
            </div>
             <style>{`
                .toggle-checkbox:checked { right: 0; border-color: #0B57D0; background-color: #0B57D0; }
                .toggle-checkbox:checked + .toggle-label { background-color: #0B57D0; }
            `}</style>
        </div>
    );
};
export default GeneralSettings;
