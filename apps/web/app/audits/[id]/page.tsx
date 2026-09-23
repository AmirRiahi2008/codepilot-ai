'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '../../../components/Header';
import { api } from '../../../lib/api';

type MetricKey =
  | 'securityScore'
  | 'architectureScore'
  | 'performanceScore'
  | 'qualityScore'
  | 'testingScore';

type Metrics = Record<MetricKey, number>;

type Issue = {
  id: string;
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
};

type AuditStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'DOWNLOADING'
  | 'SCANNING'
  | 'AI_ANALYSIS'
  | 'COMPLETED'
  | 'FAILED';

type Audit = {
  id: string;
  status: AuditStatus;
  overallScore: number | null;
  failedReason: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  repository: {
    id: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    language: string | null;
  };
  metrics: Metrics | null;
  issues: Issue[];
};

const severityStyles: Record<Issue['severity'], string> = {
  CRITICAL: 'border-red-400/30 bg-red-400/10 text-red-200',
  HIGH: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  LOW: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  INFO: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
};

const metricLabels: Record<MetricKey, string> = {
  securityScore: 'Security',
  architectureScore: 'Architecture',
  performanceScore: 'Performance',
  qualityScore: 'Quality',
  testingScore: 'Testing',
};

function scoreColor(score: number | null) {
  if (score === null) return 'text-slate-500';
  if (score >= 90) return 'text-emerald-300';
  if (score >= 75) return 'text-amber-300';
  return 'text-rose-300';
}

function scoreRing(score: number | null) {
  if (score === null) return 'border-slate-700';
  if (score >= 90) return 'border-emerald-400/40';
  if (score >= 75) return 'border-amber-400/40';
  return 'border-rose-400/40';
}

function statusStyle(status: AuditStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
    case 'FAILED':
      return 'border-rose-400/25 bg-rose-400/10 text-rose-200';
    case 'RUNNING':
    case 'DOWNLOADING':
    case 'SCANNING':
    case 'AI_ANALYSIS':
      return 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200';
    case 'PENDING':
    default:
      return 'border-amber-400/25 bg-amber-400/10 text-amber-200';
  }
}

