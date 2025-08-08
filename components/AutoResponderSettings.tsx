import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const AutoResponderSettings: React.FC = () => {
    const { appSettings, updateAutoResponder } = useAppContext();
    const [isEnabled, setIsEnabled] = useState(appSettings.autoResponder.isEnabled);
    const [subject, setSubject] = useState(appSettings.autoResponder.subject);
    const [message, setMessage] = useState(appSettings.autoResponder.message);
    const [startDate, setStartDate] = useState(appSettings.autoResponder.startDate?.split('T')[0] || '');
    const [endDate, setEndDate] = useState(appSettings.autoResponder.endDate?.split('T')[0] || '');


    const handleSave = () => {
        updateAutoResponder({
            isEnabled,
            subject,
            message,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        });
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-on-surface dark:text-dark-on-surface">Auto Responder (Out of Office)</h2>
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <label htmlFor="enable-autoresponder" className="font-medium text-gray-700 dark:text-gray-300">Enable Auto Responder</label>
                     <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input
                            type="checkbox"
                            name="enable-autoresponder"
                            id="enable-autoresponder"
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-400 border-4 appearance-none cursor-pointer"
                        />
                        <label htmlFor="enable-autoresponder" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></label>
                    </div>
                </div>

                 <div className={`space-y-4 transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div>
                        <label htmlFor="autoresponder-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                        <input
                            type="text"
                            id="autoresponder-subject"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            placeholder="Out of Office"
                        />
                    </div>
                    <div>
                        <label htmlFor="autoresponder-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                        <textarea
                            id="autoresponder-message"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={5}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            placeholder="I am currently out of the office and will reply upon my return."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date (Optional)</label>
                            <input
                                type="date"
                                id="start-date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date (Optional)</label>
                            <input
                                type="date"
                                id="end-date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end">
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                        Save Changes
                    </button>
                </div>
            </div>
             <style>{`
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #0B57D0;
                    background-color: #0B57D0;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #0B57D0;
                }
            `}</style>
        </div>
    );
};

export default AutoResponderSettings;
