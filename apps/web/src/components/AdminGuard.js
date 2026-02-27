'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';

const ADMIN_ROLES = ['admin', 'superadmin'];

export default function AdminGuard({ children }) {
  const { user, loading, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !ADMIN_ROLES.includes(user.role)) router.push('/dashboard');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen-safe items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || !ADMIN_ROLES.includes(user.role)) return null;
  return children;
}
