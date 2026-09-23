import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuditsService } from './audits.service';

@UseGuards(AuthGuard)
@Controller()
export class AuditsController {
  constructor(private readonly service: AuditsService) {}

  @Post('repositories/:id/audits') create(@Req() req: Request & { userId: string }, @Param('id') id: string) { return this.service.create(req.userId, id); }
  @Get('audits/:id') get(@Req() req: Request & { userId: string }, @Param('id') id: string) { return this.service.findOwned(req.userId, id); }
  @Get('audits') list(@Req() req: Request & { userId: string }) { return this.service.listOwned(req.userId); }
  @Get('repositories/:id/audits') listRepo(@Req() req: Request & { userId: string }, @Param('id') id: string) { return this.service.listOwned(req.userId, id); }
}
