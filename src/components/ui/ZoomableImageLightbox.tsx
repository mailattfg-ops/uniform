'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2 
} from 'lucide-react';

export interface ZoomableImageLightboxProps {
  images: string[] | any;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function parseImageGallery(raw: any): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .flatMap(item => parseImageGallery(item))
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0 && x !== '—');
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '—') return [];

    // If JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parseImageGallery(parsed);
      } catch (_) {}
    }

    // If it's a data URL (e.g. data:image/png;base64,...), blob, or standard URL/path
    if (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/')
    ) {
      return [trimmed];
    }

    // If it has base64 data, never split by comma
    if (trimmed.includes(';base64,')) {
      return [trimmed];
    }

    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }

  return [];
}

export const ZoomableImageLightbox: React.FC<ZoomableImageLightboxProps> = ({
  images = [],
  initialIndex = 0,
  isOpen,
  onClose,
  title
}) => {
  const validImages = useMemo(() => parseImageGallery(images), [images]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Sync initialIndex when lightbox opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      const idx = Math.max(0, Math.min(initialIndex, validImages.length - 1));
      setCurrentIndex(idx);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, validImages.length]);

  const resetZoomAndPan = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
    resetZoomAndPan();
  }, [validImages.length, resetZoomAndPan]);

  const handlePrev = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : validImages.length - 1));
    resetZoomAndPan();
  }, [validImages.length, resetZoomAndPan]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(3.5, Math.round((prev + 0.35) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const nextZoom = Math.max(1, Math.round((prev - 0.35) * 100) / 100);
      if (nextZoom === 1) setPan({ x: 0, y: 0 });
      return nextZoom;
    });
  };

  const handleToggleZoom = () => {
    if (zoom > 1) {
      resetZoomAndPan();
    } else {
      setZoom(2);
      setPan({ x: 0, y: 0 });
    }
  };

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoomAndPan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, resetZoomAndPan]);

  // Non-passive mouse wheel zoom
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !isOpen) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => {
        const delta = e.deltaY < 0 ? 0.25 : -0.25;
        const nextZoom = Math.min(3.5, Math.max(1, Math.round((prev + delta) * 100) / 100));
        if (nextZoom === 1) setPan({ x: 0, y: 0 });
        return nextZoom;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen]);

  // Drag panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || validImages.length === 0) return null;

  const currentImage = validImages[currentIndex] || validImages[0];

  return (
    <div 
      className="fixed inset-0 z-70 bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Controls Bar */}
      <div 
        className="w-full max-w-5xl flex items-center justify-between gap-3 text-white z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-3 py-1 bg-white/15 rounded-xl text-xs font-mono font-bold tracking-wider backdrop-blur-xs">
            {currentIndex + 1} / {validImages.length}
          </span>
          {title && (
            <p className="text-xs sm:text-sm font-bold text-white/90 truncate max-w-xs sm:max-w-md">
              {title}
            </p>
          )}
        </div>

        {/* Floating Zoom Controls Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/15">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-1.5 rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition text-white cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut size={16} />
          </button>
          
          <button
            type="button"
            onClick={resetZoomAndPan}
            className="px-2 py-0.5 rounded-lg hover:bg-white/20 transition text-[11px] font-mono font-bold text-white cursor-pointer"
            title="Reset to 100% (0)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3.5}
            className="p-1.5 rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition text-white cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn size={16} />
          </button>

          {zoom > 1 && (
            <button
              type="button"
              onClick={resetZoomAndPan}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white transition cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
          title="Close Lightbox (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Image Stage */}
      <div 
        ref={stageRef}
        className="relative w-full flex-1 max-h-[78vh] flex items-center justify-center overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Previous Button */}
        {validImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 z-20 p-3 sm:p-3.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition-all shadow-xl cursor-pointer hover:scale-105 active:scale-95"
            title="Previous Image (Left Arrow)"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* The Image with Transform */}
        <div 
          className="max-w-full max-h-full flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
          onDoubleClick={handleToggleZoom}
        >
          <img
            src={currentImage}
            alt={title || `Image ${currentIndex + 1}`}
            className="max-h-[72vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Next Button */}
        {validImages.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-6 z-20 p-3 sm:p-3.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition-all shadow-xl cursor-pointer hover:scale-105 active:scale-95"
            title="Next Image (Right Arrow)"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {validImages.length > 1 && (
        <div 
          className="flex items-center gap-2 overflow-x-auto max-w-3xl px-2 py-1 bg-black/40 backdrop-blur-sm rounded-2xl z-10"
          onClick={e => e.stopPropagation()}
        >
          {validImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                resetZoomAndPan();
              }}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                currentIndex === idx
                  ? 'border-[#C82A2B] ring-2 ring-[#C82A2B]/40 scale-105 shadow-md'
                  : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/50'
              }`}
            >
              <img 
                src={imgUrl} 
                alt={`Thumbnail ${idx + 1}`} 
                className="w-full h-full object-cover" 
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
