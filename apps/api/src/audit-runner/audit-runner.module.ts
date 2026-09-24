import { Module } from '@nestjs/common';

import { InternalModule } from '../internal/internal.module';

import { AuditRunnerController } from './audit-runner.controller';
import { AuditRunnerService } from './audit-runner.service';

@Module({
  imports: [InternalModule],
  controllers: [AuditRunnerController],
  providers: [AuditRunnerService],
  exports: [AuditRunnerService],
})
export class AuditRunnerModule {}