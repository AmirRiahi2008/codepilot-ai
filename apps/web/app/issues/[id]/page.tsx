'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '../../../components/Header';
import { api } from '../../../lib/api';

type Issue = {
  id: string;
  auditId: string;
  title: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  filePath: string | null;
  lineNumber: number | null;
  description: string;
  evidence: string | null;
  recommendation: string | null;
  aiExplanation: string | null;
  suggestedFix: string | null;
  createdAt: string;
  audit: {
    id: string;
    repository: {
      id: string;
      name: string;
      fullName: string;
    };
  };
};

const severityStyles: Record<Issue['severity'], string> = {
  CRITICAL: 'border-red-400/30 bg-red-400/10 text-red-200',
  HIGH: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  LOW: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  INFO: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
};

const severityAccent: Record<Issue['severity'], string> = {
  CRITICAL: 'bg-red-400',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-blue-400',
  INFO: 'bg-slate-400',
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function IssuePage() {
  const params = useParams<{ id: string }>();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [explaining, setExplaining] = useState(false);
  const [fixing, setFixing] = useState(false);

  async function loadIssue() {
    try {
      const data = await api<Issue>(`/issues/${params.id}`);

      setIssue(data);
      setError('');

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load issue',
      );

      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssue();
  }, [params.id]);

  async function explainWithAI() {
    try {
      setExplaining(true);
      setError('');

      await api(`/issues/${params.id}/explain`, {
        method: 'POST',
      });

      await loadIssue();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate AI explanation',
      );
    } finally {
      setExplaining(false);
    }
  }

  async function generateFix() {
    try {
      setFixing(true);
      setError('');

      await api(`/issues/${params.id}/fix`, {
        method: 'POST',
      });

      await loadIssue();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate suggested fix',
      );
    } finally {
      setFixing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <Header />

        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="card h-10 w-40 animate-pulse bg-white/[.02]" />

          <div className="card mt-6 h-72 animate-pulse bg-white/[.02]" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="card h-72 animate-pulse bg-white/[.02]" />
            <div className="card h-72 animate-pulse bg-white/[.02]" />
          </div>
        </div>
      </main>
    );
  }

  if (!issue) {
    return (
      <main className="min-h-screen">
        <Header />

        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="card p-8">
            <p className="text-sm text-rose-300">Issue error</p>

            <h1 className="mt-2 text-2xl font-semibold">
              Issue not found
            </h1>

            <p className="muted mt-2">
              {error || 'This issue could not be loaded.'}
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="grid-bg min-h-[calc(100vh-73px)]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/audits/${issue.auditId}`}
              className="text-slate-400 transition hover:text-cyan-300"
            >
              ← Back to audit
            </Link>

            <span className="text-slate-700">/</span>

            <span className="text-slate-500">
              {issue.audit.repository.name}
            </span>
          </div>

          {/* Main issue hero */}
          <section className="card relative mt-6 overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full w-1 ${severityAccent[issue.severity]}`}
            />

            <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-cyan-400/[.04] blur-3xl" />

            <div className="relative p-7 lg:p-8">
              <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${severityStyles[issue.severity]}`}
                    >
                      {issue.severity}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[.02] px-3 py-1 text-xs text-slate-400">
                      {issue.category}
                    </span>
                  </div>

                  <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight lg:text-4xl">
                    {issue.title}
                  </h1>

                  <p className="mt-3 text-sm text-slate-400">
                    {issue.audit.repository.fullName}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Detected {formatDate(issue.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                  <button
                    onClick={explainWithAI}
                    disabled={explaining}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] px-4 py-3 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/[.1] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {explaining ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                        Analyzing...
                      </>
                    ) : (
                      'Explain with AI'
                    )}
                  </button>

                  <button
                    onClick={generateFix}
                    disabled={fixing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {fixing ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        Generating...
                      </>
                    ) : (
                      'Generate Fix'
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/[.07] px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              {/* Location */}
              {issue.filePath && (
                <div className="mt-8 rounded-2xl border border-white/[.07] bg-black/20 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[.16em] text-slate-500">
                        Location
                      </p>

                      <p className="mt-2 break-all font-mono text-sm text-slate-300">
                        {issue.filePath}
                        {issue.lineNumber
                          ? `:${issue.lineNumber}`
                          : ''}
                      </p>
                    </div>

                    {issue.lineNumber && (
                      <span className="w-fit rounded-lg border border-white/10 bg-white/[.03] px-3 py-1.5 font-mono text-xs text-slate-500">
                        Line {issue.lineNumber}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Issue details */}
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="card p-7">
              <SectionHeader
                eyebrow="Finding"
                title="What was detected"
              />

              <p className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-slate-300">
                {issue.description}
              </p>

              {issue.evidence && (
                <div className="mt-8">
                  <p className="text-[11px] uppercase tracking-[.16em] text-slate-500">
                    Evidence
                  </p>

                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/[.07] bg-black/30 p-5 font-mono text-sm leading-7 text-slate-300">
                    {issue.evidence}
                  </pre>
                </div>
              )}
            </div>

            <div className="card p-7">
              <SectionHeader
                eyebrow="Recommendation"
                title="What should change"
              />

              {issue.recommendation ? (
                <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.04] p-5">
                  <p className="text-[15px] leading-8 text-slate-300">
                    {issue.recommendation}
                  </p>
                </div>
              ) : (
                <p className="muted mt-5 leading-7">
                  No recommendation was generated for this finding.
                </p>
              )}

              <div className="mt-8 border-t border-white/[.06] pt-6">
                <p className="text-[11px] uppercase tracking-[.16em] text-slate-500">
                  Issue metadata
                </p>

                <div className="mt-4 space-y-3">
                  <MetaRow label="Severity" value={issue.severity} />
                  <MetaRow label="Category" value={issue.category} />
                  <MetaRow
                    label="Repository"
                    value={issue.audit.repository.fullName}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* AI section */}
          <section className="mt-10">
            <div>
              <p className="text-sm text-cyan-300">
                AI assistance
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                Understand and fix this issue
              </h2>

              <p className="muted mt-1 text-sm">
                Use CodePilot AI to explain the finding or generate a
                suggested solution.
              </p>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              {/* Explanation */}
              <div className="card overflow-hidden">
                <div className="border-b border-white/[.06] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[.16em] text-cyan-300">
                        AI explanation
                      </p>

                      <h3 className="mt-2 text-xl font-semibold">
                        Why does this matter?
                      </h3>
                    </div>

                    {!issue.aiExplanation && (
                      <button
                        onClick={explainWithAI}
                        disabled={explaining}
                        className="text-sm text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
                      >
                        {explaining ? 'Working...' : 'Generate'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {explaining ? (
                    <AiLoading text="Generating explanation..." />
                  ) : issue.aiExplanation ? (
                    <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[.03] p-5">
                      <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-300">
                        {issue.aiExplanation}
                      </p>
                    </div>
                  ) : (
                    <EmptyAiState
                      text="Generate an AI explanation to understand the risk, impact, and practical meaning of this finding."
                      action="Explain with AI"
                      onClick={explainWithAI}
                    />
                  )}
                </div>
              </div>

              {/* Suggested fix */}
              <div className="card overflow-hidden">
                <div className="border-b border-white/[.06] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[.16em] text-cyan-300">
                        Suggested solution
                      </p>

                      <h3 className="mt-2 text-xl font-semibold">
                        How can it be fixed?
                      </h3>
                    </div>

                    {!issue.suggestedFix && (
                      <button
                        onClick={generateFix}
                        disabled={fixing}
                        className="text-sm text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
                      >
                        {fixing ? 'Working...' : 'Generate'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {fixing ? (
                    <AiLoading text="Generating suggested fix..." />
                  ) : issue.suggestedFix ? (
                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[.025] p-5">
                      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-slate-300">
                        {issue.suggestedFix}
                      </pre>
                    </div>
                  ) : (
                    <EmptyAiState
                      text="Generate a suggested fix based on the detected issue and available repository context."
                      action="Generate Fix"
                      onClick={generateFix}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[.16em] text-cyan-300">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-semibold">
        {title}
      </h2>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[.06] bg-white/[.02] px-4 py-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm text-slate-300">
        {value}
      </span>
    </div>
  );
}

function AiLoading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/[.025] p-5">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />

      <span className="text-sm text-slate-400">
        {text}
      </span>
    </div>
  );
}

function EmptyAiState({
  text,
  action,
  onClick,
}: {
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.015] p-6">
      <p className="text-sm leading-7 text-slate-500">
        {text}
      </p>

      <button
        onClick={onClick}
        className="mt-5 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[.06]"
      >
        {action}
      </button>
    </div>
  );
}