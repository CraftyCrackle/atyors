import './globals.css';
import NotificationProvider from '../components/NotificationProvider';
import GpsBroadcaster from '../components/GpsBroadcaster';
import InstallPrompt from '../components/InstallPrompt';

export const metadata = {
  title: 'atyors — At Your Service',
  description: 'Curbside trash barrel services — we put them out and bring them back in, so you don\'t have to.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'atyors' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1b70f5',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <NotificationProvider>
          <GpsBroadcaster>{children}</GpsBroadcaster>
          <InstallPrompt />
        </NotificationProvider>
      </body>
    </html>
  );
}
