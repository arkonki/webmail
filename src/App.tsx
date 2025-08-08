import React, { useCallback, useEffect, Suspense } from 'react';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import { AppContextProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

const AppContent: React.FC = () => {
    const { user, isLoading, checkUserSession, theme } = useAppContext();

    useEffect(() => {
        checkUserSession();
    }, [checkUserSession]);
    
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        root.style.colorScheme = theme;
    }, [theme]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface dark:bg-dark-surface">
                <SpinnerIcon className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }
    
    return user ? <MainLayout /> : <Login />;
};


const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContextProvider>
                 <Suspense fallback={
                    <div className="flex items-center justify-center h-screen bg-surface dark:bg-dark-surface">
                        <SpinnerIcon className="w-12 h-12 text-primary animate-spin" />
                    </div>
                 }>
                    <div className="h-screen w-screen font-sans overflow-x-hidden">
                        <AppContent />
                    </div>
                </Suspense>
            </AppContextProvider>
        </ToastProvider>
    );
};

export default App;
