'use client';

import { useState, useCallback, useRef } from 'react';

export default function PhotoViewer({ src, alt, className, children }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDist = useRef(null);
  const lastTouch = useRef(null);
  const dragging = useRef(false);

  const reset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    lastDist.current = null;
    lastTouch.current = null;
    dragging.current = false;
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  function handleWheel(e) {
    e.preventDefault();
    setScale((s) => Math.min(5, Math.max(1, s - e.deltaY * 0.003)));
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      lastDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    } else if (e.touches.length === 1 && scale > 1) {
      dragging.current = true;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && lastDist.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = dist / lastDist.current;
      setScale((s) => Math.min(5, Math.max(1, s * ratio)));
      lastDist.current = dist;
    } else if (e.touches.length === 1 && dragging.current && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function handleTouchEnd() {
    lastDist.current = null;
    dragging.current = false;
    lastTouch.current = null;
    if (scale <= 1) setTranslate({ x: 0, y: 0 });
  }

  function handleDoubleClick() {
    if (scale > 1) {
      reset();
    } else {
      setScale(2.5);
    }
  }

  return (
    <>
      <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(true); } }}
        className={`cursor-zoom-in block overflow-hidden ${className || ''}`}>
        {children || <img src={src} alt={alt || ''} className="block h-full w-full object-cover" draggable={false} />}
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button onClick={close}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/20"
            style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {scale <= 1 && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/50">Pinch or double-tap to zoom</p>
          )}

          <img
            src={src}
            alt={alt || ''}
            onDoubleClick={handleDoubleClick}
            className="max-h-[90vh] max-w-[95vw] select-none rounded-lg object-contain transition-transform"
            style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)` }}
            draggable={false}
          />
        </div>
      )}
    </>
  );
}
