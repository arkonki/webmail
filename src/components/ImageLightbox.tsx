import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { XMarkIcon } from './icons/XMarkIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface ImageLightboxProps {
  images: { src: string; alt: string }[];
  startIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, startIndex, onClose, onNavigate }) => {
  const currentIndex = startIndex;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, currentIndex, images.length]);

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <button className="absolute top-4 right-4 p-2 text-white bg-black/30 rounded-full hover:bg-black/60" onClick={onClose}>
        <XMarkIcon className="w-8 h-8" />
      </button>

      {images.length > 1 && currentIndex > 0 && (
        <button
          className="absolute left-4 p-3 text-white bg-black/30 rounded-full hover:bg-black/60"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
        >
          <ChevronLeftIcon className="w-8 h-8" />
        </button>
      )}
      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          className="absolute right-4 p-3 text-white bg-black/30 rounded-full hover:bg-black/60"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
        >
          <ChevronRightIcon className="w-8 h-8" />
        </button>
      )}

      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <img
          src={images[currentIndex].src}
          alt={images[currentIndex].alt}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
            {images[currentIndex].alt} ({currentIndex + 1} / {images.length})
        </div>
      </div>
    </div>
  );

  const portalNode = document.getElementById('modal-portal');
  return portalNode ? ReactDOM.createPortal(modalContent, portalNode) : modalContent;
};

export default ImageLightbox;
