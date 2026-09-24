
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '../lib/api';

type AuthState = {
  authenticated: boolean;
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        await api<AuthState>('/auth/me');

        if (mounted) {
          setAuthenticated(true);
        }
      } catch {
        if (mounted) {
          setAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      await api('/auth/logout', {
        method: 'POST',
      });

      setAuthenticated(false);

      router.push('/');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

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
    <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#050505]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[73px] max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href={authenticated ? '/dashboard' : '/'}
          className="group flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[.03] transition group-hover:border-cyan-300/30">
            <span className="text-sm font-bold text-cyan-300">
              C
            </span>
          </div>

          <span className="text-sm font-semibold tracking-tight text-white">
            CodePilot
            <span className="text-slate-500"> AI</span>
          </span>
        </Link>

        {/* Desktop navigation */}
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
                    ? 'bg-white/[.06] text-white'
                    : 'text-slate-400 hover:bg-white/[.04] hover:text-white',
                ].join(' ')}
              >
                {link.label}
              </Link>
            );
          })}

          {!checkingAuth && authenticated && (
            <Link
              href="/dashboard"
              className={[
                'rounded-lg px-4 py-2 text-sm transition',
                pathname.startsWith('/dashboard')
                  ? 'bg-white/[.06] text-white'
                  : 'text-slate-400 hover:bg-white/[.04] hover:text-white',
              ].join(' ')}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {checkingAuth ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/[.05]" />
          ) : authenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-4 py-2 text-sm text-slate-400 transition hover:text-white sm:block"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="border-t border-white/[.05] px-6 py-3 md:hidden">
        <nav className="flex items-center gap-2 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'whitespace-nowrap rounded-lg px-3 py-2 text-sm transition',
                pathname === link.href
                  ? 'bg-white/[.06] text-white'
                  : 'text-slate-400 hover:bg-white/[.04] hover:text-white',
              ].join(' ')}
            >
              {link.label}
            </Link>
          ))}

          {!checkingAuth && authenticated && (
            <Link
              href="/dashboard"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/[.04] hover:text-white"
            >
              Dashboard
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

