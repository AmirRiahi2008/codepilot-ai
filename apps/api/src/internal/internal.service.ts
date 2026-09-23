import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';

type AuditProgressStatus =
  | 'RUNNING'
  | 'DOWNLOADING'
  | 'SCANNING'
  | 'AI_ANALYSIS';

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  private assertSecret(secret: string | undefined) {
    if (!secret || secret !== process.env.WORKER_SECRET) {
      throw new UnauthorizedException('Invalid worker secret');
    }
  }

  async start(auditId: string, secret?: string) {
    this.assertSecret(secret);

    const audit = await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        failedReason: null,
      },
    });

    return {
      ok: true,
      auditId: audit.id,
      status: audit.status,
    };
  }

  async progress(
    auditId: string,
    status: AuditProgressStatus,
    secret?: string,
  ) {
    this.assertSecret(secret);

    const audit = await this.prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    const updated = await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status,
      },
    });

    return {
      ok: true,
      auditId: updated.id,
      status: updated.status,
    };
  }

  async context(auditId: string, secret?: string) {
    this.assertSecret(secret);

    const audit = await this.prisma.audit.findUnique({
      where: { id: auditId },
      include: { repository: true },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    const account = await this.prisma.gitHubAccount.findFirst({
      where: {
        userId: audit.repository.userId,
      },
    });

    if (!account) {
      throw new NotFoundException('GitHub account not connected');
    }

    return {
      auditId: audit.id,
      repository: {
        id: audit.repository.id,
        fullName: audit.repository.fullName,
        defaultBranch: audit.repository.defaultBranch,
      },
      githubToken: decryptSecret(account.accessToken),
    };
  }

  async complete(auditId: string, payload: any, secret?: string) {
    this.assertSecret(secret);

    const audit = await this.prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.issue.deleteMany({
        where: { auditId },
      });

      if (payload.issues?.length) {
        await tx.issue.createMany({
          data: payload.issues.map((issue: any) => ({
            ...issue,
            auditId,
          })),
        });
      }

      await tx.analysisMetrics.upsert({
        where: { auditId },
        update: payload.metrics,
        create: {
          auditId,
          ...payload.metrics,
        },
      });

      await tx.audit.update({
        where: { id: auditId },
        data: {
          status: 'COMPLETED',
          startedAt: audit.startedAt ?? new Date(),
          completedAt: new Date(),
          overallScore: payload.overallScore,
        },
      });
    });

    return {
      ok: true,
      auditId,
      status: 'COMPLETED',
    };
  }

  async fail(auditId: string, reason: string, secret?: string) {
    this.assertSecret(secret);

    await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: 'FAILED',
        failedReason: reason,
        completedAt: new Date(),
      },
    });

    return {
      ok: true,
      auditId,
      status: 'FAILED',
    };
  }
}