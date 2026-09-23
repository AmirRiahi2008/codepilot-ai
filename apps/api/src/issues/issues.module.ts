import { Module } from '@nestjs/common';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { AiService } from '../ai.service';

@Module({ controllers: [IssuesController], providers: [IssuesService, AiService], exports: [IssuesService, AiService] })
export class IssuesModule {}
