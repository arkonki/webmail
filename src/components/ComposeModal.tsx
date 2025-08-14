import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ActionType, SystemFolder, Contact, ContactGroup, SendEmailData, Attachment } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';
import RichTextToolbar from './RichTextToolbar';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import ScheduleSendPopover from './ScheduleSendPopover';
import { UsersIcon } from './icons/UsersIcon';
import Avatar from './Avatar';
import { MinusIcon } from './icons/MinusIcon';
import AttachmentTile from './AttachmentTile';

const fileToAttachment = (file: File): Promise<Attachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Content = (reader.result as string).split(',')[1];
      resolve({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        content: base64Content,
      });
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};


type AutocompleteSuggestion = (Contact & { type: 'contact' }) | (ContactGroup & { type: 'group' });

const ComposeModal: React.FC = () => {
    const { composeState, closeCompose, sendEmail, appSettings, contacts, contactGroups, user, saveDraft, deleteDraft, toggleMinimizeCompose } = useAppContext();
    
    const contentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const dragCounter = useRef(0);
    const wasOpenRef = useRef(false);

    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [restoredAttachments, setRestoredAttachments] = useState<Attachment[]>([]);
    const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Map<string, string>>(new Map());
    const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(composeState.draftId);
    
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [activeAutocompleteField, setActiveAutocompleteField] = useState<'to' | 'cc' | 'bcc' | null>(null);
    const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);

    useEffect(() => {
        // This effect runs only when the modal is newly opened, preventing state wipes on re-render.
        if (composeState.isOpen && !wasOpenRef.current && user) {
            wasOpenRef.current = true;
            const { action, email, recipient, bodyPrefix, initialData, draftId } = composeState;
            setCurrentDraftId(draftId);
            
            if (initialData) {
                setTo(initialData.to);
                setCc(initialData.cc || '');
                setBcc(initialData.bcc || '');
                setSubject(initialData.subject);
                setBody(initialData.body);
                setAttachments([]);
                setRestoredAttachments(initialData.attachments);
                if (contentRef.current) contentRef.current.innerHTML = initialData.body;
                setShowCc(!!initialData.cc);
                setShowBcc(!!initialData.bcc);
            } else {
                let finalBody = '';
                setTo(recipient || '');
                setCc('');
                setBcc('');
                setSubject('');
                setAttachments([]);
                setRestoredAttachments([]);
                setShowCc(false);
                setShowBcc(false);

                if (action === ActionType.DRAFT && email) {
                    setTo(email.recipientEmail || '');
                    setCc(email.cc || '');
                    setBcc(email.bcc || '');
                    setSubject(email.subject);
                    finalBody = email.body;
                    setShowCc(!!email.cc);
                    setShowBcc(!!email.bcc);
                } else if (action === ActionType.REPLY && email) {
                    setTo(email.senderEmail);
                    setSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
                    const formattedDate = new Date(email.timestamp).toLocaleString();
                    const replyContent = bodyPrefix ? `<p>${bodyPrefix}</p>` : '<p><br></p>';
                    const signature = appSettings.signature.isEnabled ? `<br><br>${appSettings.signature.body}` : '';
                    finalBody = `${replyContent}${signature}<br><blockquote class="dark:border-gray-600">On ${formattedDate}, ${email.senderName} &lt;${email.senderEmail}&gt; wrote:<br>${email.body}</blockquote>`;
                } else if (action === ActionType.FORWARD && email) {
                    setSubject(email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`);
                    const formattedDate = new Date(email.timestamp).toLocaleString();
                    const signature = appSettings.signature.isEnabled ? `<br><br>${appSettings.signature.body}` : '';
                    finalBody = `<p><br></p>${signature}<br><blockquote class="dark:border-gray-600">--- Forwarded message ---<br><b>From:</b> ${email.senderName} &lt;${email.senderEmail}&gt;<br><b>Date:</b> ${formattedDate}<br><b>Subject:</b> ${email.subject}<br><br>${email.body}</blockquote>`;
                } else {
                    finalBody = appSettings.signature.isEnabled ? `<p><br></p><br>${appSettings.signature.body}` : '';
                }

                setBody(finalBody);
                if (contentRef.current) {
                    contentRef.current.innerHTML = finalBody;
                }
            }
        } else if (!composeState.isOpen) {
             wasOpenRef.current = false;
        }
    }, [composeState, user, appSettings.signature]);

    const prepareAndSaveDraft = async () => {
        const newAttachmentData = await Promise.all(attachments.map(fileToAttachment));
        const allAttachments = [...restoredAttachments, ...newAttachmentData];
        const draftData = { to, cc, bcc, subject, body, attachments: allAttachments };
        const newDraftId = await saveDraft(draftData, currentDraftId, composeState.conversationId);
        return newDraftId;
    };
    
    // Auto-save logic
    useEffect(() => {
        if (!composeState.isOpen) return;
        let isMounted = true;
        const timer = setTimeout(() => {
            if (isMounted && (to || cc || bcc || subject || (contentRef.current && contentRef.current.innerText.trim() !== '') || attachments.length > 0 || restoredAttachments.length > 0)) {
               prepareAndSaveDraft().then(newDraftId => {
                   if (isMounted) setCurrentDraftId(newDraftId);
               });
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [to, cc, bcc, subject, body, attachments, restoredAttachments, composeState.isOpen, saveDraft, currentDraftId, composeState.conversationId]);

    const handleClose = () => {
        if (to || subject || (contentRef.current && contentRef.current.innerText.trim() !== '') || attachments.length > 0 || restoredAttachments.length > 0) {
           prepareAndSaveDraft();
        } else if (currentDraftId) {
            deleteDraft(currentDraftId);
        }
        closeCompose();
    };

    const handleDeleteAndClose = () => {
        if (currentDraftId) {
            deleteDraft(currentDraftId);
        }
        closeCompose();
    };

    const handleSend = async (scheduleDate?: Date) => {
        if (!to) {
            alert('Please enter at least one recipient.');
            return;
        }
        const newAttachmentData = await Promise.all(attachments.map(fileToAttachment));
        const allAttachments = [...restoredAttachments, ...newAttachmentData];
        const sendData: SendEmailData = { to, cc, bcc, subject, body, attachments: allAttachments, scheduleDate };
        sendEmail(sendData, currentDraftId, composeState.conversationId);
        setIsSchedulePopoverOpen(false);
    };

    const handleBodyChange = (e: React.FormEvent<HTMLDivElement>) => {
        setBody(e.currentTarget.innerHTML);
    };

    const addFiles = (files: File[]) => {
        setAttachments(prev => [...prev, ...files]);
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setAttachmentPreviewUrls(prev => new Map(prev).set(file.name, url));
            }
        });
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(Array.from(e.target.files));
        e.target.value = '';
    };

    const insertImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl && contentRef.current) {
                contentRef.current.focus();
                document.execCommand('insertHTML', false, `<img src="${dataUrl}" style="max-width: 100%; height: auto; border-radius: 4px;" alt="${file.name}"/>`);
                setBody(contentRef.current.innerHTML);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          insertImageFile(e.target.files[0]);
        }
        e.target.value = '';
    };
    
    const removeAttachment = (index: number) => {
        const fileToRemove = attachments[index];
        if (attachmentPreviewUrls.has(fileToRemove.name)) {
            URL.revokeObjectURL(attachmentPreviewUrls.get(fileToRemove.name)!);
            setAttachmentPreviewUrls(prev => {
                const newMap = new Map(prev);
                newMap.delete(fileToRemove.name);
                return newMap;
            });
        }
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragEvents = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: React.DragEvent) => { handleDragEvents(e); dragCounter.current++; if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDraggingOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { handleDragEvents(e); dragCounter.current--; if (dragCounter.current === 0) setIsDraggingOver(false); };
    const handleDrop = (e: React.DragEvent) => { handleDragEvents(e); setIsDraggingOver(false); dragCounter.current = 0; if (e.dataTransfer.files && e.dataTransfer.files.length > 0) addFiles(Array.from(e.dataTransfer.files)); };

    // --- Autocomplete Logic ---
    const updateAutocomplete = (query: string, field: 'to' | 'cc' | 'bcc') => {
        setActiveAutocompleteField(field);
        if (!query.trim()) {
            setAutocompleteSuggestions([]);
            return;
        }
        const lowerCaseQuery = query.toLowerCase();
        
        const contactSuggestions = contacts.filter(c => c.name.toLowerCase().includes(lowerCaseQuery) || c.email.toLowerCase().includes(lowerCaseQuery)).map(c => ({ ...c, type: 'contact' as const }));
        const groupSuggestions = contactGroups.filter(g => g.name.toLowerCase().includes(lowerCaseQuery)).map(g => ({ ...g, type: 'group' as const }));
        
        setAutocompleteSuggestions([...contactSuggestions, ...groupSuggestions].slice(0, 5));
    };
    
    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void, field: 'to'|'cc'|'bcc') => {
        const value = e.target.value;
        setter(value);
        const lastEntry = value.split(/[,;]/).pop()?.trim() || '';
        if (lastEntry) {
            updateAutocomplete(lastEntry, field);
        } else {
            setAutocompleteSuggestions([]);
        }
    };
    
    const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
        if (!activeAutocompleteField) return;

        let setter, currentValue: string;
        if (activeAutocompleteField === 'to') { setter = setTo; currentValue = to; }
        else if (activeAutocompleteField === 'cc') { setter = setCc; currentValue = cc; }
        else { setter = setBcc; currentValue = bcc; }

        const parts = currentValue.split(/[,;]/);
        parts.pop(); // remove last (partial) entry
        
        const suggestionValue = suggestion.type === 'contact' ? `${suggestion.name} <${suggestion.email}>` : suggestion.name;
        const newValue = [...parts, suggestionValue, ''].join(', ');
        setter(newValue);
        setAutocompleteSuggestions([]);
    };

    const getModalTitle = () => {
        switch (composeState.action) {
            case ActionType.REPLY: return `Re: ${composeState.email?.subject || ''}`;
            case ActionType.FORWARD: return `Fwd: ${composeState.email?.subject || ''}`;
            case ActionType.DRAFT: return 'Edit Draft';
            default: return 'New Message';
        }
    }
    
    const commonInputClasses = "w-full bg-transparent focus:outline-none text-sm text-on-surface dark:text-dark-on-surface";
    const addressFieldWrapperClasses = "flex items-center gap-2 border-b border-outline dark:border-dark-outline px-4 py-2";

    if (composeState.isMinimized) {
        return (
            <div
                onClick={toggleMinimizeCompose}
                className="fixed bottom-0 right-8 w-64 h-12 bg-surface-container dark:bg-dark-surface-container rounded-t-lg shadow-2xl cursor-pointer flex items-center justify-between px-4"
            >
                <p className="text-sm font-medium truncate">{getModalTitle()}</p>
                <div className="flex items-center">
                    <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><XMarkIcon className="w-4 h-4"/></button>
                </div>
            </div>
        )
    }

    return (
        <div 
            ref={modalRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragEvents}
            onDrop={handleDrop}
            className="fixed bottom-0 right-8 w-full max-w-2xl h-[70vh] flex flex-col bg-surface dark:bg-dark-surface rounded-t-lg shadow-2xl z-40"
        >
            {isDraggingOver && (
                <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-t-lg flex items-center justify-center pointer-events-none z-50">
                    <p className="text-lg font-bold text-primary">Drop files to attach</p>
                </div>
            )}
            <header className="flex items-center justify-between px-4 py-2 bg-surface-container dark:bg-dark-surface-container rounded-t-lg text-on-surface-variant dark:text-dark-on-surface-variant">
                <p className="text-sm font-medium truncate">{getModalTitle()}</p>
                <div className="flex items-center">
                    <button onClick={toggleMinimizeCompose} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><MinusIcon className="w-4 h-4"/></button>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><XMarkIcon className="w-4 h-4"/></button>
                </div>
            </header>
            <div className="flex-grow flex flex-col overflow-y-auto relative">
                <div className="flex-shrink-0">
                    <div className={addressFieldWrapperClasses}>
                        <label htmlFor="to-field" className="text-sm text-gray-500 dark:text-gray-400">To</label>
                        <input id="to-field" type="text" value={to} onChange={(e) => handleFieldChange(e, setTo, 'to')} className={commonInputClasses} />
                        <button onClick={() => {setShowCc(!showCc); setShowBcc(false);}} className="text-sm text-primary font-medium">Cc</button>
                    </div>
                    {showCc && (
                        <div className={addressFieldWrapperClasses}>
                            <label htmlFor="cc-field" className="text-sm text-gray-500 dark:text-gray-400">Cc</label>
                            <input id="cc-field" type="text" value={cc} onChange={(e) => handleFieldChange(e, setCc, 'cc')} className={commonInputClasses} />
                             <button onClick={() => setShowBcc(!showBcc)} className="text-sm text-primary font-medium">Bcc</button>
                        </div>
                    )}
                     {showBcc && (
                        <div className={addressFieldWrapperClasses}>
                            <label htmlFor="bcc-field" className="text-sm text-gray-500 dark:text-gray-400">Bcc</label>
                            <input id="bcc-field" type="text" value={bcc} onChange={(e) => handleFieldChange(e, setBcc, 'bcc')} className={commonInputClasses} />
                        </div>
                    )}
                    <div className={addressFieldWrapperClasses}>
                        <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className={commonInputClasses} />
                    </div>
                </div>

                {/* Autocomplete Suggestions */}
                {autocompleteSuggestions.length > 0 && (
                    <div className="absolute left-16 top-10 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {autocompleteSuggestions.map(s => (
                            <div key={s.id} onMouseDown={() => handleSuggestionClick(s)} className="px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3">
                                {s.type === 'contact' ? <Avatar name={s.name} className="w-8 h-8 text-xs" /> : <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center"><UsersIcon className="w-5 h-5"/></div>}
                                <div>
                                    <p className="font-semibold text-on-surface dark:text-dark-on-surface">{s.name}</p>
                                    {s.type === 'contact' && <p className="text-xs text-gray-500">{s.email}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex-grow p-4">
                    <div
                        ref={contentRef}
                        onInput={handleBodyChange}
                        contentEditable="true"
                        className="w-full h-full text-sm resize-none focus:outline-none"
                        suppressContentEditableWarning={true}
                    />
                </div>
                {(restoredAttachments.length > 0 || attachments.length > 0) && (
                    <div className="px-4 py-3 flex flex-wrap gap-3 border-t border-outline dark:border-dark-outline">
                        {restoredAttachments.map((att, index) => (
                             <AttachmentTile
                                key={`restored-${index}`}
                                attachment={att}
                                previewUrl={att.contentType.startsWith('image/') ? `data:${att.contentType};base64,${att.content}` : undefined}
                                onRemove={() => setRestoredAttachments(prev => prev.filter((_, i) => i !== index))}
                            />
                        ))}
                        {attachments.map((file, index) => (
                            <AttachmentTile
                                key={index}
                                attachment={{fileName: file.name, fileSize: file.size, contentType: file.type}}
                                previewUrl={attachmentPreviewUrls.get(file.name)}
                                onRemove={() => removeAttachment(index)}
                            />
                        ))}
                    </div>
                )}
            </div>
            <footer className="flex items-center justify-between p-2 border-t border-outline dark:border-dark-outline">
                <div className="flex items-center">
                    <div className="relative inline-flex">
                        <button onClick={() => handleSend()} className="flex items-center gap-2 pl-4 pr-3 py-2 text-sm font-medium text-white bg-primary rounded-l-md hover:bg-primary-hover">
                            Send
                        </button>
                        <button onClick={() => setIsSchedulePopoverOpen(p => !p)} className="px-2 py-2 text-sm font-medium text-white bg-primary rounded-r-md hover:bg-primary-hover border-l border-blue-400 dark:border-blue-700">
                            <ChevronDownIcon className="w-5 h-5"/>
                        </button>
                         {isSchedulePopoverOpen && <ScheduleSendPopover onSchedule={(date) => handleSend(date)} onClose={() => setIsSchedulePopoverOpen(false)} />}
                    </div>
                    <div className="ml-2">
                        <RichTextToolbar onInsertImage={() => imageInputRef.current?.click()} />
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Attach files">
                        <PaperClipIcon className="w-5 h-5"/>
                    </button>
                </div>
                <button onClick={handleDeleteAndClose} className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Discard draft">
                    <TrashIcon className="w-5 h-5"/>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
                <input type="file" ref={imageInputRef} onChange={handleImageFileSelect} className="hidden" accept="image/*" />
            </footer>
        </div>
    );
};

export default ComposeModal;
