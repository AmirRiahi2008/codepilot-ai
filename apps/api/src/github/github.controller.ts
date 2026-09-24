
import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { randomUUID } from 'node:crypto';

import { JwtService } from '@nestjs/jwt';

import { AuthGuard } from '../auth/auth.guard';
import { GitHubService } from './github.service';

@Controller('github')
export class GitHubController {
  constructor(
    private readonly github: GitHubService,
    private readonly jwt: JwtService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('connect')
  connect(
    @Req() req: Request & { userId: string },
    @Res() res: Response,
  ) {
    const state = this.jwt.sign(
      {
        sub: req.userId,
        nonce: randomUUID(),
        purpose: 'github-oauth',
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '10m',
      },
    );

    return res.redirect(this.github.connectUrl(state));
  }

  @Get('callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');

    if (!code || !state) {
      return res.redirect(
        `${process.env.WEB_URL}/dashboard?github=error`,
      );
    }

    try {
      const parsed = this.jwt.verify<{
        sub: string;
        purpose: string;
      }>(state, {
        secret: process.env.JWT_SECRET,
      });

      if (parsed.purpose !== 'github-oauth') {
        throw new Error('Invalid state');
      }

      await this.github.callback(code, parsed.sub);

      return res.redirect(
        `${process.env.WEB_URL}/dashboard?github=connected`,
      );
    } catch (error) {
      console.error('GitHub OAuth callback failed:', error);

      return res.redirect(
        `${process.env.WEB_URL}/dashboard?github=error`,
      );
    }
  }

  @UseGuards(AuthGuard)
  @Get('status')
  status(
    @Req() req: Request & { userId: string },
  ) {
    return this.github.status(req.userId);
  }

  @UseGuards(AuthGuard)
  @Get('repositories')
  repositories(
    @Req() req: Request & { userId: string },
  ) {
    return this.github.listRepos(req.userId);
  }
}

