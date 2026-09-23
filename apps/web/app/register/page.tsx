'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const router = useRouter();
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); try { await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }); router.push('/dashboard'); } catch (err) { setError(err instanceof Error ? err.message : 'Registration failed'); } }
  return <main className="grid-bg flex min-h-screen items-center justify-center p-6"><form onSubmit={submit} className="card w-full max-w-md p-7">
    <h1 className="text-2xl font-semibold">Create account</h1>
    <label className="mt-6 block text-sm">Name<input value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" /></label>
    <label className="mt-4 block text-sm">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" required /></label>
    <label className="mt-4 block text-sm">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" minLength={8} required /></label>
    {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    <button className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-medium text-black">Register</button>
    <Link href="/login" className="mt-4 block text-center text-sm text-cyan-300">Already have an account?</Link>
  </form></main>;
}
