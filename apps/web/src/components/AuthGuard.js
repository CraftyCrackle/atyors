'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';

export default function AuthGuard({ children }) {
  const { user, loading, init } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const dest = pathname.startsWith('/servicer') ? '/servicer/login' : '/login';
      router.push(dest);
      return;
    }

    const role = user.role;
    const onServicer = pathname.startsWith('/servicer');
    const onAdmin = pathname.startsWith('/admin');

    if (role === 'servicer' && !onServicer && !onAdmin) {
      router.replace('/servicer/dashboard');
    } else if (['admin', 'superadmin'].includes(role) && !onAdmin) {
      router.replace('/admin/dashboard');
    } else if (!['servicer', 'admin', 'superadmin'].includes(role) && onServicer) {
      router.replace('/dashboard');
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen-safe items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  return children;
}
