'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'unreachable' }));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        atyors<span className="text-brand-600">.com</span>
      </h1>
      <p className="mt-3 text-lg text-gray-500">At Your Service</p>

      {health && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-mono">
          <p>API: <span className={health.status === 'ok' ? 'text-green-600' : 'text-red-500'}>{health.status}</span></p>
          {health.mongo && <p>MongoDB: <span className="text-green-600">{health.mongo}</span></p>}
          {health.environment && <p>Env: {health.environment}</p>}
        </div>
      )}
    </main>
  );
}
