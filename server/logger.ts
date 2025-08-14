import * as wsManager from './wsManager';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const REDACTED = 'REDACTED';

// Redact passwords and other sensitive info from logs
function redact(data: any): any {
    if (!data) return data;
    try {
        const jsonString = JSON.stringify(data, (key, value) => {
            const lowerKey = typeof key === 'string' ? key.toLowerCase() : '';
            if (lowerKey.includes('pass') || lowerKey.includes('token') || lowerKey.includes('credentials')) {
                return REDACTED;
            }
             if (typeof value === 'string' && value.length > 500) { // Truncate long strings like base64 images
                return value.substring(0, 500) + '...[TRUNCATED]';
            }
            return value;
        });
        return JSON.parse(jsonString);
    } catch (error) {
        return { "redactionError": "Could not stringify data for redaction." };
    }
}

function log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const cleanData = data ? redact(data) : undefined;
    
    // Log to console
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    const logData = cleanData ? JSON.stringify(cleanData, null, 2) : '';

    switch (level) {
        case 'INFO':
            console.log(logMessage, logData);
            break;
        case 'WARN':
            console.warn(logMessage, logData);
            break;
        case 'ERROR':
            console.error(logMessage, logData);
            break;
        case 'DEBUG':
            // In a real app, you might only log DEBUG messages if a specific env var is set
            console.debug(logMessage, logData);
            break;
    }

    // Broadcast to clients via WebSocket manager
    wsManager.broadcast('DEBUG_LOG', {
        level,
        message: message,
        data: cleanData
    });
}

export const logger = {
    info: (message: string, data?: any) => log('INFO', message, data),
    warn: (message: string, data?: any) => log('WARN', message, data),
    error: (message: string, data?: any) => log('ERROR', message, data),
    debug: (message: string, data?: any) => log('DEBUG', message, data),
};
