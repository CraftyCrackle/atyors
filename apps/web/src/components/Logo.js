'use client';

const iconSizes = {
  sm: 28,
  md: 36,
  lg: 56,
  xl: 80,
};

const logoHeights = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

function HouseIcon({ className = 'h-8 w-8', size = 'md' }) {
  const px = iconSizes[size] || iconSizes.md;
  return (
    <img
      src="/icons/favicon-48x48.png"
      alt="atyors"
      width={px}
      height={px}
      className={className}
    />
  );
}

export default function Logo({ size = 'md', variant = 'full', dark = false }) {
  const iconCls = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  if (variant === 'icon') {
    return <HouseIcon className={iconCls[size] || iconCls.md} size={size} />;
  }

  const h = logoHeights[size] || logoHeights.md;
  return (
    <img
      src="/logo.png"
      alt="atyors — At Your Service"
      height={h}
      style={{ height: h, width: 'auto' }}
      className={dark ? 'brightness-0 invert' : ''}
    />
  );
}

export { HouseIcon };
