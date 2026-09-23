import Link from 'next/link';

export default function Home() {
  return <main className="grid-bg min-h-screen">
    <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
      <div className="max-w-3xl">
        <div className="mb-5 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-sm text-cyan-200">Repository intelligence MVP</div>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">Turn a GitHub repository into a technical report.</h1>
        <p className="muted mt-6 max-w-2xl text-lg leading-8">CodePilot scans a repository without executing its code, identifies security, architecture, performance, quality and testing findings, and can enrich them with AI.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/register" className="rounded-xl bg-white px-5 py-3 font-medium text-black">Get started</Link>
          <Link href="/login" className="rounded-xl border border-white/15 px-5 py-3 font-medium">Log in</Link>
        </div>
      </div>
    </section>
  </main>;
}
