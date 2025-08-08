
import React, { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import EmailView from './EmailView';
import ComposeModal from './ComposeModal';
import Settings from './Settings';
import ContactsView from './ContactsView';
import { useAppContext } from '../context/AppContext';

const MainLayout: React.FC = () => {
  const { composeState, handleEscape, view, isSidebarCollapsed, navigateConversationList, selectedConversationId, openFocusedConversation } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.nodeName === 'INPUT' || target.nodeName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (e.key === 'Escape') {
        handleEscape();
      }

      // Only handle list navigation when the list is visible
      if (view === 'mail' && !composeState.isOpen && !selectedConversationId) {
        if (e.key === 'ArrowUp' || e.key === 'k') {
            e.preventDefault();
            navigateConversationList('up');
        } else if (e.key === 'ArrowDown' || e.key === 'j') {
            e.preventDefault();
            navigateConversationList('down');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            openFocusedConversation();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleEscape, view, composeState.isOpen, navigateConversationList, selectedConversationId, openFocusedConversation]);

  const renderMailView = () => {
    if (selectedConversationId) {
        return <EmailView />;
    }
    return <EmailList />;
  };

  const renderView = () => {
    switch (view) {
      case 'settings':
        return <Settings />;
      case 'contacts':
        return <ContactsView />;
      case 'mail':
      default:
        return renderMailView();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface dark:bg-dark-surface text-on-surface dark:text-dark-on-surface">
      <Header />
      <div className="flex flex-grow overflow-hidden">
        <Sidebar />
        <main className={`flex-grow transition-all duration-300 ease-in-out flex flex-col ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          {renderView()}
        </main>
      </div>
      {composeState.isOpen && <ComposeModal />}
    </div>
  );
};

export default MainLayout;
