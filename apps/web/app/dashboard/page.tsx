'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { api, API_URL } from '../../lib/api';

type Repo = {
  id: string;
  name: string;
  fullName: string;
  language?: string | null;
  stars?: number;
  defaultBranch: string;
  private?: boolean;
  _count?: {
    audits: number;
  };
};

type GithubRepo = {
  githubId: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  language?: string;
  isPrivate: boolean;
  stars: number;
  pushedAt?: string;
};

type DashboardAudit = {
  id: string;
  repositoryId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  overallScore?: number | null;
  createdAt: string;
  repository: {
    name: string;
    fullName: string;
  };
  metrics?: {
    securityScore: number;
    architectureScore: number;
    performanceScore: number;
    qualityScore: number;
    testingScore: number;
  } | null;
  _count: {
    issues: number;
  };
};

type DashboardData = {
  repositories: {
    total: number;
  };
  audits: {
    total: number;
    completed: number;
    running: number;
    pending: number;
    failed: number;
  };
  issues: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  latestAudits: DashboardAudit[];
};

const statusStyles: Record<DashboardAudit['status'], string> = {
  COMPLETED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  RUNNING: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  PENDING: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  FAILED: 'border-red-400/20 bg-red-400/10 text-red-300',
};

function formatStatus(status: DashboardAudit['status']) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function scoreTone(score?: number | null) {
  if (score == null) return 'text-slate-500';
  if (score >= 90) return 'text-emerald-300';
  if (score >= 75) return 'text-amber-300';
  return 'text-red-300';
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}

