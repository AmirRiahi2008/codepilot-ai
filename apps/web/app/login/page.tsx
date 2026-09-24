
'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed',
      );
      setLoading(false);
    }
  }

  return (
    <main className="grid-bg flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="card w-full max-w-md p-7"
      >
        <h1 className="text-2xl font-semibold">
          Log in
        </h1>

        <p className="muted mt-2 text-sm">
          Log in to your CodePilot account.
        </p>

        <label className="mt-6 block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300"
            required
            disabled={loading}
          />
        </label>

        <label className="mt-4 block text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300"
            required
            disabled={loading}
          />
        </label>

        {error && (
          <p className="mt-4 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Logging in...
            </>
          ) : (
            'Log in'
          )}
        </button>

        <Link
          href="/register"
          className="mt-4 block text-center text-sm text-cyan-300"
        >
          Create an account
        </Link>
      </form>
    </main>
  );
}

