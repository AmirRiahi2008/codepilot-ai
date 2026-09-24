'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
  },
  {
    label: 'Repositories',
    href: '/dashboard/repositories',
  },
  {
    label: 'Audits',
    href: '/dashboard/audits',
  },
];

const publicItems: NavItem[] = [
  {
    label: 'About Us',
    href: '/about',
  },
  {
    label: 'Developers',
    href: '/developers',
  },
  {
    label: 'Contact Us',
    href: '/contact',
  },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col border-r border-zinc-900 bg-[#050505] px-5 py-6">
      <Link href="/dashboard" className="mb-10">
        <div className="text-xl font-bold tracking-tight text-white">
          CodePilot<span className="text-zinc-500"> AI</span>
        </div>

        <p className="mt-1 text-xs text-zinc-600">
          AI Code Intelligence
        </p>
      </Link>

      <div className="flex-1">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          Dashboard
        </p>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'block rounded-xl px-3 py-2.5 text-sm transition',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-950 hover:text-white',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          Company
        </p>

        <nav className="space-y-1">
          {publicItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'block rounded-xl px-3 py-2.5 text-sm transition',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-950 hover:text-white',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-zinc-900 pt-5">
        <Link
          href="/"
          className="block rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition hover:text-white"
        >
          ← Back to website
        </Link>
      </div>
    </aside>
  );
}

