
'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mb-8">
          <span className="text-sm font-medium text-zinc-500 tracking-[0.3em] uppercase">
            CodePilot AI
          </span>
        </div>

        <div className="text-[120px] md:text-[160px] font-black leading-none tracking-tighter text-white">
          401
        </div>

        <h1 className="mt-6 text-2xl md:text-4xl font-bold tracking-tight">
          Unauthorized Access
        </h1>

        <p className="mt-4 text-zinc-400 leading-7 max-w-md mx-auto">
          You need to sign in to access this page.
          Please log in to your CodePilot AI account and try again.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Sign in
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl border border-zinc-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
