'use client';

function HouseIcon({ className = 'h-8 w-8' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-brand-600" />
      <path
        d="M20 10l-10 8h3v10h5v-6h4v6h5V18h3L20 10z"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({ size = 'md', variant = 'full', dark = false }) {
  const sizes = {
    sm: { icon: 'h-7 w-7', text: 'text-lg', tag: 'text-[10px]' },
    md: { icon: 'h-9 w-9', text: 'text-2xl', tag: 'text-xs' },
    lg: { icon: 'h-14 w-14', text: 'text-4xl', tag: 'text-sm' },
    xl: { icon: 'h-20 w-20', text: 'text-5xl', tag: 'text-base' },
  };

  const s = sizes[size] || sizes.md;

  if (variant === 'icon') {
    return <HouseIcon className={s.icon} />;
  }

  return (
    <div className="flex items-center gap-2.5">
      <HouseIcon className={s.icon} />
      <div className="flex flex-col leading-tight">
        <span className={`${s.text} font-extrabold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
          atyors<span className="text-brand-600">.com</span>
        </span>
        {variant === 'full' && (
          <span className={`${s.tag} font-medium tracking-widest uppercase ${dark ? 'text-gray-400' : 'text-gray-400'}`}>
            At Your Service
          </span>
        )}
      </div>
    </div>
  );
}

export { HouseIcon };
