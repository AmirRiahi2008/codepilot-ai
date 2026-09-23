import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RepositoriesService } from './repositories.service';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

class SyncRepoDto {
  @IsString() githubId!: string;
  @IsString() name!: string;
  @IsString() fullName!: string;
  @IsString() owner!: string;
  @IsString() defaultBranch!: string;
  @IsOptional() @IsString() language?: string;
  @IsBoolean() isPrivate!: boolean;
  @IsInt() stars!: number;
  @IsOptional() @IsString() pushedAt?: string;
}

@UseGuards(AuthGuard)
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly service: RepositoriesService) {}
  @Get() list(@Req() req: Request & { userId: string }) { return this.service.list(req.userId); }
  @Post('sync') sync(@Req() req: Request & { userId: string }, @Body() body: SyncRepoDto) { return this.service.sync(req.userId, body); }
 @Post('sync-all')
  syncAll(@Req() req: Request & { userId: string }) {
  return this.service.syncAll(req.userId);
}
  @Get(':id') find(@Req() req: Request & { userId: string }, @Param('id') id: string) { return this.service.findOwned(req.userId, id); }
}