export default function Dashboard() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');

  async function loadDashboard() {
    const [repoData, dashboardData] = await Promise.all([
      api<Repo[]>('/repositories'),
      api<DashboardData>('/dashboard'),
    ]);

    setRepos(repoData);
    setDashboard(dashboardData);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadDashboard();
      } catch {
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function syncGithub() {
    setSyncing(true);
    setMessage('');

    try {
      const githubRepos = await api<GithubRepo[]>('/github/repositories');

      for (const repo of githubRepos) {
        await api('/repositories/sync', {
          method: 'POST',
          body: JSON.stringify(repo),
        });
      }

      await loadDashboard();
      setMessage(`${githubRepos.length} repositories synced successfully.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'GitHub sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  async function startAudit(id: string) {
    setMessage('');

    try {
      const audit = await api<{ id: string }>(`/repositories/${id}/audits`, {
        method: 'POST',
      });

      window.location.href = `/audits/${audit.id}`;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to create audit.');
    }
  }

  const filteredRepos = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return repos;

    return repos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.fullName.toLowerCase().includes(query) ||
        repo.language?.toLowerCase().includes(query),
    );
  }, [repos, search]);

  const averageScore = useMemo(() => {
    const completed = dashboard?.latestAudits.filter(
      (audit) => audit.status === 'COMPLETED' && audit.overallScore != null,
    );

    if (!completed?.length) return null;

    const total = completed.reduce(
      (sum, audit) => sum + (audit.overallScore ?? 0),
      0,
    );

    return Math.round(total / completed.length);
  }, [dashboard]);

  return (
    <main className="min-h-screen">
      <Header />

      <div className="grid-bg min-h-[calc(100vh-73px)]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Header */}
          <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.8)]" />
                <span className="text-sm font-medium text-cyan-300">
                  CodePilot AI
                </span>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Repository intelligence
              </h1>

              <p className="muted mt-3 max-w-2xl text-sm leading-6 md:text-base">
                Monitor your repositories, run AI-powered audits, and track
                code quality from one workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={`${API_URL}/github/connect`}
                className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm font-medium transition hover:border-white/20 hover:bg-white/[.06]"
              >
                Connect GitHub
              </a>

              <button
                onClick={syncGithub}
                disabled={syncing}
                className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing ? 'Syncing...' : 'Sync repositories'}
              </button>
            </div>
          </section>

          {message && (
            <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] px-4 py-3 text-sm text-cyan-100">
              {message}
            </div>
          )}

          {loading ? (
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="card h-32 animate-pulse bg-white/[.02]"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Stats */}
              <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Repositories"
                  value={dashboard?.repositories.total ?? repos.length}
                  description="Connected repositories"
                  icon="⌘"
                />

                <StatCard
                  label="Total audits"
                  value={dashboard?.audits.total ?? 0}
                  description={`${dashboard?.audits.completed ?? 0} completed`}
                  icon="◈"
                />

                <StatCard
                  label="Open issues"
                  value={dashboard?.issues.total ?? 0}
                  description={`${dashboard?.issues.critical ?? 0} critical · ${dashboard?.issues.high ?? 0} high`}
                  icon="!"
                  danger={(dashboard?.issues.critical ?? 0) > 0}
                />

                <StatCard
                  label="Latest score"
                  value={averageScore != null ? `${averageScore}%` : '—'}
                  description="From recent completed audits"
                  icon="✓"
                />
              </section>

              {/* Main grid */}
              <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
                {/* Recent audits */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/[.06] px-6 py-5">
                    <div>
                      <h2 className="font-semibold">Recent audits</h2>
                      <p className="muted mt-1 text-sm">
                        Latest repository analysis activity
                      </p>
                    </div>

                    <Link
                      href="/audits"
                      className="text-sm text-cyan-300 transition hover:text-cyan-200"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="divide-y divide-white/[.06]">
                    {dashboard?.latestAudits.length ? (
                      dashboard.latestAudits.map((audit) => (
                        <Link
                          href={`/audits/${audit.id}`}
                          key={audit.id}
                          className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[.025] sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] text-sm">
                                ◇
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {audit.repository.fullName}
                                </p>

                                <p className="muted mt-1 text-xs">
                                  {timeAgo(audit.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-5">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[audit.status]}`}
                            >
                              {formatStatus(audit.status)}
                            </span>

                            <span
                              className={`w-12 text-right text-sm font-semibold ${scoreTone(
                                audit.overallScore,
                              )}`}
                            >
                              {audit.overallScore != null
                                ? `${audit.overallScore}`
                                : '—'}
                            </span>

                            <span className="muted w-16 text-right text-xs">
                              {audit._count.issues}{' '}
                              {audit._count.issues === 1 ? 'issue' : 'issues'}
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-6 py-12 text-center">
                        <p className="font-medium">No audits yet</p>
                        <p className="muted mt-2 text-sm">
                          Run your first repository analysis below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Issue overview */}
                <div className="card p-6">
                  <div>
                    <h2 className="font-semibold">Issue overview</h2>
                    <p className="muted mt-1 text-sm">
                      Findings across your audits
                    </p>
                  </div>

                  <div className="mt-7 space-y-5">
                    <IssueRow
                      label="Critical"
                      value={dashboard?.issues.critical ?? 0}
                      className="text-red-300"
                    />

                    <IssueRow
                      label="High"
                      value={dashboard?.issues.high ?? 0}
                      className="text-orange-300"
                    />

                    <IssueRow
                      label="Medium"
                      value={dashboard?.issues.medium ?? 0}
                      className="text-amber-300"
                    />

                    <IssueRow
                      label="Low"
                      value={dashboard?.issues.low ?? 0}
                      className="text-blue-300"
                    />

                    <IssueRow
                      label="Info"
                      value={dashboard?.issues.info ?? 0}
                      className="text-slate-300"
                    />
                  </div>

                  <div className="mt-7 border-t border-white/[.06] pt-5">
                    <div className="flex items-center justify-between">
                      <span className="muted text-sm">Audit status</span>
                      <span className="text-sm">
                        {dashboard?.audits.running ?? 0} running
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.06]">
                      <div
                        className="h-full rounded-full bg-cyan-300 transition-all"
                        style={{
                          width: `${
                            dashboard?.audits.total
                              ? Math.min(
                                  100,
                                  (dashboard.audits.completed /
                                    dashboard.audits.total) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs">
                      <span className="muted">
                        {dashboard?.audits.completed ?? 0} completed
                      </span>
                      <span className="muted">
                        {dashboard?.audits.total ?? 0} total
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Repositories */}
              <section className="mt-6">
                <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-xl font-semibold">Repositories</h2>
                    <p className="muted mt-1 text-sm">
                      Select a repository to inspect or analyze it.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search repositories..."
                      className="w-full rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 sm:w-72"
                    />
                  </div>
                </div>

                {filteredRepos.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredRepos.map((repo) => (
                      <div
                        className="card group p-5 transition hover:-translate-y-0.5 hover:border-white/15"
                        key={repo.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              href={`/repositories/${repo.id}`}
                              className="block truncate font-medium transition hover:text-cyan-200"
                            >
                              {repo.fullName}
                            </Link>

                            <div className="muted mt-2 flex items-center gap-2 text-xs">
                              <span>
                                {repo.language ?? 'Unknown language'}
                              </span>

                              <span>·</span>

                              <span>★ {repo.stars ?? 0}</span>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-xs text-slate-400">
                            {repo._count?.audits ?? 0} audits
                          </span>
                        </div>

                        <div className="mt-5 flex gap-2">
                          <button
                            onClick={() => startAudit(repo.id)}
                            className="flex-1 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                          >
                            Analyze
                          </button>

                          <Link
                            href={`/repositories/${repo.id}`}
                            className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/[.04]"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card p-10 text-center">
                    <p className="font-medium">No repositories found</p>
                    <p className="muted mt-2 text-sm">
                      Try another search or sync your GitHub repositories.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  danger = false,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div className="card p-5 transition hover:border-white/15">
      <div className="flex items-start justify-between">
        <div>
          <p className="muted text-sm">{label}</p>
          <p
            className={`mt-3 text-3xl font-semibold tracking-tight ${
              danger ? 'text-red-300' : ''
            }`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] text-sm text-cyan-300">
          {icon}
        </div>
      </div>

      <p className="muted mt-4 text-xs">{description}</p>
    </div>
  );
}

function IssueRow({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full bg-current ${className}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>

      <span className={`text-sm font-semibold ${className}`}>{value}</span>
    </div>
  );
}