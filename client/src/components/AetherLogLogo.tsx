import React from 'react';

interface AetherLogLogoProps {
  className?: string;
  size?: number;
  variant?: 'dark' | 'light';
  glow?: boolean;
}

export const AetherLogLogo: React.FC<AetherLogLogoProps> = ({
  className,
  size = 40,
  glow = false,
}) => {
  return (
    <img
      src="/logo.png"
      alt="AetherLog Logo"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        borderRadius: '8px',
        flexShrink: 0,
        ...(glow
          ? { filter: 'drop-shadow(0 0 12px rgba(0, 229, 160, 0.6))' }
          : {}),
      }}
    />
  );
};
