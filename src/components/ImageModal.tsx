"use client";

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Image {
  id: number;
  url: string;
  caption?: string;
}

interface ImageModalProps {
  images: Image[];
  isOpen: boolean;
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageModal({ images, isOpen, currentIndex, onClose, onNavigate }: ImageModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < images.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || !images[currentIndex]) return null;

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-60 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
        aria-label="Close modal"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 z-60 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === images.length - 1}
            className="absolute right-4 z-60 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-60 px-4 py-2 rounded-full bg-black bg-opacity-50 text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Main content area */}
      <div 
        className="w-full h-full flex items-center justify-center p-8 cursor-zoom-out"
        onClick={onClose}
      >
        <div className="relative max-w-7xl max-h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage.url}
            alt={currentImage.caption || `Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain cursor-zoom-out"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />

          {/* Image caption */}
          {currentImage.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
              <p className="text-white text-center text-lg">{currentImage.caption}</p>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip for multiple images */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-60">
          <div className="flex gap-2 max-w-screen-lg overflow-x-auto px-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => onNavigate(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex 
                    ? 'border-white shadow-lg' 
                    : 'border-transparent opacity-60 hover:opacity-80'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}