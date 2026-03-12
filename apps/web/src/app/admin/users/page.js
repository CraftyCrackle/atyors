'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';

const ROLE_COLORS = {
  customer: 'bg-blue-100 text-blue-700',
  servicer: 'bg-green-100 text-green-700',
  admin: 'bg-purple-100 text-purple-700',
  superadmin: 'bg-red-100 text-red-700',
};

const ROLE_OPTIONS = ['customer', 'servicer', 'admin', 'superadmin'];

function UserCard({ u, expanded, onToggle, onDelete, onRoleChange, currentUserId }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const isSelf = u._id === currentUserId;
  const addrCount = u.addresses?.length || 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${u._id}`);
      onDelete(u._id);
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
    setDeleting(false);
    setConfirmDelete(false);
  }

  async function handleRoleChange(newRole) {
    setChangingRole(true);
    try {
      const res = await api.patch(`/admin/users/${u._id}/role`, { role: newRole });
      onRoleChange(u._id, res.data.user);
    } catch (err) {
      alert(err.message || 'Failed to update role');
    }
    setChangingRole(false);
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800">
      <button onClick={onToggle} className="flex w-full items-center gap-4 p-4 text-left">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${u.isActive === false ? 'bg-gray-600 text-gray-400' : 'bg-gray-700 text-brand-400'}`}>
          {u.firstName?.[0]}{u.lastName?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{u.firstName} {u.lastName}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[u.role] || 'bg-gray-600 text-gray-300'}`}>
              {u.role}
            </span>
            {u.isActive === false && (
              <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">Inactive</span>
            )}
          </div>
          <p className="text-sm text-gray-400">{u.email}</p>
        </div>
        <svg className={`h-4 w-4 shrink-0 text-gray-500 transition ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-700 px-4 pb-4 pt-3 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-900/50 p-3">
              <p className="text-xs font-medium uppercase text-gray-500">Contact</p>
              <p className="mt-1 text-sm text-gray-200">{u.email}</p>
              <p className="text-sm text-gray-200">{u.phone || 'No phone'}</p>
              <p className="mt-1 text-xs text-gray-500">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
              {u.lastLoginAt && <p className="text-xs text-gray-500">Last login {new Date(u.lastLoginAt).toLocaleDateString()}</p>}
            </div>
            <div className="rounded-lg bg-gray-900/50 p-3">
              <p className="text-xs font-medium uppercase text-gray-500">Addresses ({addrCount})</p>
              {addrCount === 0 ? (
                <p className="mt-1 text-xs text-gray-500">None saved</p>
              ) : (u.addresses || []).slice(0, 3).map(a => (
                <div key={a._id} className="mt-1">
                  <p className="text-sm text-gray-200">{a.street}{a.unit ? `, ${a.unit}` : ''}</p>
                  <p className="text-xs text-gray-500">{a.city}, {a.state} {a.zip}</p>
                </div>
              ))}
              {addrCount > 3 && <p className="mt-1 text-xs text-gray-500">+{addrCount - 3} more</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Role:</label>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={changingRole || isSelf}
                className="rounded-lg border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none disabled:opacity-50"
              >
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {isSelf && <span className="text-[10px] text-gray-500">(you)</span>}
            </div>

            <div className="flex-1" />

            {!isSelf && (
              confirmDelete ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2">
                  <p className="text-xs text-red-400">Delete this user permanently?</p>
                  <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700">
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleting} className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition">
                  Delete User
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser, logout } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const debounceRef = useRef(null);

  const loadUsers = useCallback(async (q, role, p) => {
    try {
      let url = `/admin/users?page=${p}&limit=20`;
      if (q) url += `&search=${encodeURIComponent(q)}`;
      if (role) url += `&role=${role}`;
      const res = await api.get(url);
      setUsers(res.data.users || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadUsers(search, roleFilter, page);
  }, [page, roleFilter, loadUsers]);

  function handleSearchChange(value) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setLoading(true);
      loadUsers(value, roleFilter, 1);
    }, 400);
  }

  function handleRoleFilterChange(role) {
    setRoleFilter(role);
    setPage(1);
  }

  function handleDelete(userId) {
    setUsers(prev => prev.filter(u => u._id !== userId));
    setTotal(t => t - 1);
  }

  function handleRoleChange(userId, updatedUser) {
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...updatedUser } : u));
  }

  return (
    <AdminGuard>
      <div className="flex min-h-[100dvh] min-h-[100vh] flex-col bg-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-sticky-safe">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Link href="/admin/dashboard" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="flex-1 font-semibold text-white">User Management</h1>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">{total} total</span>
            <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">Sign Out</button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {['', 'customer', 'servicer', 'admin', 'superadmin'].map(r => (
                <button
                  key={r}
                  onClick={() => handleRoleFilterChange(r)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${roleFilter === r ? 'bg-brand-600 text-white' : 'border border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-16 text-center text-gray-500">Loading...</div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                {search || roleFilter ? 'No users match your filters' : 'No users yet'}
              </div>
            ) : users.map(u => (
              <UserCard
                key={u._id}
                u={u}
                currentUserId={currentUser?._id}
                expanded={expandedId === u._id}
                onToggle={() => setExpandedId(expandedId === u._id ? null : u._id)}
                onDelete={handleDelete}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-30">
                Prev
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-30">
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
