import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { SearchIcon } from './icons/SearchIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { Contact } from '../types';
import Avatar from './Avatar';

const SearchBar: React.FC = () => {
    const { setSearchQuery, contacts, searchQuery } = useAppContext();
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const [suggestions, setSuggestions] = useState<(string | Contact)[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(localQuery);
        setShowSuggestions(false);
        inputRef.current?.blur();
    };

    const clearSearch = () => {
        setLocalQuery('');
        setSearchQuery('');
        setShowSuggestions(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setLocalQuery(query);

        const currentWord = query.split(' ').pop() || '';
        
        if (currentWord.startsWith('from:') || currentWord.startsWith('to:')) {
            const searchTerm = currentWord.substring(currentWord.indexOf(':') + 1);
            const contactSuggestions = contacts.filter(c => 
                (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()))
                && c.email // ensure contact has email
            ).slice(0, 5);
            setSuggestions(contactSuggestions);
            setShowSuggestions(contactSuggestions.length > 0);
        } else if (currentWord.startsWith('is:')) {
            const searchTerm = currentWord.substring(3);
            const options = ['starred', 'unread'];
            const filteredOptions = options.filter(o => o.startsWith(searchTerm));
            setSuggestions(filteredOptions);
            setShowSuggestions(filteredOptions.length > 0);
        } else if (currentWord.startsWith('has:')) {
             const searchTerm = currentWord.substring(4);
            const options = ['attachment'];
            const filteredOptions = options.filter(o => o.startsWith(searchTerm));
            setSuggestions(filteredOptions);
            setShowSuggestions(filteredOptions.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion: string | Contact) => {
        const queryParts = localQuery.split(' ');
        const lastPart = queryParts.pop() || '';
        const filterKey = lastPart.substring(0, lastPart.indexOf(':') + 1);
        
        const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.email;
        const newLastPart = filterKey + suggestionValue;
        
        const newQuery = [...queryParts, newLastPart, ''].join(' ');
        
        setLocalQuery(newQuery);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <form onSubmit={handleSearchSubmit}>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <input
                    ref={inputRef}
                    type="search"
                    placeholder="Search mail (e.g., from:name is:starred)"
                    value={localQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputChange}
                    className="block w-full p-2 pl-10 text-sm text-gray-900 bg-gray-100 border border-transparent rounded-full dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 focus:ring-primary focus:border-primary focus:bg-white dark:focus:bg-gray-800"
                />
                {localQuery && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                    </button>
                )}
            </form>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <div 
                            key={typeof s === 'string' ? s : s.id} 
                            onMouseDown={() => handleSuggestionClick(s)}
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3"
                        >
                            {typeof s !== 'string' && <Avatar name={s.name} className="w-8 h-8 text-xs"/>}
                            <div>
                                <p className="font-semibold">{typeof s === 'string' ? s : s.name}</p>
                                {typeof s !== 'string' && <p className="text-xs text-gray-500">{s.email}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
