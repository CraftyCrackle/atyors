import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

export function createSocket(namespace, token) {
  const url = SOCKET_URL ? `${SOCKET_URL}${namespace}` : namespace;
  return io(url, {
    auth: { token },
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
}
