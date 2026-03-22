'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminGuard from '../../../components/AdminGuard';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import Logo from '../../../components/Logo';

export default function AdminCarouselPage() {
  const { logout } = useAuthStore();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const fileRef = useRef(null);

  async function load() {
    try {
      const res = await api.get('/carousel/all');
      setImages(res.data.images || []);
    } catch { }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) { setMsg('Please select an image.'); return; }
    setUploading(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      if (caption.trim()) fd.append('caption', caption.trim());
      await api.post('/carousel', fd, { multipart: true });
      setFile(null);
      setPreview(null);
      setCaption('');
      await load();
      setMsg('Image uploaded.');
    } catch (err) {
      setMsg(err.message || 'Upload failed.');
    }
    setUploading(false);
    setTimeout(() => setMsg(''), 4000);
  }

  async function toggleActive(img) {
    try {
      await api.patch(`/carousel/${img._id}`, { isActive: !img.isActive });
      await load();
    } catch (err) { alert(err.message); }
  }

  async function updateCaption(img, newCaption) {
    try {
      await api.patch(`/carousel/${img._id}`, { caption: newCaption });
      await load();
    } catch (err) { alert(err.message); }
  }

  async function deleteImage(img) {
    if (!confirm(`Delete this image? This cannot be undone.`)) return;
    try {
      await api.delete(`/carousel/${img._id}`);
      await load();
    } catch (err) { alert(err.message); }
  }

  // Drag-to-reorder helpers
  function onDragStart(id) { setDraggingId(id); }
  function onDragOver(e, id) { e.preventDefault(); if (id !== draggingId) setDragOver(id); }
  function onDrop(e, targetId) {
    e.preventDefault();
    setDragOver(null);
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return; }
    const from = images.findIndex((i) => i._id === draggingId);
    const to = images.findIndex((i) => i._id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const withOrder = reordered.map((img, idx) => ({ ...img, sortOrder: idx }));
    setImages(withOrder);
    setDraggingId(null);
    api.patch('/carousel/reorder', { order: withOrder.map((i) => ({ id: i._id, sortOrder: i.sortOrder })) }).catch(() => load());
  }

  return (
    <AdminGuard>
      <div className="flex min-h-[100dvh] flex-col bg-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-header-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </Link>
              <div className="flex items-center gap-2">
                <Logo size="sm" variant="wordmark" dark />
                <span className="text-xs text-gray-500">Carousel</span>
              </div>
            </div>
            <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
              Sign Out
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-20">
          <h1 className="text-xl font-bold text-white">Landing Page Carousel</h1>
          <p className="mt-1 text-sm text-gray-400">Upload photos to display in the carousel on the home page. Drag rows to reorder.</p>

          {/* Upload form */}
          <form onSubmit={handleUpload} className="mt-6 rounded-xl border border-gray-700 bg-gray-800 p-4">
            <p className="text-sm font-semibold text-white">Add a new photo</p>

            <label
              className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition ${dragOver && draggingId === null ? 'border-brand-500 bg-brand-900/10' : 'border-gray-600 hover:border-gray-500'}`}
              onDragOver={(e) => { e.preventDefault(); if (!draggingId) setDragOver('upload'); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                if (!draggingId) {
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) pickFile(dropped);
                }
              }}
            >
              {preview ? (
                <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-lg">
                  <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
                </div>
              ) : (
                <>
                  <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm0 0H6m9.75-4.5H6.75m12 0a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-400">Drop image here or <span className="text-brand-400 underline">browse</span></p>
                  <p className="mt-1 text-xs text-gray-600">JPEG, PNG, WebP · max 10 MB</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickFile(e.target.files[0])} />
            </label>

            {preview && (
              <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="mt-2 text-xs text-gray-500 hover:text-red-400">
                Remove image
              </button>
            )}

            <input
              type="text"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={120}
              className="mt-3 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
            />

            <div className="mt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={uploading || !file}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              {msg && <p className={`text-xs ${msg.includes('failed') || msg === 'Please select an image.' ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
            </div>
          </form>

          {/* Image list */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-400">
              {images.length} image{images.length !== 1 ? 's' : ''} · {images.filter((i) => i.isActive).length} visible
            </p>

            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading…</div>
            ) : images.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-700 py-12 text-center text-gray-500">
                No images yet. Upload one above.
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {images.map((img) => (
                  <CarouselRow
                    key={img._id}
                    img={img}
                    draggingId={draggingId}
                    dragOver={dragOver}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onToggle={toggleActive}
                    onCaptionSave={updateCaption}
                    onDelete={deleteImage}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}

function CarouselRow({ img, draggingId, dragOver, onDragStart, onDragOver, onDrop, onToggle, onCaptionSave, onDelete }) {
  const [editCaption, setEditCaption] = useState(img.caption || '');
  const [editing, setEditing] = useState(false);

  function saveCaption() {
    setEditing(false);
    if (editCaption.trim() !== (img.caption || '')) {
      onCaptionSave(img, editCaption.trim());
    }
  }

  const isDragging = draggingId === img._id;
  const isTarget = dragOver === img._id;

  return (
    <li
      draggable
      onDragStart={() => onDragStart(img._id)}
      onDragOver={(e) => onDragOver(e, img._id)}
      onDrop={(e) => onDrop(e, img._id)}
      onDragEnd={() => { }}
      className={`flex items-start gap-3 rounded-xl border bg-gray-800 p-3 transition select-none ${isDragging ? 'opacity-40' : ''} ${isTarget ? 'border-brand-500' : 'border-gray-700'}`}
    >
      {/* Drag handle */}
      <div className="mt-1 cursor-grab text-gray-600 active:cursor-grabbing">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </div>

      {/* Thumbnail */}
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-700">
        <Image src={img.url} alt={img.caption || 'carousel'} fill className="object-cover" unoptimized />
        {!img.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-[10px] font-semibold text-gray-300">Hidden</span>
          </div>
        )}
      </div>

      {/* Caption + actions */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              onBlur={saveCaption}
              onKeyDown={(e) => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') { setEditing(false); setEditCaption(img.caption || ''); } }}
              maxLength={120}
              className="flex-1 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="block w-full text-left text-sm text-gray-300 hover:text-white"
            title="Click to edit caption"
          >
            {img.caption || <span className="italic text-gray-600">No caption</span>}
          </button>
        )}
        <p className="mt-0.5 text-xs text-gray-600">Sort {img.sortOrder}</p>
      </div>

      {/* Toggle visible / delete */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onToggle(img)}
          title={img.isActive ? 'Hide from carousel' : 'Show in carousel'}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${img.isActive ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-gray-700 text-gray-500 hover:bg-green-500/20 hover:text-green-400'}`}
        >
          {img.isActive ? 'Visible' : 'Hidden'}
        </button>
        <button
          onClick={() => onDelete(img)}
          className="rounded p-1 text-gray-600 transition hover:text-red-400"
          title="Delete image"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </li>
  );
}
