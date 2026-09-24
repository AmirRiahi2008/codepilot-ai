import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
} from '@nestjs/common';

import { InternalService } from './internal.service';

@Controller('internal')
export class InternalController {
  constructor(
    private readonly service: InternalService,
  ) {}

  @Post('audits/:id/start')
  start(
    @Param('id') id: string,
    @Headers('x-worker-secret')
    secret?: string,
  ) {
    return this.service.start(id, secret);
  }

  @Post('audits/:id/progress')
  progress(
    @Param('id') id: string,
    @Body()
    body: {
      status:
        | 'RUNNING'
        | 'DOWNLOADING'
        | 'SCANNING'
        | 'AI_ANALYSIS';
    },
    @Headers('x-worker-secret')
    secret?: string,
  ) {
    return this.service.progress(
      id,
      body.status,
      secret,
    );
  }

  @Post('audits/:id/context')
  context(
    @Param('id') id: string,
    @Headers('x-worker-secret')
    secret?: string,
  ) {
    return this.service.context(
      id,
      secret,
    );
  }

  @Post('audits/:id/complete')
  complete(
    @Param('id') id: string,
    @Body() payload: any,
    @Headers('x-worker-secret')
    secret?: string,
  ) {
    return this.service.complete(
      id,
      payload,
      secret,
    );
  }

  @Post('audits/:id/fail')
  fail(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Headers('x-worker-secret')
    secret?: string,
  ) {
    return this.service.fail(
      id,
      body.reason,
      secret,
    );
  }
}