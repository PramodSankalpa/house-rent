'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${backendUrl}${url}`;
  };

  return (
    <div className="relative w-full h-[550px] group overflow-hidden rounded-3xl shadow-2xl border border-white/5">
      {/* Slide Image */}
      <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
        <Image
          src={getImageUrl(images[currentIndex].url)}
          alt={images[currentIndex].alt}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover transition-transform duration-10000 ease-linear transform group-hover:scale-105"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      </div>

      {/* Description Overlay */}
      <div className="absolute bottom-8 left-8 right-8 z-10">
        <span className="px-3 py-1 bg-sky-500/20 border border-sky-400/30 text-sky-400 text-xs uppercase tracking-wider rounded-full backdrop-blur-md">
          Property View
        </span>
        <h3 className="text-2xl md:text-3xl font-bold text-white mt-3 font-display">
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
