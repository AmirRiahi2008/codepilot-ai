import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@upstash/qstash';

@Injectable()
export class QStashService {
  constructor(
    private readonly client: Client,
    private readonly config: ConfigService,
  ) {}

  async enqueueAudit(auditId: string) {
    const apiUrl = this.config.get<string>('API_URL');

    if (!apiUrl) {
      throw new Error('API_URL is not configured');
    }

    return this.client.publishJSON({
      url: `${apiUrl}/api/v1/internal/audits/${auditId}/run`,
      body: {
        auditId,
      },
      retries: 2,
      contentBasedDeduplication: true,
      label: `audit-${auditId}`,
    });
  }
}