import { Module } from '@nestjs/common';

import { QStashModule } from '../qstash/qstash.module';

import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';

@Module({
  imports: [QStashModule],
  controllers: [AuditsController],
  providers: [AuditsService],
})
export class AuditsModule {}