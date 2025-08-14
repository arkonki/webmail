export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: Date;
  source: 'CLIENT' | 'SERVER';
  level: LogLevel;
  message: string;
  data?: any;
}

type LogListener = (log: LogEntry) => void;

let listeners: LogListener[] = [];

export const logService = {
  log: (level: LogLevel, message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date(),
      source: 'CLIENT',
      level,
      message,
      data,
    };
    // Also log to browser console for easy access during development
    switch(level) {
        case 'INFO': console.log(message, data); break;
        case 'WARN': console.warn(message, data); break;
        case 'ERROR': console.error(message, data); break;
        case 'DEBUG': console.debug(message, data); break;
    }
    listeners.forEach(listener => listener(entry));
  },
  
  addServerLog: (logFromServer: Omit<LogEntry, 'timestamp' | 'source' | 'data'> & { data?: any }) => {
     const entry: LogEntry = {
      timestamp: new Date(),
      source: 'SERVER',
      level: logFromServer.level,
      message: logFromServer.message,
      data: logFromServer.data,
    };
    listeners.forEach(listener => listener(entry));
  },

  subscribe: (listener: LogListener): (() => void) => {
    listeners.push(listener);
    // Return an unsubscribe function
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
};
