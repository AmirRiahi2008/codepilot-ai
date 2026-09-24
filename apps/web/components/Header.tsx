'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '../lib/api';

export function Header() {
const pathname = usePathname();
const router = useRouter();

const [authenticated, setAuthenticated] = useState(false);
const [checkingAuth, setCheckingAuth] = useState(true);
const [loggingOut, setLoggingOut] = useState(false);
const [mobileOpen, setMobileOpen] = useState(false);

useEffect(() => {
let mounted = true;


async function checkSession() {
  try {
    await api('/auth/me');

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

checkSession();

return () => {
  mounted = false;
};


}, [pathname]);

useEffect(() => {
setMobileOpen(false);
}, [pathname]);

useEffect(() => {
if (!mobileOpen) return;


const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    setMobileOpen(false);
  }
};

document.addEventListener('keydown', handleEscape);

return () => {
  document.removeEventListener('keydown', handleEscape);
};

}, [mobileOpen]);

async function handleLogout() {
if (loggingOut) return;


try {
  setLoggingOut(true);

  await api('/auth/logout', {
    method: 'POST',
  });

  setAuthenticated(false);
  setMobileOpen(false);

  router.push('/');
  router.refresh();
} catch {
  setLoggingOut(false);
}


}

const links = [
{
label: 'About Us',
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

function isActive(href: string) {
if (href === '/dashboard') {
return pathname.startsWith('/dashboard');
}


return pathname === href;


}

return ( <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-xl"> <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
{/* Logo */}
<Link
href={authenticated ? '/dashboard' : '/'}
className="group flex shrink-0 items-center gap-2"
onClick={() => setMobileOpen(false)}
> <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition duration-300 group-hover:border-cyan-300/40 group-hover:bg-cyan-300/[0.05]"> <span className="text-sm font-bold text-cyan-300">
C </span> </div>

```
      <span className="text-sm font-semibold tracking-tight text-white sm:text-base">
        CodePilot
        <span className="text-slate-500"> AI</span>
      </span>
    </Link>

    {/* Desktop Navigation */}
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={[
            'rounded-lg px-4 py-2 text-sm transition-all duration-200',
            isActive(link.href)
              ? 'bg-white/[0.07] text-white'
              : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
          ].join(' ')}
        >
          {link.label}
        </Link>
      ))}

      {!checkingAuth && authenticated && (
        <Link
          href="/dashboard"
          className={[
            'rounded-lg px-4 py-2 text-sm transition-all duration-200',
            isActive('/dashboard')
              ? 'bg-white/[0.07] text-white'
              : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
          ].join(' ')}
        >
          Dashboard
        </Link>
      )}
    </nav>

    {/* Desktop Actions */}
    <div className="hidden items-center gap-2 md:flex">
      {checkingAuth ? (
        <div className="h-9 w-24 animate-pulse rounded-lg bg-white/[0.05]" />
      ) : authenticated ? (
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      ) : (
        <>
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition hover:text-white"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-slate-200"
          >
            Get Started
          </Link>
        </>
      )}
    </div>

    {/* Mobile Menu Button */}
    <button
      type="button"
      aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={mobileOpen}
      onClick={() => setMobileOpen((current) => !current)}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-white md:hidden"
    >
      <span className="relative flex h-5 w-5 flex-col items-center justify-center">
        <span
          className={[
            'absolute h-[1.5px] w-5 bg-current transition-all duration-300',
            mobileOpen
              ? 'rotate-45'
              : '-translate-y-[6px]',
          ].join(' ')}
        />

        <span
          className={[
            'absolute h-[1.5px] w-5 bg-current transition-all duration-200',
            mobileOpen
              ? 'opacity-0'
              : 'opacity-100',
          ].join(' ')}
        />

        <span
          className={[
            'absolute h-[1.5px] w-5 bg-current transition-all duration-300',
            mobileOpen
              ? '-rotate-45'
              : 'translate-y-[6px]',
          ].join(' ')}
        />
      </span>
    </button>
  </div>

  {/* Mobile Navigation */}
  <div
    className={[
      'overflow-hidden border-t border-white/[0.05] transition-all duration-300 md:hidden',
      mobileOpen
        ? 'max-h-[520px] opacity-100'
        : 'max-h-0 opacity-0',
    ].join(' ')}
  >
    <div className="px-4 pb-5 pt-3 sm:px-6">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={[
              'flex items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-all duration-200',
              isActive(link.href)
                ? 'bg-white/[0.07] text-white'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
            ].join(' ')}
          >
            <span>{link.label}</span>

            <span className="text-slate-600">
              →
            </span>
          </Link>
        ))}

        {!checkingAuth && authenticated && (
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={[
              'flex items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-all duration-200',
              isActive('/dashboard')
                ? 'bg-white/[0.07] text-white'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
            ].join(' ')}
          >
            <span>Dashboard</span>

            <span className="text-slate-600">
              →
            </span>
          </Link>
        )}
      </nav>

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        {checkingAuth ? (
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/[0.05]" />
        ) : authenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-slate-200"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  </div>
</header>

);
}
