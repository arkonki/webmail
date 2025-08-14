import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useDebugContext } from '../context/DebugContext';
import { useAppContext } from '../context/AppContext';
import { LogEntry } from '../services/logService';
import { BugAntIcon } from './icons/BugAntIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { TrashIcon } from './icons/TrashIcon';

const getLogLevelClass = (level: LogEntry['level']) => {
  switch (level) {
    case 'ERROR': return 'text-red-400';
    case 'WARN': return 'text-yellow-400';
    case 'INFO': return 'text-blue-400';
    case 'DEBUG': return 'text-gray-500';
    default: return 'text-gray-300';
  }
};

const getLogSourceClass = (source: LogEntry['source']) => {
    return source === 'SERVER' ? 'text-purple-400' : 'text-green-400';
}

const LogLine: React.FC<{ log: LogEntry }> = ({ log }) => {
    const [isDataOpen, setIsDataOpen] = useState(false);
    return (
        <div className={`p-2 border-b border-gray-700/50 font-mono text-xs ${getLogLevelClass(log.level)}`}>
            <div className="flex items-start gap-2">
                <span className="text-gray-500">{log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions)}</span>
                <span className={`font-bold ${getLogSourceClass(log.source)}`}>[{log.source}]</span>
                <span>{log.message}</span>
                {log.data && (
                    <button onClick={() => setIsDataOpen(!isDataOpen)} className="ml-auto text-gray-500 hover:text-white flex-shrink-0">
                        {isDataOpen ? '[ v ]' : '[ > ]'}
                    </button>
                )}
            </div>
            {isDataOpen && log.data && (
                <pre className="mt-2 p-2 bg-black/30 rounded text-gray-300 text-xs overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                </pre>
            )}
        </div>
    );
};

const DebugView = () => {
    const { logs, isOpen, toggleOpen, clearLogs } = useDebugContext();
    const appContext = useAppContext();
    const [activeTab, setActiveTab] = useState<'logs' | 'state'>('logs');
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'logs' && isOpen) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, activeTab, isOpen]);

    const portalNode = document.getElementById('debug-portal');

    if (!portalNode) return null;

    if (!isOpen) {
        return ReactDOM.createPortal(
            <button
                onClick={toggleOpen}
                className="fixed bottom-4 right-4 z-50 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700"
                title="Open Debug Console"
            >
                <BugAntIcon className="w-6 h-6" />
            </button>,
            portalNode
        );
    }
    
    const stateToDisplay = {
        user: appContext.user,
        isLoading: appContext.isLoading,
        view: appContext.view,
        theme: appContext.theme,
        currentSelection: appContext.currentSelection,
        searchQuery: appContext.searchQuery,
        counts: {
            emails: appContext.emails.length,
            conversations: appContext.conversations.length,
            displayedConversations: appContext.displayedConversations.length,
            labels: appContext.labels.length,
            userFolders: appContext.userFolders.length,
            contacts: appContext.contacts.length,
            contactGroups: appContext.contactGroups.length,
        },
        pagination: {
            currentPage: appContext.currentPage,
            totalPages: appContext.totalPages,
            totalItems: appContext.totalItems,
        },
        appSettings: appContext.appSettings,
    };

    const debugViewContent = (
        <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
            <div className="w-full max-w-2xl h-full bg-gray-800/95 backdrop-blur-sm text-white shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right">
                <header className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <BugAntIcon className="w-5 h-5"/>
                        <h2 className="font-semibold">Debug Console</h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={clearLogs} title="Clear Logs" className="p-2 hover:bg-gray-700 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                         <button onClick={toggleOpen} title="Close" className="p-2 hover:bg-gray-700 rounded-full"><XMarkIcon className="w-5 h-5"/></button>
                    </div>
                </header>
                <div className="flex-shrink-0 border-b border-gray-700">
                     <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm ${activeTab === 'logs' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}>Logs</button>
                     <button onClick={() => setActiveTab('state')} className={`px-4 py-2 text-sm ${activeTab === 'state' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}>State</button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {activeTab === 'logs' ? (
                        <div>
                            {logs.map((log, index) => <LogLine key={index} log={log} />)}
                            <div ref={logsEndRef} />
                        </div>
                    ) : (
                         <pre className="p-4 text-xs overflow-x-auto">
                            {JSON.stringify(stateToDisplay, null, 2)}
                        </pre>
                    )}
                </div>
            </div>
             <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
            `}</style>
        </div>
    );

    return ReactDOM.createPortal(debugViewContent, portalNode);
};

export default DebugView;