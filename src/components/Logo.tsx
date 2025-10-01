import Link from 'next/link';

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
    <Link href="/" className={`font-bold text-black ${sizeClasses[size]} ${className} hover:opacity-80 transition-opacity cursor-pointer`}>
      <span>Nick & Jenny</span>
      <span className="block text-xs font-normal text-gray-600 -mt-1">
        Your Prague Host
      </span>
    </Link>
  );
}