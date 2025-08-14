

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ActionType, Email, SendEmailData, Attachment } from '../types';
import RichTextToolbar from './RichTextToolbar';
import AttachmentTile from './AttachmentTile';
import { PaperClipIcon } from './icons/PaperClipIcon';

interface InlineComposerProps {
    action: ActionType.REPLY | ActionType.FORWARD;
    emailToReplyTo: Email;
    onClose: () => void;
}

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

const InlineComposer: React.FC<InlineComposerProps> = ({ action, emailToReplyTo, onClose }) => {
    const { sendEmail, appSettings, user, saveDraft, deleteDraft } = useAppContext();
    
    const contentRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<Map<string, string>>(new Map());
    const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (user) {
            let finalBody = '';

            if (action === ActionType.REPLY) {
                setTo(emailToReplyTo.senderEmail);
                setSubject(emailToReplyTo.subject.startsWith('Re:') ? emailToReplyTo.subject : `Re: ${emailToReplyTo.subject}`);
                const formattedDate = new Date(emailToReplyTo.timestamp).toLocaleString();
                const replyContent = '<p><br></p>';
                const signature = appSettings.signature.isEnabled ? `<br><br>${appSettings.signature.body}` : '';
                finalBody = `${replyContent}${signature}<br><blockquote class="dark:border-gray-600">On ${formattedDate}, ${emailToReplyTo.senderName} &lt;${emailToReplyTo.senderEmail}&gt; wrote:<br>${emailToReplyTo.body}</blockquote>`;
            } else if (action === ActionType.FORWARD) {
                setTo('');
                setSubject(emailToReplyTo.subject.startsWith('Fwd:') ? emailToReplyTo.subject : `Fwd: ${emailToReplyTo.subject}`);
                const formattedDate = new Date(emailToReplyTo.timestamp).toLocaleString();
                const signature = appSettings.signature.isEnabled ? `<br><br>${appSettings.signature.body}` : '';
                finalBody = `<p><br></p>${signature}<br><blockquote class="dark:border-gray-600">--- Forwarded message ---<br><b>From:</b> ${emailToReplyTo.senderName} &lt;${emailToReplyTo.senderEmail}&gt;<br><b>Date:</b> ${formattedDate}<br><b>Subject:</b> ${emailToReplyTo.subject}<br><br>${emailToReplyTo.body}</blockquote>`;
            }

            setBody(finalBody);
            if (contentRef.current) {
                contentRef.current.innerHTML = finalBody;
                contentRef.current.focus();
            }
        }
    }, [action, emailToReplyTo, user, appSettings.signature]);

    const prepareAndSaveDraft = async () => {
        const attachmentData = await Promise.all(attachments.map(fileToAttachment));
        const draftData = { to, cc: '', bcc: '', subject, body, attachments: attachmentData };
        const newDraftId = await saveDraft(draftData, currentDraftId, emailToReplyTo.conversationId);
        return newDraftId;
    };

    // Auto-save logic
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(() => {
            if (isMounted && (contentRef.current && contentRef.current.innerText.trim() !== '' || attachments.length > 0)) {
               prepareAndSaveDraft().then(newId => {
                   if (isMounted) setCurrentDraftId(newId);
               });
            }
        }, 5000);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [body, to, subject, attachments, saveDraft, currentDraftId, emailToReplyTo.conversationId]);

    const handleClose = (shouldSave: boolean) => {
        if (shouldSave && (to || subject || (contentRef.current && contentRef.current.innerText.trim() !== '') || attachments.length > 0)) {
            prepareAndSaveDraft();
        } else if (currentDraftId) {
            deleteDraft(currentDraftId);
        }
        onClose();
    };

    const handleSend = async () => {
        if (!to) {
            alert('Please enter at least one recipient.');
            return;
        }
        const attachmentData = await Promise.all(attachments.map(fileToAttachment));
        const sendEmailData: SendEmailData = { to, cc: '', bcc: '', subject, body, attachments: attachmentData };
        sendEmail(sendEmailData, currentDraftId, emailToReplyTo.conversationId);
        onClose();
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

    return (
        <div className="border border-outline dark:border-dark-outline rounded-lg flex flex-col bg-surface dark:bg-dark-surface shadow-lg animate-fade-in">
            <header className="flex items-center justify-between px-4 py-2 bg-surface-container dark:bg-dark-surface-container rounded-t-lg text-on-surface-variant dark:text-dark-on-surface-variant text-sm font-medium">
                <p>Replying to {emailToReplyTo.senderName}</p>
                <button onClick={() => handleClose(true)} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><XMarkIcon className="w-4 h-4"/></button>
            </header>
            <div className="flex-grow flex flex-col">
                <div className="flex-shrink-0">
                    <div className="flex items-center gap-2 border-b border-outline dark:border-dark-outline px-4 py-2">
                        <label htmlFor="inline-to-field" className="text-sm text-gray-500 dark:text-gray-400">To</label>
                        <input id="inline-to-field" type="text" value={to} onChange={e => setTo(e.target.value)} className="w-full bg-transparent focus:outline-none text-sm text-on-surface dark:text-dark-on-surface" />
                    </div>
                     <div className="flex items-center gap-2 border-b border-outline dark:border-dark-outline px-4 py-2">
                        <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-transparent focus:outline-none text-sm text-on-surface dark:text-dark-on-surface" />
                    </div>
                </div>
                
                <div className="flex-grow p-4 min-h-48">
                    <div
                        ref={contentRef}
                        onInput={handleBodyChange}
                        contentEditable="true"
                        className="w-full h-full text-sm resize-none focus:outline-none"
                        suppressContentEditableWarning={true}
                    />
                </div>
                 {attachments.length > 0 && (
                    <div className="px-4 py-3 flex flex-wrap gap-3 border-t border-outline dark:border-dark-outline">
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
                    <button onClick={handleSend} className="flex items-center gap-2 pl-4 pr-3 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover">
                        Send
                    </button>
                    <div className="ml-2">
                        <RichTextToolbar onInsertImage={() => imageInputRef.current?.click()} />
                    </div>
                     <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Attach files">
                        <PaperClipIcon className="w-5 h-5"/>
                    </button>
                </div>
                <button onClick={() => handleClose(false)} className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Discard draft">
                    <TrashIcon className="w-5 h-5"/>
                </button>
                <input type="file" ref={imageInputRef} onChange={handleImageFileSelect} className="hidden" accept="image/*" />
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
            </footer>
        </div>
    );
};

export default InlineComposer;