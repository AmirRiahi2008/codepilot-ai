import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';
import { ANALYSIS_QUEUE } from '../queues/analysis.queue';

@Module({
  imports: [BullModule.registerQueue({ name: ANALYSIS_QUEUE })],
  controllers: [AuditsController],
  providers: [AuditsService],
})
export class AuditsModule {}
