type BrandLogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
};

const sizeClass = { sm: 'text-sm', md: 'text-[17px]', lg: 'text-xl' };

export function BrandLogo({ className = '', size = 'md', variant = 'light' }: BrandLogoProps) {
  const textColor = variant === 'dark' ? 'text-sidebar-text' : 'text-ink';
  return (
    <span className={`font-display font-semibold tracking-tight ${sizeClass[size]} ${textColor} ${className}`}>
      {PRODUCT_NAME}
    </span>
  );
}

export const PRODUCT_NAME = 'AI Money Scorecard';
