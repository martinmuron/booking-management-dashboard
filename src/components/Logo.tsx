interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`font-bold text-black ${sizeClasses[size]} ${className}`}>
      <span>Nick & Jenny</span>
      <span className="block text-xs font-normal text-gray-600 -mt-1">
        Your Prague Host
      </span>
    </div>
  );
}