'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    {
      label: 'About',
      href: '/about',
    },
    {
      label: 'Developers',
      href: '/developers',
    },
    {
      label: 'Contact',
      href: '/contact',
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900/80 bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
            <span className="text-sm font-black text-white">
              C
            </span>
          </div>

          <span className="text-sm font-bold tracking-tight text-white">
            CodePilot
            <span className="text-zinc-500"> AI</span>
          </span>
        </Link>

        {/* Center navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'rounded-lg px-4 py-2 text-sm transition',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-950 hover:text-white',
                ].join(' ')}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:text-white sm:block"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold !text-black transition hover:bg-zinc-200"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

