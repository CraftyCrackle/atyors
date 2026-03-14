'use client';

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/us/app/atyors/id6760164528';

export function getAppStoreUrl() {
  return APP_STORE_URL;
}

export default function AppStoreBadge({ className = '', height = 54 }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block transition active:scale-[0.97] ${className}`}
      aria-label="Download on the App Store"
    >
      <svg
        viewBox="0 0 120 40"
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Download on the App Store"
      >
        <rect width="120" height="40" rx="6" fill="#000" />
        <rect x="0.5" y="0.5" width="119" height="39" rx="5.5" stroke="#a6a6a6" strokeWidth="1" fill="none" />
        <text x="40.5" y="12.5" fill="#fff" fontSize="5" fontFamily="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" fontWeight="400" letterSpacing="0.02em">Download on the</text>
        <text x="40.5" y="26" fill="#fff" fontSize="11" fontFamily="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" fontWeight="600" letterSpacing="-0.01em">App Store</text>
        <g transform="translate(9, 6) scale(0.56)">
          <path
            d="M24.769 20.3a5.888 5.888 0 012.8-4.947 6.037 6.037 0 00-4.759-2.573c-2-.21-3.95 1.2-4.975 1.2-1.049 0-2.626-1.178-4.322-1.144a6.37 6.37 0 00-5.363 3.268c-2.318 4.01-.591 9.9 1.634 13.145 1.112 1.586 2.41 3.355 4.105 3.293 1.66-.068 2.282-1.058 4.288-1.058 1.983 0 2.57 1.058 4.3 1.022 1.78-.03 2.9-1.594 3.976-3.194a13.213 13.213 0 001.812-3.685 5.69 5.69 0 01-3.496-5.327z"
            fill="#fff"
          />
          <path
            d="M21.514 10.633A5.8 5.8 0 0022.84 6.5a5.9 5.9 0 00-3.819 1.977 5.516 5.516 0 00-1.375 4A4.877 4.877 0 0021.514 10.633z"
            fill="#fff"
          />
        </g>
      </svg>
    </a>
  );
}
