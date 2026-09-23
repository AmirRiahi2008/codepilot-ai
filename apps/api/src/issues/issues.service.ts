import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  findOwned(userId: string, id: string) {
    return this.prisma.issue.findFirst({ where: { id, audit: { repository: { userId } } }, include: { audit: { include: { repository: true } } } });
  }

  listOwned(userId: string, auditId: string) {
    return this.prisma.issue.findMany({ where: { auditId, audit: { repository: { userId } } }, orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }] });
  }

  async updateAi(userId: string, id: string, data: { aiExplanation?: string; suggestedFix?: string }) {
    const issue = await this.findOwned(userId, id);
    if (!issue) throw new NotFoundException('Issue not found');
    return this.prisma.issue.update({ where: { id }, data });
  }
}
