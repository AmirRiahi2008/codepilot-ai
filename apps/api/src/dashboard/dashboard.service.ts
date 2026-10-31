import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const [totalRepositories, auditCounts, issueCounts, latestAudits] =
      await Promise.all([
        this.prisma.repository.count({
          where: { userId },
        }),

        this.prisma.audit.groupBy({
          by: ['status'],
          where: { repository: { userId } },
          _count: { _all: true },
        }),

        this.prisma.issue.groupBy({
          by: ['severity'],
          where: {
            audit: {
              repository: { userId },
            },
          },
          _count: {
            _all: true,
          },
        }),

        this.prisma.audit.findMany({
          where: {
            repository: { userId },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
          include: {
            repository: {
              select: {
                name: true,
                fullName: true,
              },
            },
            metrics: true,
            _count: {
              select: {
                issues: true,
              },
            },
          },
        }),
      ]);

    const counts = Object.fromEntries(
      auditCounts.map((item) => [item.status, item._count._all]),
    );
    const totalAudits = auditCounts.reduce(
      (sum, item) => sum + item._count._all,
      0,
    );
    const runningAudits = [
      'RUNNING',
      'DOWNLOADING',
      'SCANNING',
      'AI_ANALYSIS',
    ].reduce((sum, status) => sum + (counts[status] ?? 0), 0);

    const issues = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const item of issueCounts) {
      const count = item._count._all;

      issues.total += count;

      switch (item.severity) {
        case 'CRITICAL':
          issues.critical = count;
          break;
        case 'HIGH':
          issues.high = count;
          break;
        case 'MEDIUM':
          issues.medium = count;
          break;
        case 'LOW':
          issues.low = count;
          break;
        case 'INFO':
          issues.info = count;
          break;
      }
    }

    return {
      repositories: {
        total: totalRepositories,
      },

      audits: {
        total: totalAudits,
        completed: counts.COMPLETED ?? 0,
        running: runningAudits,
        pending: counts.PENDING ?? 0,
        failed: counts.FAILED ?? 0,
      },

      issues,

      latestAudits,
    };
  }
}
