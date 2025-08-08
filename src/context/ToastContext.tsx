import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';

interface ToastAction {
    label: string;
    onClick: () => void;
}

interface Toast {
  id: number;
  messageKey: string;
  duration?: number;
  action?: ToastAction;
  tOptions?: { [key: string]: any };
}

interface ToastOptions {
    duration?: number;
    action?: ToastAction;
    tOptions?: { [key: string]: any };
}

interface ToastContextType {
  addToast: (messageKey: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastComponent: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const { t } = useTranslation();
    const { messageKey, tOptions, duration = 3000, action } = toast;
    
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onDismiss]);
    
    const handleActionClick = () => {
        action?.onClick();
        onDismiss();
    };

    return (
        <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm py-2 px-4 rounded-full shadow-lg flex items-center animate-fade-in-out">
            <span>{String(t(messageKey, tOptions))}</span>
            {action && (
                <button onClick={handleActionClick} className="ml-4 font-bold text-blue-300 dark:text-blue-600 hover:underline">
                    {String(t(action.label))}
                </button>
            )}
        </div>
    );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [portalNode, setPortalNode] = useState<Element | null>(null);

  useEffect(() => {
      setPortalNode(document.getElementById('toast-container'));
  }, []);

  const addToast = useCallback((messageKey: string, options?: ToastOptions) => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, messageKey, ...options }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const toastContent = portalNode ? ReactDOM.createPortal(
    toasts.map(toast => <ToastComponent key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />),
    portalNode
  ) : null;

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toastContent}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
