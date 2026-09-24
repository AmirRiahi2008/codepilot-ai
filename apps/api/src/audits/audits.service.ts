
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { QStashService } from '../qstash/qstash.service';

@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qstash: QStashService,
  ) {}

  async create(
    userId: string,
    repositoryId: string,
  ) {
    const repo =
      await this.prisma.repository.findFirst({
        where: {
          id: repositoryId,
          userId,
        },
      });

    if (!repo) {
      throw new NotFoundException(
        'Repository not found',
      );
    }

    const activeAudit =
      await this.prisma.audit.findFirst({
        where: {
          repositoryId,
          status: {
            in: [
              'PENDING',
              'RUNNING',
              'DOWNLOADING',
              'SCANNING',
              'AI_ANALYSIS',
            ],
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

    let audit;

    try {
      audit =
        await this.prisma.audit.create({
          data: {
            repositoryId,
            activeKey: repositoryId,
            status: 'PENDING',
          },
        });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An analysis is already running for this repository',
        );
      }

      throw error;
    }

    try {
      await this.qstash.enqueueAudit(
        audit.id,
      );
    } catch (error) {
      await this.prisma.audit.update({
        where: {
          id: audit.id,
        },
        data: {
          status: 'FAILED',
          activeKey: null,
          failedReason:
            error instanceof Error
              ? error.message
              : 'Failed to enqueue audit',
          completedAt: new Date(),
        },
      });

      throw error;
    }

    return audit;
  }

  findOwned(
    userId: string,
    id: string,
  ) {
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

  listOwned(
    userId: string,
    repositoryId?: string,
  ) {
    return this.prisma.audit.findMany({
      where: {
        repository: {
          userId,
        },
        ...(repositoryId
          ? { repositoryId }
          : {}),
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
