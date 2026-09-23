import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RepositoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.repository.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            audits: true,
          },
        },
      },
    });
  }

  async sync(
    userId: string,
    input: {
      githubId: string;
      name: string;
      fullName: string;
      owner: string;
      defaultBranch: string;
      language?: string;
      isPrivate: boolean;
      stars: number;
      pushedAt?: string | null;
    },
  ) {
    return this.prisma.repository.upsert({
      where: {
        githubId: input.githubId,
      },

      update: {
        userId: userId,
        name: input.name,
        fullName: input.fullName,
        owner: input.owner,
        defaultBranch: input.defaultBranch,
        language: input.language ?? null,
        private: input.isPrivate,
        pushedAt: input.pushedAt ? new Date(input.pushedAt) : null,
      },

      create: {
        userId: userId,
        githubId: input.githubId,
        name: input.name,
        fullName: input.fullName,
        owner: input.owner,
        defaultBranch: input.defaultBranch,
        language: input.language ?? null,
        private: input.isPrivate,
        pushedAt: input.pushedAt ? new Date(input.pushedAt) : null,
      },
    });
  }

  async findOwned(userId: string, id: string) {
    const repo = await this.prisma.repository.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    return repo;
  }
  async syncAll(userId: string) {
  const account = await this.prisma.gitHubAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    throw new NotFoundException('GitHub account not connected');
  }

  // Import here to avoid duplicating GitHub API logic.
  const { decryptSecret } = await import('../common/crypto');

  const response = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated',
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${decryptSecret(account.accessToken)}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('GitHub API request failed');
  }

  const repos = (await response.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
    default_branch: string;
    language: string | null;
    private: boolean;
    pushed_at: string | null;
  }>;

  const synced = [];

  for (const repo of repos) {
    const saved = await this.prisma.repository.upsert({
      where: {
        githubId: String(repo.id),
      },
      update: {
        userId,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        defaultBranch: repo.default_branch,
        language: repo.language,
        private: repo.private,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      },
      create: {
        userId,
        githubId: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        defaultBranch: repo.default_branch,
        language: repo.language,
        private: repo.private,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      },
    });

    synced.push(saved);
  }

  return {
    count: synced.length,
    repositories: synced,
  };
}
}