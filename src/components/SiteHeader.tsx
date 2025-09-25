"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

type SiteHeaderProps = {
  activeRoute?: 'home' | 'about' | 'contact' | 'admin';
};

type NavItem = {
  key: SiteHeaderProps['activeRoute'];
  label: string;
  href: string;
  emphasis?: 'default' | 'outline';
};

const navItems: NavItem[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'about', label: 'About Us', href: '/about' },
  { key: 'contact', label: 'Contact', href: '/contact' },
  { key: 'admin', label: 'Admin', href: '/admin', emphasis: 'outline' },
];

export function SiteHeader({ activeRoute }: SiteHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="lg" />
          </Link>
          <div className="flex items-center gap-3">
            {navItems.map(item => {
              const isActive = item.key === activeRoute;
              const emphasizeOutline = item.emphasis === 'outline';

              return (
                <Button
                  key={item.key}
                  asChild
                  variant={isActive || emphasizeOutline ? 'outline' : 'ghost'}
                  size="sm"
                  className={
                    isActive
                      ? 'border-black text-black hover:bg-black hover:text-white'
                      : emphasizeOutline
                        ? 'border-black text-black hover:bg-black hover:text-white'
                        : 'text-black hover:bg-gray-100'
                  }
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
