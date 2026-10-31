import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@upstash/qstash';

@Injectable()
export class QStashService {
  constructor(
    @Inject(Client) private readonly client: Client | null,
    private readonly config: ConfigService,
  ) {}

  async enqueueAudit(auditId: string) {
    const apiUrl = this.config.get<string>('API_URL')?.replace(/\/+$/, '');

    if (
      !apiUrl ||
      !this.client ||
      !this.config.get<string>('QSTASH_CURRENT_SIGNING_KEY')?.trim() ||
      !this.config.get<string>('QSTASH_NEXT_SIGNING_KEY')?.trim() ||
      !this.config.get<string>('WORKER_SECRET')?.trim()
    ) {
      throw new ServiceUnavailableException(
        'Repository analysis is not configured. Please contact the site administrator.',
      );
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
