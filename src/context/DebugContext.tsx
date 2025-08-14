import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { logService, LogEntry } from '../services/logService';

interface DebugContextType {
  logs: LogEntry[];
  isOpen: boolean;
  toggleOpen: () => void;
  clearLogs: () => void;
}
const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = logService.subscribe((log) => {
      setLogs(prev => [...prev.slice(-200), log]); // Keep last 200 logs
    });
    return () => unsubscribe();
  }, []);

  const toggleOpen = useCallback(() => setIsOpen(p => !p), []);
  const clearLogs = useCallback(() => setLogs([]), []);

  const value = { logs, isOpen, toggleOpen, clearLogs };

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
};

export const useDebugContext = (): DebugContextType => {
  const context = useContext(DebugContext);
  if (!context) throw new Error('useDebugContext must be used within a DebugProvider');
  return context;
};
