import './globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import NotificationProvider from '../components/NotificationProvider';
import GpsBroadcaster from '../components/GpsBroadcaster';
import InstallProvider from '../components/InstallContext';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata = {
  title: 'atyors — At Your Service',
  description: 'Curbside trash barrel services — we put them out and bring them back in, so you don\'t have to.',
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'atyors',
    'facebook-domain-verification': 'nhvycasjgrhas7ar2lssg91g0yctgy',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1b70f5',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="text-gray-900 antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg">
          Skip to main content
        </a>
        <InstallProvider>
          <NotificationProvider>
            <GpsBroadcaster>{children}</GpsBroadcaster>
          </NotificationProvider>
        </InstallProvider>
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
