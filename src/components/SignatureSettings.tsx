import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import RichTextToolbar from './RichTextToolbar';

const SignatureSettings: React.FC = () => {
    const { appSettings, updateSignature } = useAppContext();
    const [isEnabled, setIsEnabled] = useState(appSettings.signature.isEnabled);
    const [body, setBody] = useState(appSettings.signature.body);
    const [editorMode, setEditorMode] = useState<'rich' | 'html'>('rich');
    const contentRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // This effect synchronizes the content of the rich text editor with the `body` state.
        // It's important for when we switch back from HTML view to Rich Text view.
        if (editorMode === 'rich' && contentRef.current && contentRef.current.innerHTML !== body) {
            contentRef.current.innerHTML = body;
        }
    }, [body, editorMode]);

    const handleSave = () => {
        updateSignature({ isEnabled, body });
    };

    const handleBodyChangeRich = (e: React.FormEvent<HTMLDivElement>) => {
        setBody(e.currentTarget.innerHTML);
    };

    const handleBodyChangeHtml = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setBody(e.target.value);
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

    const EditorToggleButton: React.FC<{mode: 'rich' | 'html', label: string}> = ({mode, label}) => (
        <button
            type="button"
            onClick={() => setEditorMode(mode)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                editorMode === mode
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-on-surface dark:text-dark-on-surface">Email Signature</h2>
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <label htmlFor="enable-signature" className="font-medium text-gray-700 dark:text-gray-300">Enable Signature</label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input
                            type="checkbox"
                            name="enable-signature"
                            id="enable-signature"
                            checked={isEnabled}
                            onChange={(e) => setIsEnabled(e.target.checked)}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-400 border-4 appearance-none cursor-pointer"
                        />
                        <label htmlFor="enable-signature" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-600 cursor-pointer"></label>
                    </div>
                </div>

                <div className={`transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="flex justify-between items-center mb-2">
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Signature Content</label>
                         <div className="flex items-center gap-1 p-0.5 bg-gray-200 dark:bg-gray-900/50 rounded-lg">
                             <EditorToggleButton mode="rich" label="Rich Text" />
                             <EditorToggleButton mode="html" label="HTML" />
                         </div>
                    </div>
                    
                    <div className="w-full border border-outline dark:border-dark-outline rounded-md bg-white dark:bg-dark-surface overflow-hidden">
                        {editorMode === 'rich' && (
                            <div className="p-1 border-b border-outline dark:border-dark-outline">
                                <RichTextToolbar onInsertImage={() => imageInputRef.current?.click()} />
                            </div>
                        )}
                        <div className="min-h-[150px] p-2">
                             {editorMode === 'rich' ? (
                                <div
                                    ref={contentRef}
                                    contentEditable={isEnabled}
                                    onInput={handleBodyChangeRich}
                                    className="w-full h-full text-sm resize-none focus:outline-none signature-editor"
                                />
                            ) : (
                                <textarea
                                    value={body}
                                    onChange={handleBodyChangeHtml}
                                    disabled={!isEnabled}
                                    className="w-full h-full min-h-[150px] text-sm resize-y focus:outline-none bg-transparent font-mono text-on-surface dark:text-dark-on-surface"
                                    placeholder="<p>Enter your <b>HTML</b> signature here.</p>"
                                />
                            )}
                        </div>
                    </div>
                     <input type="file" ref={imageInputRef} onChange={handleImageFileSelect} className="hidden" accept="image/*" />
                </div>

                <div className="flex justify-end">
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-hover">
                        Save Changes
                    </button>
                </div>
            </div>
            <style>{`
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #0B57D0; /* primary */
                    background-color: #0B57D0;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #0B57D0;
                }
            `}</style>
        </div>
    );
};

export default SignatureSettings;
