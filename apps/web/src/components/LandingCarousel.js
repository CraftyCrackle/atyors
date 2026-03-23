'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';

export default function LandingCarousel() {
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch('/api/v1/carousel')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.images.length > 0) {
          setImages(data.data.images);
          setLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  const go = useCallback((dir) => {
    setCurrent((c) => (c + dir + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    timerRef.current = setInterval(() => go(1), 5000);
    return () => clearInterval(timerRef.current);
  }, [images.length, go]);

  if (!loaded || images.length === 0) return null;

  const img = images[current];

  return (
    <section className="relative overflow-hidden bg-gray-900" aria-label="Photo gallery">
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        {images.map((item, idx) => (
          <div
            key={item._id}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={idx !== current}
          >
            <Image
              src={item.url}
              alt={item.caption || 'atyors service photo'}
              fill
              sizes="100vw"
              className="object-cover"
              priority={idx === 0}
              unoptimized
            />
          </div>
        ))}

        {/* dark gradient at bottom for caption readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

        {img.caption && (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[90%] text-center text-sm font-medium text-white drop-shadow">
            {img.caption}
          </p>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={() => { clearInterval(timerRef.current); go(-1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
              aria-label="Previous photo"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => { clearInterval(timerRef.current); go(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
              aria-label="Next photo"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Carousel slides">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { clearInterval(timerRef.current); setCurrent(idx); }}
              role="tab"
              aria-selected={idx === current}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
