'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function DevelopersPage() {
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

        <div className="mt-16 grid items-start gap-12 md:grid-cols-[280px_1fr]">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950">
              <Image
                src="/amir-reza-riahi.jpg"
                alt="Amir Reza Riahi"
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-600">
              Developer
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">
              Amirreza Riahi
            </h1>

            <p className="mt-5 text-lg leading-8 text-zinc-400">
              Full-stack developer and creator of CodePilot AI,
              focused on backend engineering, modern web technologies,
              and AI-powered developer tools.
            </p>

            <div className="mt-10 grid gap-3">
              <a
                href="https://github.com/AmirRiahi2008/codepilot-ai"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-zinc-900 bg-zinc-950 px-5 py-4 text-sm transition hover:border-zinc-700"
              >
                GitHub — CodePilot AI
              </a>

              <a
                href="https://amir-riahi.ir/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-zinc-900 bg-zinc-950 px-5 py-4 text-sm transition hover:border-zinc-700"
              >
                Personal Website
              </a>

              <a
                href="https://www.linkedin.com/in/Amir-reza-Riahi"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-zinc-900 bg-zinc-950 px-5 py-4 text-sm transition hover:border-zinc-700"
              >
                LinkedIn
              </a>

              <a
                href="https://t.me/amir_riah1"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-zinc-900 bg-zinc-950 px-5 py-4 text-sm transition hover:border-zinc-700"
              >
                Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

