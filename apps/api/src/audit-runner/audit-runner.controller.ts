import {
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { Receiver } from '@upstash/qstash';

import { AuditRunnerService } from './audit-runner.service';

type RequestWithRawBody = Request & {
  rawBody?: string;
};

@Controller('internal')
export class AuditRunnerController {
  constructor(
    private readonly auditRunner: AuditRunnerService,
    private readonly receiver: Receiver,
  ) {}

  @Post('audits/:id/run')
  async runAudit(
    @Param('id') id: string,
    @Headers('upstash-signature')
    signature: string | undefined,
    @Req() req: RequestWithRawBody,
  ) {
    if (!signature || !req.rawBody) {
      throw new UnauthorizedException(
        'Missing QStash signature',
      );
    }

    const apiUrl =
      process.env.API_URL ??
      'http://localhost:4000';

    const url =
      `${apiUrl}/api/v1/internal/audits/${id}/run`;

    const valid =
      await this.receiver.verify({
        body: req.rawBody,
        signature,
        url,
      });

    if (!valid) {
      throw new UnauthorizedException(
        'Invalid QStash signature',
      );
    }

    return this.auditRunner.run(id);
  }
}