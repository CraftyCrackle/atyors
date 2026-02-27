'use client';

import { useState } from 'react';
import { api } from '../services/api';

function StarIcon({ filled, half }) {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

export default function ReviewModal({ bookingId, revieweeName, onClose, onSubmitted, dark = false }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) { setError('Please select a rating'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/bookings/${bookingId}/review`, { rating, comment: comment.trim() || undefined });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    }
    setSubmitting(false);
  }

  const bg = dark ? 'bg-gray-800' : 'bg-white';
  const text = dark ? 'text-white' : 'text-gray-900';
  const subtext = dark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = dark ? 'bg-gray-900 text-white placeholder-gray-500 border-gray-700' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className={`relative w-full max-w-md rounded-t-2xl sm:rounded-2xl ${bg} p-6 animate-slide-up`} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />

        <h2 className={`text-center text-lg font-bold ${text}`}>Rate {revieweeName}</h2>
        <p className={`mt-1 text-center text-sm ${subtext}`}>How was your experience?</p>

        <form onSubmit={handleSubmit}>
          {/* Stars */}
          <div className="mt-6 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className={`transition-transform hover:scale-110 ${(hover || rating) >= star ? 'text-yellow-400' : dark ? 'text-gray-600' : 'text-gray-300'}`}
              >
                <StarIcon filled={(hover || rating) >= star} />
              </button>
            ))}
          </div>
          <p className={`mt-2 text-center text-sm font-medium ${text}`}>
            {rating === 0 ? 'Tap a star' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </p>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment (optional)..."
            maxLength={500}
            rows={3}
            className={`mt-4 w-full resize-none rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 ${inputBg}`}
          />

          {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose}
              className={`flex-1 rounded-xl py-3 text-sm font-medium ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || rating === 0}
              className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
