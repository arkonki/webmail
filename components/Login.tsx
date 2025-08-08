import React, { useState } from 'react';
import { MailIcon } from './icons/MailIcon';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const { login, isLoading } = useAppContext();
  const { t } = useTranslation();
  const [email, setEmail] = useState('test.user@example.com');
  const [password, setPassword] = useState('password');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-dark-surface-container rounded-lg shadow-md">
        <div className="text-center">
            <MailIcon className="w-12 h-12 mx-auto text-primary"/>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('login.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('login.subtitle')}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {t('login.subtext')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">{t('login.emailLabel')}</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md appearance-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder={t('login.emailLabel')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">{t('login.passwordLabel')}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md appearance-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder={t('login.passwordLabel')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md group bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 dark:disabled:bg-gray-600"
            >
              {isLoading ? t('login.signingInButton') : t('login.signInButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
