
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from '../common/crypto';

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

@Injectable()
export class GitHubService {
  constructor(private readonly prisma: PrismaService) {}

  async status(userId: string) {
    const account = await this.prisma.gitHubAccount.findUnique({
      where: {
        userId,
      },
      select: {
        githubUserId: true,
      },
    });

    return {
      connected: Boolean(account),
    };
  }

  connectUrl(state: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callback = process.env.GITHUB_CALLBACK_URL;

    if (!clientId || !callback) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      state,
      scope: 'read:user user:email repo',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async callback(code: string, userId: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const secret = process.env.GITHUB_CLIENT_SECRET;
    const redirect = process.env.GITHUB_CALLBACK_URL;

    if (!clientId || !secret || !redirect) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: secret,
          code,
          redirect_uri: redirect,
        }),
      },
    );

    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new UnauthorizedException(
        tokenBody.error_description ??
          tokenBody.error ??
          'GitHub authorization failed',
      );
    }

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        ...githubHeaders,
        Authorization: `Bearer ${tokenBody.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new UnauthorizedException('Could not read GitHub profile');
    }

    const profile = (await profileResponse.json()) as {
      id: number;
      login: string;
      avatar_url?: string;
    };

    await this.prisma.gitHubAccount.upsert({
      where: {
        userId,
      },
      update: {
        githubUserId: String(profile.id),
        accessToken: encryptSecret(tokenBody.access_token),
      },
      create: {
        userId,
        githubUserId: String(profile.id),
        accessToken: encryptSecret(tokenBody.access_token),
      },
    });

    return {
      connected: true,
      githubUserId: String(profile.id),
      login: profile.login,
      avatarUrl: profile.avatar_url,
    };
  }

  async listRepos(userId: string) {
    const account = await this.prisma.gitHubAccount.findUnique({
      where: {
        userId,
      },
    });

    if (!account) {
      throw new BadRequestException('Connect GitHub first');
    }

    const response = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated',
      {
        headers: {
          ...githubHeaders,
          Authorization: `Bearer ${decryptSecret(account.accessToken)}`,
        },
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('GitHub API request failed');
    }

    const repos = (await response.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      default_branch: string;
      language: string | null;
      stargazers_count: number;
      pushed_at: string | null;
      owner: {
        login: string;
      };
    }>;

    return repos.map((repo) => ({
      githubId: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      defaultBranch: repo.default_branch,
      language: repo.language,
      isPrivate: repo.private,
      stars: repo.stargazers_count,
      pushedAt: repo.pushed_at,
    }));
  }
}

