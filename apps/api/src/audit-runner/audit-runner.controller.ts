import {
  Controller,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { Receiver } from '@upstash/qstash';

import { AuditRunnerService } from './audit-runner.service';

@Controller('internal')
export class AuditRunnerController {
  constructor(
    private readonly auditRunner: AuditRunnerService,
    @Inject(Receiver) private readonly receiver: Receiver | null,
  ) {}

  @Post('audits/:id/run')
  async runAudit(
    @Param('id') id: string,
    @Headers('upstash-signature')
    signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!this.receiver) {
      throw new ServiceUnavailableException(
        'Repository analysis is not configured',
      );
    }
    if (!signature || !req.rawBody) {
      throw new UnauthorizedException('Missing QStash signature');
    }

    const apiUrl =
      process.env.API_URL?.replace(/\/+$/, '') || 'http://localhost:4000';

    const url = `${apiUrl}/api/v1/internal/audits/${id}/run`;

    const valid = await this.receiver
      .verify({
        body: req.rawBody.toString('utf8'),
        signature,
        url,
      })
      .catch(() => false);

    if (!valid) {
      throw new UnauthorizedException('Invalid QStash signature');
    }

    return this.auditRunner.run(id);
  }
}
