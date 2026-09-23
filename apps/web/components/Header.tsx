'use client';

import Link from 'next/link';
import { api } from '../lib/api';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();
  async function logout() { await api('/auth/logout', { method: 'POST' }); router.push('/login'); }
  return <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
    <Link href="/dashboard" className="font-semibold tracking-tight">CodePilot <span className="text-cyan-300">AI</span></Link>
    <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Logout</button>
  </header>;
}
