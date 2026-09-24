import { Injectable } from '@nestjs/common';
import { InternalService } from '../internal/internal.service';

@Injectable()
export class AuditRunnerService {
  constructor(
    private readonly internalService: InternalService,
  ) {}

  async run(auditId: string) {
    await this.internalService.start(
      auditId,
      process.env.WORKER_SECRET,
    );

    let extracted: string | undefined;

    try {
      const context =
        await this.internalService.context(
          auditId,
          process.env.WORKER_SECRET,
        );

      const { analyzeRepository } =
        await import('./analyzers/static-analyzer');

      const {
        downloadAndExtractRepo,
        cleanupRepo,
      } = await import('./github/download');

      const { enrichWithAi } =
        await import('./ai/enrich');

      await this.internalService.progress(
        auditId,
        'DOWNLOADING',
        process.env.WORKER_SECRET,
      );

      extracted = await downloadAndExtractRepo(
        context.repository.fullName,
        context.repository.defaultBranch,
        context.githubToken,
      );

      await this.internalService.progress(
        auditId,
        'SCANNING',
        process.env.WORKER_SECRET,
      );

      const result =
        await analyzeRepository(extracted);

      await this.internalService.progress(
        auditId,
        'AI_ANALYSIS',
        process.env.WORKER_SECRET,
      );

      const ai =
        await enrichWithAi(result.issues);

      const issues = result.issues.map(
        (issue, index) => ({
          ...issue,
          aiExplanation:
            ai.explanations.get(String(index))
              ?.explanation,
          suggestedFix:
            ai.explanations.get(String(index))
              ?.fix,
        }),
      );

      await this.internalService.complete(
        auditId,
        {
          overallScore: result.overallScore,
          metrics: result.metrics,
          issues,
        },
        process.env.WORKER_SECRET,
      );
    } catch (error) {
      await this.internalService
        .fail(
          auditId,
          error instanceof Error
            ? error.message
            : 'Unknown audit failure',
          process.env.WORKER_SECRET,
        )
        .catch(() => undefined);

      throw error;
    } finally {
      if (extracted) {
        const { cleanupRepo } =
          await import('./github/download');

        await cleanupRepo(extracted);
      }
    }
  }
}
