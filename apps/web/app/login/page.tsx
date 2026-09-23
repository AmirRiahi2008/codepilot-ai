'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@codepilot.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    try { await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); router.push('/dashboard'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
  }

  return <main className="grid-bg flex min-h-screen items-center justify-center p-6"><form onSubmit={submit} className="card w-full max-w-md p-7">
    <h1 className="text-2xl font-semibold">Log in</h1><p className="muted mt-2 text-sm">Use the seeded demo account locally or your own account.</p>
    <label className="mt-6 block text-sm">Email<input value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300" /></label>
    <label className="mt-4 block text-sm">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300" /></label>
    {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    <button className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-medium text-black">Log in</button>
    <Link href="/register" className="mt-4 block text-center text-sm text-cyan-300">Create an account</Link>
  </form></main>;
}