function formatStatus(status: AuditStatus) {
  const labels: Record<AuditStatus, string> = {
    PENDING: 'Queued',
    RUNNING: 'Starting',
    DOWNLOADING: 'Downloading',
    SCANNING: 'Static analysis',
    AI_ANALYSIS: 'AI analysis',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
  };

  return labels[status];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function AuditPage() {
  const params = useParams<{ id: string }>();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAudit() {
    try {
      const data = await api<Audit>(`/audits/${params.id}`);

      setAudit(data);
      setError('');

      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load audit',
      );

      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudit();
  }, [params.id]);

  useEffect(() => {
    if (!audit) return;

    const processingStatuses: AuditStatus[] = [
      'PENDING',
      'RUNNING',
      'DOWNLOADING',
      'SCANNING',
      'AI_ANALYSIS',
    ];

    if (!processingStatuses.includes(audit.status)) {
      return;
    }

    const interval = setInterval(async () => {
      const updated = await loadAudit();

      if (updated && !processingStatuses.includes(updated.status)) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [audit?.status, params.id]);

  const metrics = useMemo<[MetricKey, number][]>(() => {
    if (!audit?.metrics) return [];

    return [
      ['securityScore', audit.metrics.securityScore],
      ['architectureScore', audit.metrics.architectureScore],
      ['performanceScore', audit.metrics.performanceScore],
      ['qualityScore', audit.metrics.qualityScore],
      ['testingScore', audit.metrics.testingScore],
    ];
  }, [audit?.metrics]);

  const issueCounts = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    for (const issue of audit?.issues ?? []) {
      counts[issue.severity]++;
    }

    return counts;
  }, [audit?.issues]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <Header />

        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="card h-32 animate-pulse bg-white/[.02]" />
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="card h-28 animate-pulse bg-white/[.02]"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!audit) {
    return (
      <main className="min-h-screen">
        <Header />

        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="card p-8">
            <p className="text-sm text-rose-300">Audit error</p>

            <h1 className="mt-2 text-2xl font-semibold">
              Audit not found
            </h1>

            <p className="muted mt-2">
              {error || 'This audit could not be loaded.'}
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

  const isProcessing = [
    'PENDING',
    'RUNNING',
    'DOWNLOADING',
    'SCANNING',
    'AI_ANALYSIS',
  ].includes(audit.status);

  const progressOrder: AuditStatus[] = [
    'PENDING',
    'RUNNING',
    'DOWNLOADING',
    'SCANNING',
    'AI_ANALYSIS',
    'COMPLETED',
  ];

  const progressIndex = progressOrder.indexOf(audit.status);

  function getStepState(stepIndex: number) {
    if (!audit) return 'pending' as const;
    if (audit.status === 'FAILED') return 'pending' as const;
    if (audit.status === 'COMPLETED') return 'complete' as const;
    if (stepIndex < progressIndex) return 'complete' as const;
    if (stepIndex === progressIndex) return 'active' as const;
    return 'pending' as const;
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="grid-bg min-h-[calc(100vh-73px)]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Breadcrumb */}
          <Link
            href={`/repositories/${audit.repository.id}`}
            className="text-sm text-slate-400 transition hover:text-cyan-300"
          >
            ← Back to {audit.repository.name}
          </Link>

          {/* Hero */}
          <section className="mt-6 card relative overflow-hidden">
            <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-cyan-400/[.05] blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 p-7 lg:flex-row lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm uppercase tracking-[.18em] text-cyan-300">
                    Repository audit
                  </p>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(
                      audit.status,
                    )}`}
                  >
                    {formatStatus(audit.status)}
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  {audit.repository.fullName}
                </h1>

                <p className="muted mt-2">
                  Branch: {audit.repository.defaultBranch}
                  {' · '}
                  {audit.repository.language ?? 'Unknown language'}
                </p>
              </div>

              <div className="text-left lg:text-right">
                <p className="muted text-xs uppercase tracking-wider">
                  Audit
                </p>

                <p className="mt-1 font-mono text-sm text-slate-300">
                  {audit.id}
                </p>
              </div>
            </div>
          </section>

          {/* Processing state */}
       {isProcessing && (
  <section className="mt-6 card overflow-hidden">
    <div className="p-7 lg:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/[.05]">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/10" />
            <span className="relative h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300" />
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-cyan-300">
            {formatStatus(audit.status)}
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {audit.status === 'PENDING'
              ? 'Waiting for the analysis worker'
              : audit.status === 'DOWNLOADING'
                ? 'Downloading your repository'
                : audit.status === 'SCANNING'
                  ? 'Analyzing your source code'
                  : audit.status === 'AI_ANALYSIS'
                    ? 'Generating AI-powered insights'
                    : 'CodePilot is processing your repository and preparing the final report'}
          </h2>

          <p className="muted mt-2 max-w-2xl leading-7">
            {audit.status === 'PENDING'
              ? 'Your audit has been created successfully and is waiting to be processed.'
              : audit.status === 'DOWNLOADING'
                ? 'CodePilot is fetching the repository files required for analysis.'
                : audit.status === 'SCANNING'
                  ? 'The static analyzer is inspecting your source code for potential issues.'
                  : audit.status === 'AI_ANALYSIS'
                    ? 'The AI engine is enriching detected findings with explanations and suggested fixes.'
                    : 'CodePilot is processing your repository and preparing the final report.'}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[.16em] text-slate-500">
            Status
          </p>

          <p className="mt-1 text-sm font-medium text-cyan-200">
            {formatStatus(audit.status)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[.16em] text-slate-500">
            Analysis pipeline
          </p>

          <p className="text-xs text-slate-500">
            Auto-refreshing
          </p>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
          <div
            className="h-full rounded-full bg-cyan-300 transition-all duration-700"
            style={{
              width:
                audit.status === 'PENDING'
                  ? '10%'
                  : audit.status === 'RUNNING'
                    ? '20%'
                    : audit.status === 'DOWNLOADING'
                      ? '40%'
                      : audit.status === 'SCANNING'
                        ? '65%'
                        : audit.status === 'AI_ANALYSIS'
                          ? '85%'
                          : '100%',
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressStep
          title="Repository queued"
          description="Audit initialized"
          state={getStepState(0)}
        />

        <ProgressStep
          title="Repository download"
          description="Fetching repository files"
          state={getStepState(2)}
        />

        <ProgressStep
          title="Static analysis"
          description="Scanning source code"
          state={getStepState(3)}
        />

        <ProgressStep
          title="AI analysis"
          description="Generating intelligent findings"
          state={getStepState(4)}
        />
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />

        This page automatically checks for updates every 2 seconds.
      </div>
    </div>
  </section>
)}

          {/* Failed state */}
          {audit.status === 'FAILED' && (
            <section className="mt-6 card p-7">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[.05] p-6">
                <p className="text-sm text-rose-300">Analysis failed</p>

                <h2 className="mt-2 text-xl font-semibold">
                  CodePilot could not complete this audit
                </h2>

                <p className="mt-3 text-sm leading-6 text-rose-100/70">
                  {audit.failedReason || 'Unknown analysis error.'}
                </p>
              </div>
            </section>
          )}

          {/* Completed report */}
          {audit.status === 'COMPLETED' && (
            <>
              {/* Score + issue overview */}
              <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="card p-7">
                  <div className="flex flex-col items-center gap-6 sm:flex-row">
                    <div
                      className={`flex h-40 w-40 shrink-0 items-center justify-center rounded-full border-[10px] ${scoreRing(
                        audit.overallScore,
                      )} bg-white/[.02]`}
                    >
                      <div className="text-center">
                        <p
                          className={`text-5xl font-semibold ${scoreColor(
                            audit.overallScore,
                          )}`}
                        >
                          {audit.overallScore ?? '—'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          / 100
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-cyan-300">
                        Overall health
                      </p>

                      <h2 className="mt-1 text-2xl font-semibold">
                        Repository analysis complete
                      </h2>

                      <p className="muted mt-2 max-w-xl leading-6">
                        CodePilot analyzed the repository across security,
                        architecture, performance, quality, and testing.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-slate-300">
                          {audit.issues.length} total issues
                        </span>

                        <span className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-slate-300">
                          Completed {formatDate(audit.completedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card p-7">
                  <p className="text-sm text-cyan-300">
                    Issue overview
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Findings by severity
                  </h2>

                  <div className="mt-6 space-y-3">
                    <IssueCount
                      label="Critical"
                      count={issueCounts.CRITICAL}
                      className="text-red-300"
                    />

                    <IssueCount
                      label="High"
                      count={issueCounts.HIGH}
                      className="text-orange-300"
                    />

                    <IssueCount
                      label="Medium"
                      count={issueCounts.MEDIUM}
                      className="text-amber-300"
                    />

                    <IssueCount
                      label="Low"
                      count={issueCounts.LOW}
                      className="text-blue-300"
                    />

                    <IssueCount
                      label="Info"
                      count={issueCounts.INFO}
                      className="text-slate-300"
                    />
                  </div>
                </div>
              </section>

              {/* Metrics */}
              <section className="mt-6">
                <div>
                  <p className="text-sm text-cyan-300">
                    Analysis metrics
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold">
                    Code health breakdown
                  </h2>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {metrics.map(([key, score]) => (
                    <MetricCard
                      key={key}
                      label={metricLabels[key]}
                      score={score}
                    />
                  ))}
                </div>
              </section>

              {/* Issues */}
              <section className="mt-10">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-sm text-cyan-300">
                      Findings
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold">
                      Issues detected
                    </h2>

                    <p className="muted mt-1 text-sm">
                      Review every finding and open its detailed analysis.
                    </p>
                  </div>

                  <span className="muted text-sm">
                    {audit.issues.length} issues
                  </span>
                </div>

                {audit.issues.length === 0 ? (
                  <div className="card mt-5 p-8">
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.05] p-7">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                          ✓
                        </div>

                        <div>
                          <h3 className="font-medium text-emerald-200">
                            No issues detected
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            The current static analysis did not identify any
                            findings in this repository.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {audit.issues.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/issues/${issue.id}`}
                        className="card group block p-6 transition hover:border-cyan-400/25 hover:bg-white/[.025]"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityStyles[issue.severity]}`}
                              >
                                {issue.severity}
                              </span>

                              <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400">
                                {issue.category}
                              </span>
                            </div>

                            <h3 className="mt-3 text-lg font-medium">
                              {issue.title}
                            </h3>

                            <p className="muted mt-2 max-w-3xl text-sm leading-6">
                              {issue.description}
                            </p>
                          </div>

                          <span className="shrink-0 text-sm text-cyan-300 transition group-hover:translate-x-1">
                            View issue →
                          </span>
                        </div>

                        {(issue.filePath || issue.lineNumber) && (
                          <div className="mt-5 rounded-xl border border-white/[.07] bg-black/20 px-4 py-3 font-mono text-xs text-slate-400">
                            {issue.filePath ?? 'Unknown file'}
                            {issue.lineNumber
                              ? `:${issue.lineNumber}`
                              : ''}
                          </div>
                        )}

                        {issue.recommendation && (
                          <div className="mt-5 border-t border-white/[.06] pt-4">
                            <p className="text-[11px] uppercase tracking-[.16em] text-slate-500">
                              Recommendation
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {issue.recommendation}
                            </p>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Metadata */}
          <section className="mt-10 grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Created"
              value={formatDate(audit.createdAt)}
            />

            <InfoCard
              title="Started"
              value={formatDate(audit.startedAt)}
            />

            <InfoCard
              title="Completed"
              value={formatDate(audit.completedAt)}
            />
          </section>
        </div>
      </div>
    </main>
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
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>

        <span
          className={`text-lg font-semibold ${scoreColor(score)}`}
        >
          {score}
        </span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
        <div
          className="h-full rounded-full bg-cyan-300 transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
          }}
        />
      </div>

      <p className="mt-2 text-right text-[11px] text-slate-600">
        / 100
      </p>
    </div>
  );
}

function IssueCount({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[.06] bg-white/[.02] px-4 py-3">
      <span className={`text-sm ${className}`}>{label}</span>

      <span className="text-sm font-semibold text-slate-200">
        {count}
      </span>
    </div>
  );
}

function ProgressStep({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: 'complete' | 'active' | 'pending';
}) {
  const complete = state === 'complete';
  const active = state === 'active';

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        complete
          ? 'border-emerald-400/20 bg-emerald-400/[.04]'
          : active
            ? 'border-cyan-400/20 bg-cyan-400/[.04]'
            : 'border-white/[.07] bg-white/[.02]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
            complete
              ? 'bg-emerald-400/10 text-emerald-300'
              : active
                ? 'bg-cyan-400/10 text-cyan-300'
                : 'bg-white/[.04] text-slate-600'
          }`}
        >
          {complete ? (
            '✓'
          ) : active ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
          ) : (
            '○'
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`text-sm font-medium ${
              complete || active
                ? 'text-slate-200'
                : 'text-slate-500'
            }`}
          >
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            {description}
          </p>
        </div>
      </div>
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
      <p className="text-xs uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-2 truncate text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

