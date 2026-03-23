import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

export function createSocket(namespace, token) {
  const url = SOCKET_URL ? `${SOCKET_URL}${namespace}` : namespace;
  return io(url, {
    // Use a callback so every reconnection attempt fetches the current token from storage.
    // This ensures the socket stays authenticated after a silent token refresh.
    auth: (cb) => cb({ token: (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null) || token }),
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
}
