import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ANALYSIS_JOB, ANALYSIS_QUEUE } from '../queues/analysis.queue';

@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(ANALYSIS_QUEUE)
    private readonly queue: Queue,
  ) {}

  async create(userId: string, repositoryId: string) {
    const repo = await this.prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId,
      },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    const activeAudit = await this.prisma.audit.findFirst({
      where: {
        repositoryId,
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (activeAudit) {
      throw new ConflictException(
        'An analysis is already running for this repository',
      );
    }

    const audit = await this.prisma.audit.create({
      data: {
        repositoryId,
        status: 'PENDING',
      },
    });

    try {
      await this.queue.add(
        ANALYSIS_JOB,
        {
          auditId: audit.id,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      await this.prisma.audit.update({
        where: {
          id: audit.id,
        },
        data: {
          status: 'FAILED',
          failedReason: 'Failed to enqueue analysis job',
          completedAt: new Date(),
        },
      });

      throw error;
    }

    return audit;
  }

  findOwned(userId: string, id: string) {
    return this.prisma.audit.findFirst({
      where: {
        id,
        repository: {
          userId,
        },
      },
      include: {
        repository: true,
        metrics: true,
        issues: {
          orderBy: [
            {
              severity: 'asc',
            },
            {
              createdAt: 'asc',
            },
          ],
        },
      },
    });
  }

  listOwned(userId: string, repositoryId?: string) {
    return this.prisma.audit.findMany({
      where: {
        repository: {
          userId,
        },
        ...(repositoryId ? { repositoryId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        repository: {
          select: {
            name: true,
            fullName: true,
          },
        },
        metrics: true,
      },
    });
  }
}