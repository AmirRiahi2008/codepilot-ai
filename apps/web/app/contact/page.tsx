import Link from 'next/link';

export default function ContactPage() {
return ( <main className="min-h-screen bg-[#050505] text-white px-6 py-20"> <div className="mx-auto max-w-3xl"> <Link
       href="/"
       className="text-sm text-zinc-500 hover:text-white transition"
     >
← Back </Link>


    <div className="mt-16">
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-600">
        Contact
      </p>

      <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tight">
        Let&apos;s talk.
      </h1>

      <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
        Have a question, feedback, collaboration idea, or want to
        talk about CodePilot AI? Feel free to reach out.
      </p>

      <div className="mt-12">

<a
  href="mailto:amirreza.riahi3311@gmail.com"
  className="inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold !text-black transition hover:bg-zinc-200"
>
  amirreza.riahi3311@gmail.com
</a>


      </div>

      <div className="mt-12 grid gap-3">
        <a
          href="https://t.me/amir_riah1"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 text-sm text-zinc-300 hover:text-white transition"
        >
          Telegram
        </a>

        <a
          href="https://www.linkedin.com/in/Amir-reza-Riahi"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 text-sm text-zinc-300 hover:text-white transition"
        >
          LinkedIn
        </a>

        <a
          href="https://github.com/AmirRiahi2008/codepilot-ai"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 text-sm text-zinc-300 hover:text-white transition"
        >
          GitHub
        </a>
      </div>
    </div>
  </div>
</main>


);
}
