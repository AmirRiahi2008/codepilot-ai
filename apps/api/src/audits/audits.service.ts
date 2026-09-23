import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ANALYSIS_JOB, ANALYSIS_QUEUE } from "../queues/analysis.queue";

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
      throw new NotFoundException("Repository not found");
    }

    const activeAudit = await this.prisma.audit.findFirst({
      where: {
        repositoryId,
        status: {
          in: ["PENDING", "RUNNING", "DOWNLOADING", "SCANNING", "AI_ANALYSIS"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (activeAudit) {
      throw new ConflictException(
        "An analysis is already running for this repository",
      );
    }

    let audit;

    try {
      audit = await this.prisma.audit.create({
        data: {
          repositoryId,
          activeKey: repositoryId,
          status: "PENDING",
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "An analysis is already running for this repository",
        );
      }

      throw error;
    }

    await this.queue.add(
      ANALYSIS_JOB,
      {
        auditId: audit.id,
      },
      {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

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
              severity: "asc",
            },
            {
              createdAt: "asc",
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
        createdAt: "desc",
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