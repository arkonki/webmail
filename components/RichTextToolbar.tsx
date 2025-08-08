import React, { useState, useRef, useEffect } from 'react';
import { LinkIcon } from './icons/LinkIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { XMarkIcon } from './icons/XMarkIcon';

interface RichTextToolbarProps {
    onInsertImage: () => void;
}

const Button = React.forwardRef<HTMLButtonElement, { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void, onMouseDown?: (e: React.MouseEvent) => void, title: string, children: React.ReactNode }>(({ onClick, onMouseDown, title, children }, ref) => (
    <button
        ref={ref}
        type="button"
        onClick={onClick}
        onMouseDown={onMouseDown || (e => e.preventDefault())} // Prevent editor from losing focus by default
        className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center w-8 h-8"
        title={title}
    >
        {children}
    </button>
));

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ onInsertImage }) => {
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('https://');
    const [linkText, setLinkText] = useState('');
    const savedRangeRef = useRef<Range | null>(null);
    const linkPopoverRef = useRef<HTMLDivElement>(null);
    const linkButtonRef = useRef<HTMLButtonElement>(null);

    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isLinkPopoverOpen && linkPopoverRef.current && !linkPopoverRef.current.contains(event.target as Node) && !linkButtonRef.current?.contains(event.target as Node)) {
                setIsLinkPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLinkPopoverOpen]);

    const handleLinkClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        
        if (isLinkPopoverOpen) {
            setIsLinkPopoverOpen(false);
            return;
        }
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            savedRangeRef.current = range;

            let parent = range.commonAncestorContainer;
            if (parent.nodeType !== Node.ELEMENT_NODE) {
                parent = parent.parentNode!;
            }
            const anchor = (parent as HTMLElement).closest('a');
            
            if(anchor){
                setLinkUrl(anchor.href);
                setLinkText(anchor.innerText);
            } else {
                setLinkText(range.toString());
                setLinkUrl('https://');
            }
        }
        setIsLinkPopoverOpen(true);
    };

    const handleApplyLink = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (savedRangeRef.current && linkUrl) {
            const selection = window.getSelection();
            if (!selection) return;

            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
            
            const displayText = linkText.trim() || savedRangeRef.current.toString().trim() || linkUrl;
            
            // Unlink first to handle editing existing links cleanly
            document.execCommand('unlink', false);
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);

            // This replaces the selection with the new link.
            document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${displayText}</a>`);
        }
        setIsLinkPopoverOpen(false);
        setLinkUrl('https://');
        setLinkText('');
    };

    return (
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
            <Button onClick={() => handleFormat('bold')} title="Bold">
                <span className="font-bold">B</span>
            </Button>
            <Button onClick={() => handleFormat('italic')} title="Italic">
                <span className="italic">I</span>
            </Button>
            <Button onClick={() => handleFormat('underline')} title="Underline">
                <span className="underline">U</span>
            </Button>
            <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <Button onClick={() => handleFormat('insertUnorderedList')} title="Bulleted List">
                <ListBulletIcon className="w-5 h-5" />
            </Button>
            <Button onClick={() => handleFormat('insertOrderedList')} title="Numbered List">
                <span className="font-mono text-sm">1.</span>
            </Button>
            <div className="relative">
                <Button 
                    ref={linkButtonRef}
                    onClick={handleLinkClick}
                    onMouseDown={(e) => { e.preventDefault(); }}
                    title="Insert Link"
                >
                    <LinkIcon className="w-4 h-4" />
                </Button>
                {isLinkPopoverOpen && (
                    <div ref={linkPopoverRef} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 border border-outline dark:border-dark-outline rounded-lg shadow-xl z-20 w-80">
                        <form onSubmit={handleApplyLink} className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">Edit link</p>
                                <button type="button" onClick={() => setIsLinkPopoverOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <XMarkIcon className="w-4 h-4 text-gray-500"/>
                                </button>
                            </div>
                             <div>
                                <label htmlFor="link-text" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Text to display</label>
                                <input
                                    id="link-text"
                                    type="text"
                                    value={linkText}
                                    onChange={(e) => setLinkText(e.target.value)}
                                    placeholder="Uses selected text by default"
                                    className="w-full p-2 text-sm border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                                />
                            </div>
                            <div>
                                <label htmlFor="link-url" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL</label>
                                <input
                                    id="link-url"
                                    type="url"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyLink(e); }}
                                    className="w-full p-2 text-sm border rounded-md bg-gray-50 dark:bg-dark-surface text-on-surface dark:text-dark-on-surface dark:border-dark-outline"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="px-4 py-1.5 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                                    Apply
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
            <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <Button onClick={onInsertImage} title="Insert image">
                <PhotoIcon className="w-5 h-5" />
            </Button>
        </div>
    );
};

export default RichTextToolbar;
