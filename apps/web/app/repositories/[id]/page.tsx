
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '../../../components/Header';
import { api } from '../../../lib/api';

type Repository = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  language: string | null;
  private: boolean;
  pushedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    audits: number;
  };
};

type Audit = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  overallScore: number | null;
  createdAt: string;
  completedAt: string | null;
  failedReason?: string | null;
  metrics: {
    securityScore: number;
    architectureScore: number;
    performanceScore: number;
    qualityScore: number;
    testingScore: number;
  } | null;
};

const statusStyles: Record<Audit['status'], string> = {
  PENDING: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  RUNNING: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  COMPLETED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  FAILED: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
};

function scoreColor(score: number | null) {
  if (score === null) return 'text-slate-500';
  if (score >= 90) return 'text-emerald-300';
  if (score >= 75) return 'text-amber-300';
  return 'text-rose-300';
}

function formatStatus(status: Audit['status']) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function getLatestCompletedAudit(audits: Audit[]) {
  return audits.find(
    (audit) => audit.status === 'COMPLETED' && audit.overallScore !== null,
  );
}

export default function RepositoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [repository, setRepository] = useState<Repository | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  async function loadRepository() {
    try {
      setError('');

      const [repo, repoAudits] = await Promise.all([
        api<Repository>(`/repositories/${params.id}`),
        api<Audit[]>(`/repositories/${params.id}/audits`),
      ]);

      setRepository(repo);
      setAudits(repoAudits);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load repository',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepository();
  }, [params.id]);

  async function startAudit() {
    try {
      setStarting(true);
      setError('');

      const audit = await api<{ id: string }>(
        `/repositories/${params.id}/audits`,
        {
          method: 'POST',
        },
      );

      router.push(`/audits/${audit.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start audit',
      );
      setStarting(false);
    }
  }

  const latestCompleted = useMemo(
    () => getLatestCompletedAudit(audits),
    [audits],
  );

  const runningAudit = useMemo(
    () =>
      audits.find(
        (audit) => audit.status === 'RUNNING' || audit.status === 'PENDING',
      ),
    [audits],
  );

  if (loading) {
    return (
      <main className="min-h-screen">
        <Header />

        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card h-32 animate-pulse bg-white/[.02] md:col-span-2" />
            <div className="card h-32 animate-pulse bg-white/[.02]" />
          </div>

          <div className="mt-6 card h-64 animate-pulse bg-white/[.02]" />
        </div>
      </main>
    );
  }

  if (!repository) {
    return (
      <main className="min-h-screen">
        <Header />

        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="card p-8">
            <p className="text-sm text-rose-300">Repository error</p>

            <h1 className="mt-2 text-2xl font-semibold">
              Repository not found
            </h1>

            <p className="muted mt-2">
              {error || 'This repository could not be loaded.'}
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-slate-200"
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
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 transition hover:text-cyan-300"
          >
            ← Back to dashboard
          </Link>

          {/* Repository hero */}
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="card relative overflow-hidden p-7">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/[.04] blur-3xl" />

              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-xl">
                    ◇
                  </div>

                  <div>
                    <p className="muted text-xs uppercase tracking-[.18em]">
                      Repository
                    </p>

                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                      {repository.fullName}
                    </h1>
                  </div>
                </div>

                <p className="muted mt-6 max-w-2xl leading-6">
                  Analyze your repository for security, architecture,
                  performance, quality, and testing issues with CodePilot AI.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <InfoPill
                    label="Visibility"
                    value={repository.private ? 'Private' : 'Public'}
                  />

                  <InfoPill
                    label="Language"
                    value={repository.language ?? 'Unknown'}
                  />

                  <InfoPill
                    label="Branch"
                    value={repository.defaultBranch}
                  />

                  <InfoPill
                    label="Audits"
                    value={`${repository._count?.audits ?? audits.length}`}
                  />
                </div>

                {error && (
                  <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Score card */}
            <div className="card flex flex-col justify-between p-7">
              <div>
                <p className="muted text-sm">Latest analysis</p>

                {latestCompleted ? (
                  <>
                    <div
                      className={`mt-4 text-6xl font-semibold tracking-tight ${scoreColor(
                        latestCompleted.overallScore,
                      )}`}
                    >
                      {latestCompleted.overallScore}
                    </div>

                    <p className="muted mt-2 text-sm">
                      Overall code health score
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mt-4 text-4xl font-semibold text-slate-500">
                      —
                    </div>

                    <p className="muted mt-2 text-sm">
                      No completed analysis yet
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={startAudit}
                disabled={starting || Boolean(runningAudit)}
                className="mt-7 w-full rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting
                  ? 'Starting analysis...'
                  : runningAudit
                    ? 'Analysis already running'
                    : 'Analyze repository'}
              </button>
            </div>
          </section>

          {/* Quick metrics */}
          {latestCompleted?.metrics && (
            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                label="Security"
                score={latestCompleted.metrics.securityScore}
              />

              <MetricCard
                label="Architecture"
                score={latestCompleted.metrics.architectureScore}
              />

              <MetricCard
                label="Performance"
                score={latestCompleted.metrics.performanceScore}
              />

              <MetricCard
                label="Quality"
                score={latestCompleted.metrics.qualityScore}
              />

              <MetricCard
                label="Testing"
                score={latestCompleted.metrics.testingScore}
              />
            </section>
          )}

          {/* Audit history */}
          <section className="mt-10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm text-cyan-300">Analysis history</p>

                <h2 className="mt-1 text-2xl font-semibold">
                  Audit history
                </h2>

                <p className="muted mt-1 text-sm">
                  Every analysis run for this repository.
                </p>
              </div>

              <span className="muted text-sm">
                {audits.length} total audits
              </span>
            </div>

            {audits.length === 0 ? (
              <div className="card mt-5 p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.03]">
                  ◈
                </div>

                <h3 className="mt-4 text-lg font-medium">
                  No audits yet
                </h3>

                <p className="muted mx-auto mt-2 max-w-md text-sm leading-6">
                  Run your first analysis to inspect this repository and
                  generate a technical report.
                </p>

                <button
                  onClick={startAudit}
                  disabled={starting}
                  className="mt-6 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  {starting ? 'Starting...' : 'Run first analysis'}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {audits.map((audit) => (
                  <Link
                    key={audit.id}
                    href={`/audits/${audit.id}`}
                    className="card group block p-5 transition hover:border-cyan-400/25 hover:bg-white/[.025]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] text-sm">
                            ◈
                          </div>

                          <span className="font-medium">
                            Audit {audit.id.slice(-8)}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[audit.status]}`}
                          >
                            {formatStatus(audit.status)}
                          </span>
                        </div>

                        <p className="muted mt-3 text-xs">
                          Started {formatDate(audit.createdAt)}
                        </p>

                        {audit.status === 'FAILED' &&
                          audit.failedReason && (
                            <p className="mt-2 text-xs text-rose-300">
                              {audit.failedReason}
                            </p>
                          )}
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-left lg:text-right">
                          <p className="muted text-xs">Score</p>

                          <p
                            className={`mt-1 text-2xl font-semibold ${scoreColor(
                              audit.overallScore,
                            )}`}
                          >
                            {audit.overallScore !== null
                              ? audit.overallScore
                              : '—'}
                          </p>
                        </div>

                        <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-300">
                          →
                        </span>
                      </div>
                    </div>

                    {audit.metrics && (
                      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[.06] pt-5 sm:grid-cols-5">
                        <MiniMetric
                          label="Security"
                          score={audit.metrics.securityScore}
                        />

                        <MiniMetric
                          label="Architecture"
                          score={audit.metrics.architectureScore}
                        />

                        <MiniMetric
                          label="Performance"
                          score={audit.metrics.performanceScore}
                        />

                        <MiniMetric
                          label="Quality"
                          score={audit.metrics.qualityScore}
                        />

                        <MiniMetric
                          label="Testing"
                          score={audit.metrics.testingScore}
                        />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Repository metadata */}
          <section className="mt-10 grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Repository owner"
              value={repository.owner}
            />

            <InfoCard
              title="Default branch"
              value={repository.defaultBranch}
            />

            <InfoCard
              title="Last push"
              value={
                repository.pushedAt
                  ? formatDate(repository.pushedAt)
                  : 'Unknown'
              }
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[.025] px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="ml-2 text-xs font-medium text-slate-200">
        {value}
      </span>
    </div>
  );
}

function MetricCard({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="card p-4">
      <p className="muted text-xs">{label}</p>

      <div className="mt-2 flex items-end justify-between">
        <span
          className={`text-xl font-semibold ${scoreColor(score)}`}
        >
          {score}
        </span>

        <span className="text-xs text-slate-600">/100</span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.06]">
        <div
          className="h-full rounded-full bg-current transition-all"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-lg border border-white/[.06] bg-black/10 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>

      <p className={`mt-1 text-sm font-medium ${scoreColor(score)}`}>
        {score}/100
      </p>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="card p-5">
      <p className="muted text-xs uppercase tracking-wider">{title}</p>

      <p className="mt-2 truncate text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

