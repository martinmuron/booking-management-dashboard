"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderNavButton = (item: NavItem, { isMobile = false }: { isMobile?: boolean } = {}) => {
    const isActive = item.key === activeRoute;
    const emphasizeOutline = item.emphasis === 'outline';

    const variant = isActive || emphasizeOutline ? 'outline' : 'ghost';
    const className = cn(
      isActive || emphasizeOutline
        ? 'border-black text-black hover:bg-black hover:text-white'
        : 'text-black hover:bg-gray-100',
      isMobile && 'justify-start w-full'
    );

    return (
      <Button
        key={item.key}
        asChild
        variant={variant}
        size="sm"
        className={className}
        onClick={() => {
          if (isMobile) {
            setIsMobileMenuOpen(false);
          }
        }}
      >
        <Link href={item.href}>{item.label}</Link>
      </Button>
    );
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
            <Logo size="lg" />
          </Link>

          <nav className="hidden md:flex items-center gap-3">
            {navItems.map(item => renderNavButton(item))}
          </nav>

          <Button
            className="md:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'md:hidden border-t border-gray-200 bg-white transition-all duration-200 ease-out',
          isMobileMenuOpen ? 'max-h-[320px] opacity-100' : 'pointer-events-none max-h-0 overflow-hidden opacity-0'
        )}
      >
        <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
          {navItems.map(item => renderNavButton(item, { isMobile: true }))}
        </nav>
      </div>
    </header>
  );
}
