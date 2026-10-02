'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

interface SlideImage {
  id: string;
  url: string;
  alt: string;
}

interface SlideGalleryProps {
  images: SlideImage[];
}

export default function SlideGallery({ images }: SlideGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[500px] bg-slate-800 rounded-2xl flex items-center justify-center animate-pulse">
        <p className="text-slate-400">No images available</p>
      </div>
    );
  }

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${getBackendUrl()}${url}`;
  };

  return (
    <div className="relative w-full h-[520px] md:h-[600px] group overflow-hidden rounded-3xl shadow-2xl border border-white/10 bg-slate-950">
      {/* Ambient Blurred Backdrop to smoothly fill widescreen/portrait borders without cropping */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Image
          src={getImageUrl(images[currentIndex].url)}
          alt=""
          fill
          aria-hidden="true"
          className="object-cover blur-3xl opacity-35 scale-110"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl" />
      </div>

      {/* Main Full Uncropped Photo */}
      <div className="relative w-full h-full flex items-center justify-center p-2 md:p-4">
        <Image
          src={getImageUrl(images[currentIndex].url)}
          alt={images[currentIndex].alt}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-contain drop-shadow-2xl transition-all duration-700 select-none"
        />
        {/* Bottom Vignette for text contrast */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none" />
      </div>

      {/* Description Overlay */}
      <div className="absolute bottom-6 left-6 md:left-8 z-10 max-w-lg">
        <span className="px-3 py-1 bg-sky-500/20 border border-sky-400/30 text-sky-400 text-xs font-semibold uppercase tracking-wider rounded-full backdrop-blur-md">
          Property View
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-white mt-2 font-display drop-shadow">
          {images[currentIndex].alt}
        </h3>
      </div>

      {/* Nav Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-sky-500/80 border border-white/10 hover:border-sky-400/40 text-white rounded-full transition duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-md"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-sky-500/80 border border-white/10 hover:border-sky-400/40 text-white rounded-full transition duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-md"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots navigation */}
      <div className="absolute bottom-6 right-8 z-20 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-8 bg-sky-400' : 'w-2.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
