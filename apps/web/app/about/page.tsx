'use client';

import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Back
        </button>

        <div className="mt-16 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-600">
            About CodePilot AI
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Understand your code.
            <br />
            <span className="text-zinc-500">
              Ship with confidence.
            </span>
          </h1>

          <p className="mt-8 text-lg leading-8 text-zinc-400">
            CodePilot AI is an AI-powered code intelligence platform
            designed to help developers understand, analyze, and
            improve their software projects.
          </p>

          <p className="mt-5 text-lg leading-8 text-zinc-400">
            Connect your GitHub repositories, run intelligent static
            analysis, discover potential issues, and get actionable
            insights without executing your source code.
          </p>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-3">
          {[
            {
              title: 'Analyze',
              text: 'Understand potential issues and technical risks in your codebase.',
            },
            {
              title: 'Understand',
              text: 'Turn complex repositories into useful engineering insights.',
            },
            {
              title: 'Improve',
              text: 'Use actionable feedback to continuously improve your projects.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6"
            >
              <h2 className="text-lg font-semibold">
                {item.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

