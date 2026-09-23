import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { IssuesService } from './issues.service';
import { AiService } from '../ai.service';

@UseGuards(AuthGuard)
@Controller()
export class IssuesController {
  constructor(private readonly service: IssuesService, private readonly ai: AiService) {}

  @Get('audits/:id/issues') list(@Req() req: Request & { userId: string }, @Param('id') id: string) { return this.service.listOwned(req.userId, id); }
  @Get('issues/:id') get(@Req() req: Request & { userId: string }, @Param('id') id: string) { return this.service.findOwned(req.userId, id); }

  @Post('issues/:id/explain')
  async explain(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    const issue = await this.service.findOwned(req.userId, id);
    if (!issue) return { ok: false, error: 'Issue not found' };
    const text = await this.ai.explain({
  ...issue,
  recommendation: issue.recommendation ?? '',
});
    await this.service.updateAi(req.userId, id, { aiExplanation: text });
    return { text };
  }

  @Post('issues/:id/fix')
  async fix(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    const issue = await this.service.findOwned(req.userId, id);
    if (!issue) return { ok: false, error: 'Issue not found' };
    const text = await this.ai.fix({
  ...issue,
  recommendation: issue.recommendation ?? '',
});
    await this.service.updateAi(req.userId, id, { suggestedFix: text });
    return { text };
  }
}
