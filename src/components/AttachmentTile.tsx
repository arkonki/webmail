import React from 'react';
import { Attachment } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { DocumentPdfIcon } from './icons/DocumentPdfIcon';
import { DocumentChartBarIcon } from './icons/DocumentChartBarIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';

interface AttachmentTileProps {
  attachment: Attachment;
  previewUrl?: string | null;
  onRemove?: () => void;
  onDownload?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (contentType: string) => {
  if (contentType.includes('pdf')) return <DocumentPdfIcon className="w-8 h-8 text-red-500" />;
  if (contentType.includes('word')) return <DocumentTextIcon className="w-8 h-8 text-blue-500" />;
  if (contentType.includes('sheet') || contentType.includes('excel')) return <DocumentChartBarIcon className="w-8 h-8 text-green-500" />;
  return <DocumentIcon className="w-8 h-8 text-gray-500" />;
};

const AttachmentTile: React.FC<AttachmentTileProps> = ({ attachment, previewUrl, onRemove, onDownload, onClick }) => {
  const isImage = attachment.contentType.startsWith('image/');
  const tileContentClass = 'relative w-40 h-32 rounded-lg overflow-hidden group border border-outline dark:border-dark-outline';

  return (
    <div className={tileContentClass}>
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={attachment.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {getFileIcon(attachment.contentType)}
        </div>
      )}
      
      <div 
        onClick={onClick}
        className={`absolute inset-0 bg-black/40 flex flex-col justify-end p-2 text-white transition-opacity duration-200 ${onClick ? 'cursor-pointer' : ''} ${isImage ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
      >
        <p className="text-xs font-bold truncate">{attachment.fileName}</p>
        <p className="text-xs">{formatFileSize(attachment.fileSize)}</p>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/80"
          title="Remove attachment"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}

      {onDownload && (
         <button
          onClick={onDownload}
          className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Download"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default AttachmentTile;
