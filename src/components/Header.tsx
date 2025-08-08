import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuIcon } from './icons/MenuIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MailIcon } from './icons/MailIcon';
import { useAppContext } from '../context/AppContext';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { CogIcon } from './icons/CogIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { supportedLanguages } from '../i18nConfig';

const Header: React.FC = () => {
  const { user, theme, toggleTheme, toggleSidebar, view, setView, logout } = useAppContext();
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoutClick = (e: React.MouseEvent) => {
      e.preventDefault();
      logout();
      setIsMenuOpen(false);
  }
  
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setIsMenuOpen(false);
  };

  const viewButtonClasses = (buttonView: 'mail' | 'contacts') => {
      const base = "px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ease-in-out";
      if(view === buttonView) {
          return `${base} bg-white dark:bg-dark-surface-container shadow text-primary dark:text-dark-on-surface`;
      }
      return `${base} text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200`;
  }

  return (
    <header className="relative z-30 flex items-center justify-between px-4 py-2 bg-surface-container dark:bg-dark-surface-container border-b border-outline dark:border-dark-outline shadow-sm flex-shrink-0">
      <div className="flex items-center space-x-4">
        <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <MenuIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center space-x-2">
            <MailIcon className="w-8 h-8 text-primary"/>
            <span className="text-xl text-gray-700 dark:text-gray-200 hidden sm:inline">{t('header.webmail')}</span>
        </div>
        <div className="ml-4 p-1 bg-gray-200/70 dark:bg-dark-surface rounded-full flex items-center">
            <button onClick={() => setView('mail')} className={viewButtonClasses('mail')}>{t('header.mail')}</button>
            <button onClick={() => setView('contacts')} className={viewButtonClasses('contacts')}>{t('header.contacts')}</button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
         <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title={t(theme === 'light' ? 'header.switchToDarkMode' : 'header.switchToLightMode')}>
            {theme === 'light' ? <MoonIcon className="w-6 h-6 text-gray-600"/> : <SunIcon className="w-6 h-6 text-yellow-400"/>}
         </button>
         <button onClick={() => setView('settings')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title={t('header.settings')}>
            <CogIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
         </button>
         <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <UserCircleIcon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            </button>
             <div className={`absolute right-0 w-56 mt-2 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 transition-all duration-150 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                        <p className="font-semibold truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2"><GlobeAltIcon className="w-4 h-4" /> {t('header.language')}</div>
                    {supportedLanguages.map((lang) => (
                      <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${i18n.language.startsWith(lang.code) ? 'font-bold' : ''}`}
                      >
                          {lang.name}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    <a href="#" onClick={handleLogoutClick} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                        {t('header.signOut')}
                    </a>
                </div>
            </div>
         </div>
      </div>
    </header>
  );
};

export default Header;
